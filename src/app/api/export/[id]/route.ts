import { NextResponse } from "next/server";
import { getCurrentUser } from "@/modules/auth";
import { dataExportService, userRepository } from "@/modules/users";
import { rateLimit, clientIp } from "@/shared/security/rate-limit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // getCurrentUser re-reads the canonical row and compares tokenVersion, so a revoked
  // session cannot download personal data. auth() alone trusts the raw JWT.
  const user = await getCurrentUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const limited = await rateLimit({
    key: `export:${user.id}:${clientIp(request.headers)}`,
    limit: 10,
    windowMs: 60_000,
  });
  if (!limited.allowed) {
    return new NextResponse("Too many requests", { status: 429 });
  }

  const { id } = await params;
  const exportRequest = await userRepository.getExportRequest(id, user.id);
  if (!exportRequest || exportRequest.status !== "COMPLETED") {
    return new NextResponse("Export not found", { status: 404 });
  }
  if (exportRequest.expiresAt && new Date() > new Date(exportRequest.expiresAt)) {
    return new NextResponse("Export expired", { status: 410 });
  }

  const data = await dataExportService.getExport(user.id);
  return NextResponse.json(data, {
    headers: {
      "Content-Disposition": `attachment; filename="export-${id}.json"`,
      "Cache-Control": "no-store, private",
    },
  });
}
