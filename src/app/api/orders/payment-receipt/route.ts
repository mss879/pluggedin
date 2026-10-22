import { NextResponse } from "next/server";
import { isAllowedOrigin } from "@/lib/rate-limit";
import { requireVerifiedAdmin } from "@/lib/admin-auth";
import { sendBankReceiptReceivedEmail, sendBankReceiptNotReceivedEmail } from "@/lib/email";

/**
 * Admin decision on a bank transfer order's payment slip.
 *  received: true  → payment_status = receipt_received, customer told we're proceeding
 *  received: false → payment_status = receipt_not_received, order cancelled, customer told
 */
export async function POST(request: Request) {
  try {
    if (!isAllowedOrigin(request)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const admin = await requireVerifiedAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized access: Administrator session required" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { orderId, received } = body;
    if (!orderId || typeof received !== "boolean") {
      return NextResponse.json({ error: "Missing required orderId or received flag" }, { status: 400 });
    }

    const db = admin.userClient;

    const { data: order, error: fetchError } = await db
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (fetchError || !order) {
      console.error("Failed to fetch order for receipt review:", fetchError);
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.payment_method !== "bank_transfer") {
      return NextResponse.json({ error: "This order is not a bank transfer order" }, { status: 400 });
    }

    if (order.payment_status || order.status === "cancelled") {
      return NextResponse.json({ error: "The payment receipt for this order has already been reviewed" }, { status: 409 });
    }

    const reviewedAt = new Date().toISOString();
    const update: Record<string, string> = {
      payment_status: received ? "receipt_received" : "receipt_not_received",
      payment_reviewed_at: reviewedAt,
      updated_at: reviewedAt,
    };
    if (!received) update.status = "cancelled";

    // Conditional on still being unreviewed so a double-click can't email twice
    const { data: updatedRows, error: updateError } = await db
      .from("orders")
      .update(update)
      .eq("id", orderId)
      .is("payment_status", null)
      .neq("status", "cancelled")
      .select("id");
    if (updateError) {
      console.error("Failed to save receipt review:", updateError);
      return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
    }
    if (!updatedRows || updatedRows.length === 0) {
      return NextResponse.json({ error: "The payment receipt for this order has already been reviewed" }, { status: 409 });
    }

    let emailSent = false;
    try {
      const emailPayload = {
        orderId: order.id,
        customerName: order.customer_name,
        customerEmail: order.customer_email,
        phoneNumber: order.phone_number,
        shippingAddress: order.shipping_address,
        items: order.items,
        totalAmount: order.total_amount,
        deliveryFee: Number(order.delivery_fee) || 0,
        deliveryZone: order.delivery_zone,
        paymentMethod: order.payment_method,
      };
      const result = received
        ? await sendBankReceiptReceivedEmail(emailPayload)
        : await sendBankReceiptNotReceivedEmail(emailPayload);
      emailSent = result.success;
    } catch (emailErr) {
      console.error("Receipt review saved but failed to send customer email:", emailErr);
    }

    return NextResponse.json({
      success: true,
      emailSent,
      order: {
        payment_status: update.payment_status,
        payment_reviewed_at: reviewedAt,
        status: received ? order.status : "cancelled",
      },
    });
  } catch (error) {
    console.error("Error in payment receipt API route:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
