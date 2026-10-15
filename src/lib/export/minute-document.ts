// Shared, pure representation of a minute as a document.
//
// The server page assembles a `MinuteDocument` from the database and hands it
// to the Word / PDF renderers (`docx.ts`, `pdf.ts`) and the email body builder.
// Keeping it framework-free means the same data renders identically in every
// export format.

export type MinuteDocumentParticipant = {
  name: string;
  role: string | null;
};

export type MinuteDocumentActionItem = {
  title: string;
  description: string | null;
  departmentName: string | null;
  assigneeName: string | null;
  dueDate: string | null;
  workOrderCode: string | null;
};

export type MinuteDocument = {
  hospitalName: string;
  code: string;
  title: string;
  meetingDate: string;
  location: string | null;
  chairName: string | null;
  secretaryName: string | null;
  status: string;
  participants: MinuteDocumentParticipant[];
  summary: string | null;
  content: string;
  decisions: string | null;
  actionItems: MinuteDocumentActionItem[];
  authorName: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  locale: string;
};

export type MinuteBlock =
  | { type: "heading"; text: string }
  | { type: "bullet"; text: string }
  | { type: "paragraph"; text: string };

/**
 * A deliberately tiny Markdown subset (headings with `#`, bullets with `-` or
 * `*`, everything else a paragraph). Enough for typed minutes without pulling
 * in a full Markdown renderer on the server.
 */
export function parseMinuteContent(content: string): MinuteBlock[] {
  const blocks: MinuteBlock[] = [];
  for (const rawLine of content.replace(/\r\n/g, "\n").split("\n")) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^#{1,6}\s+/.test(trimmed)) {
      blocks.push({ type: "heading", text: trimmed.replace(/^#{1,6}\s+/, "") });
      continue;
    }
    if (/^[-*]\s+/.test(trimmed)) {
      blocks.push({ type: "bullet", text: trimmed.replace(/^[-*]\s+/, "") });
      continue;
    }
    blocks.push({ type: "paragraph", text: trimmed });
  }
  return blocks;
}

export function formatMinuteDate(value: string, locale: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function minuteFileName(doc: MinuteDocument, extension: string): string {
  const safeTitle = doc.title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
  return `${doc.code}-${safeTitle || "bien-ban"}.${extension}`;
}
