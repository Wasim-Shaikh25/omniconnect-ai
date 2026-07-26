import { NextResponse } from "next/server";
import { billingService } from "@/modules/organizations";

export async function POST(request: Request) {
  try {
    if (!billingService) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 400 });
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
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
