import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { rateLimit, getClientIp, isAllowedOrigin } from "@/lib/rate-limit";

const MAX_NAME = 100;
const MAX_EMAIL = 254;
const MAX_MESSAGE = 2000;

export async function POST(request: Request) {
  try {
    // Reject cross-site POSTs
    if (!isAllowedOrigin(request)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Rate limit: 3 submissions / minute / IP
    const ip = getClientIp(request);
    const limit = rateLimit(`contact:${ip}`, 3, 60_000);
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment before trying again." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { name, email, reason, message } = body;
    const cleanName = (name || "").trim().slice(0, MAX_NAME);
    const cleanEmail = (email || "").trim().slice(0, MAX_EMAIL);
    const cleanMessage = (message || "").trim().slice(0, MAX_MESSAGE);

    // Validate fields
    if (!cleanName || !cleanEmail || !reason || !cleanMessage) {
      return NextResponse.json(
        { error: "Missing required contact details" },
        { status: 400 }
      );
    }

    // Email pattern check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json(
        { error: "Please provide a valid email address" },
        { status: 400 }
      );
    }

    // Name check: minimum 2 letters, spaces/hyphens allowed, no numbers
    const nameRegex = /^[a-zA-Z\s\-]{2,}$/;
    if (!nameRegex.test(cleanName)) {
      return NextResponse.json(
        { error: "Name must be at least 2 characters long and contain only letters" },
        { status: 400 }
      );
    }

    // Message check: minimum 10 characters
    if (cleanMessage.length < 10) {
      return NextResponse.json(
        { error: "Message content must be at least 10 characters long" },
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
          name: cleanName,
          email: cleanEmail,
          reason,
          message: cleanMessage,
        })
        .select("id")
        .single();

      if (error) {
        console.error("Supabase insert inquiry error:", error);
        return NextResponse.json(
          { error: "We couldn't submit your inquiry right now. Please try again." },
          { status: 500 }
        );
      }

      inquiryId = data?.id || "";
    } else {
      inquiryId = `MOCK-INQ-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      console.log(`[Offline Mode] Simulated Contact Submission from ${cleanName} (${cleanEmail})`);
    }

    return NextResponse.json({ success: true, inquiryId });
  } catch (error) {
    console.error("Error in contact inquiry API route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
