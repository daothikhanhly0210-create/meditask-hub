import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getTranslator } from "@/i18n";
import { meetingScope } from "@/lib/meetings";
import { loadMeetingDocument } from "@/server/meeting-document";
import { buildMinuteDocx } from "@/lib/export/docx";
import { buildMinutePdf } from "@/lib/export/pdf";
import { minuteFileName } from "@/lib/export/minute-document";

/**
 * Download a meeting minute as Word (.docx) or PDF.
 *
 * Route handlers under /api are excluded from the auth proxy matcher, so this
 * handler authenticates and authorizes the request itself.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const visible = await prisma.meeting.findFirst({
    where: { AND: [{ id }, meetingScope(user)] },
    select: { id: true },
  });
  if (!visible) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const format = new URL(request.url).searchParams.get("format") === "pdf" ? "pdf" : "docx";
  const { t, locale } = await getTranslator();
  const document = await loadMeetingDocument(id, locale === "vi" ? "vi-VN" : "en-US");
  if (!document) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const buffer =
      format === "pdf" ? await buildMinutePdf(document, t) : await buildMinuteDocx(document, t);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          format === "pdf"
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Length": String(buffer.byteLength),
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(
          minuteFileName(document, format),
        )}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("[meetings] export failed", error);
    return NextResponse.json({ error: "export_failed" }, { status: 500 });
  }
}
