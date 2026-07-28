import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ status: "ok", service: "omniconnect-ai" }, { status: 200 });
}
