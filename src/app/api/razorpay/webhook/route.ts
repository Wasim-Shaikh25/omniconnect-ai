import crypto from "node:crypto";
import { NextResponse } from "next/server";
import {
  billingService,
  BillingConfigurationError,
  BillingSignatureError,
} from "@/modules/workspaces";

export async function POST(request: Request) {
  try {
    if (!billingService) {
      return NextResponse.json({ error: "Razorpay not configured" }, { status: 503 });
    }

    const signature = request.headers.get("x-razorpay-signature");
    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    const payload = await request.text();
    const razorpayEventId = request.headers.get("x-razorpay-event-id");
    const eventId = razorpayEventId ?? crypto.createHash("sha256").update(payload).digest("hex");

    await billingService.fulfillCheckout(payload, signature, eventId);
    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook failed";
    if (error instanceof BillingSignatureError) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (error instanceof BillingConfigurationError) {
      return NextResponse.json({ error: "Internal configuration error" }, { status: 500 });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
