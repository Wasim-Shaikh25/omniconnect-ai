import { NextResponse } from "next/server";
import { auth } from "@/modules/auth";
import { dataExportService, userRepository } from "@/modules/users";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const exportRequest = await userRepository.getExportRequest(id, session.user.id);
  if (!exportRequest || exportRequest.status !== "COMPLETED") {
    return new NextResponse("Export not found", { status: 404 });
  }
  if (exportRequest.expiresAt && new Date() > new Date(exportRequest.expiresAt)) {
    return new NextResponse("Export expired", { status: 410 });
  }

  const data = await dataExportService.getExport(session.user.id);
  return NextResponse.json(data, {
    headers: {
      "Content-Disposition": `attachment; filename="export-${id}.json"`,
    },
  });
}
