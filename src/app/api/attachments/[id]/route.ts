import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { workOrderScope } from "@/lib/tasks";

/**
 * Stream an attachment stored in the database (bytea).
 *
 * Route handlers under /api are excluded from the auth proxy matcher, so this
 * handler authenticates and authorizes the request itself.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const attachment = await prisma.attachment.findUnique({
    where: { id },
    select: {
      fileName: true,
      mimeType: true,
      data: true,
      workOrderId: true,
      subTask: { select: { target: { select: { workOrderId: true } } } },
    },
  });

  if (!attachment) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const workOrderId =
    attachment.workOrderId ?? attachment.subTask?.target.workOrderId ?? null;
  const visible = workOrderId
    ? await prisma.workOrder.findFirst({
        where: { AND: [{ id: workOrderId }, workOrderScope(user)] },
        select: { id: true },
      })
    : null;

  if (!visible) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const buffer = Buffer.from(attachment.data);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": attachment.mimeType || "application/octet-stream",
      "Content-Length": String(buffer.byteLength),
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(attachment.fileName)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
