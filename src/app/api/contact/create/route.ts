import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { name, email, reason, message } = body;

    // Validate fields
    if (!name || !email || !reason || !message) {
      return NextResponse.json(
        { error: "Missing required contact details" },
        { status: 400 }
      );
    }

    const validReasons = ["general_inquiries", "product_inquiries", "shipping_inquiries"];
    if (!validReasons.includes(reason)) {
      return NextResponse.json(
        { error: "Invalid inquiry reason option chosen" },
        { status: 400 }
      );
    }

    let inquiryId = "";

    if (supabase) {
      const { data, error } = await supabase
        .from("contact_inquiries")
        .insert({
          name,
          email,
          reason,
          message,
        })
        .select("id")
        .single();

      if (error) {
        console.error("Supabase insert inquiry error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      inquiryId = data?.id || "";
    } else {
      inquiryId = `MOCK-INQ-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      console.log(`[Offline Mode] Simulated Contact Submission from ${name} (${email})`);
    }

    return NextResponse.json({ success: true, inquiryId });
  } catch (error: any) {
    console.error("Error in contact inquiry API route:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
