import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAllowedOrigin } from "@/lib/rate-limit";
import { requireVerifiedAdmin } from "@/lib/admin-auth";
import {
  sendOrderShippedEmail,
  sendOrderDeliveredEmail
} from "@/lib/email";

const ALLOWED_STATUSES = ["pending", "fulfilled", "shipped", "delivered"];

export async function POST(request: Request) {
  try {
    if (!isAllowedOrigin(request)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { orderId, status } = body;

    if (!orderId || !status) {
      return NextResponse.json(
        { error: "Missing required orderId or status" },
        { status: 400 }
      );
    }

    if (!ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: "Invalid order status" },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    // Prioritize service role key to bypass RLS, fallback to public anon key
    // (which still requires a valid admin bearer token + RLS to authorize).
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      console.warn("[update-status] SUPABASE_SERVICE_ROLE_KEY not set; falling back to anon key + RLS.");
    }
    const supabaseKey = serviceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    const authHeader = request.headers.get("Authorization");

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Database credentials not configured" },
        { status: 500 }
      );
    }

    // Initialize server-side client with authorization headers if present
    const supabaseServer = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: authHeader ? { Authorization: authHeader } : {},
      },
      auth: {
        persistSession: false,
      }
    });

    // Validate Authorization token (admin email + completed email 2FA)
    const admin = await requireVerifiedAdmin(request);

    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized access: Administrator session required" },
        { status: 401 }
      );
    }

    // 1. Fetch current order details to get customer details and items
    const { data: order, error: fetchError } = await supabaseServer
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (fetchError || !order) {
      console.error("Failed to fetch order for status update:", fetchError);
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    if (order.status === "cancelled") {
      return NextResponse.json(
        { error: "This order has been cancelled and can no longer be updated" },
        { status: 400 }
      );
    }

    // 2. Update the order status in Supabase
    const { error: updateError } = await supabaseServer
      .from("orders")
      .update({ 
        status, 
        updated_at: new Date().toISOString() 
      })
      .eq("id", orderId);

    if (updateError) {
      console.error("Failed to update order status in DB:", updateError);
      return NextResponse.json(
        { error: "Failed to update order status" },
        { status: 500 }
      );
    }

    // 3. Trigger corresponding email status templates
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
        discountAmount: Number(order.discount_amount) || 0,
        discountCode: order.discount_code,
        paymentMethod: order.payment_method || "cash_on_delivery",
      };

      if (status === "shipped") {
        await sendOrderShippedEmail(emailPayload);
      } else if (status === "delivered") {
        await sendOrderDeliveredEmail(emailPayload);
      }
    } catch (emailErr) {
      console.error(`Order status updated to ${status} but failed to send notification email:`, emailErr);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in update status API route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
