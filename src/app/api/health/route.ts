import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { status: "ok", service: "omniconnect-ai", version: process.env.GIT_COMMIT_SHA ?? "unknown" },
    { status: 200 },
  );
}
