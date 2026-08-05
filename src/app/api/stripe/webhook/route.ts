import { NextResponse } from "next/server";
import {
  billingService,
  BillingConfigurationError,
  BillingSignatureError,
} from "@/modules/workspaces";

export async function POST(request: Request) {
  try {
    if (!billingService) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
    }

    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    const payload = await request.text();
    await billingService.fulfillCheckout(payload, signature);
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
