import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { Translator } from "@/i18n/translator";
import {
  formatMinuteDate,
  parseMinuteContent,
  type MinuteDocument,
} from "./minute-document";

function infoLine(label: string, value: string): Paragraph {
  return new Paragraph({
    spacing: { after: 60 },
    children: [new TextRun({ text: `${label}: `, bold: true }), new TextRun({ text: value })],
  });
}

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true })],
  });
}

function cell(text: string, header = false): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text: text || "—", bold: header })],
      }),
    ],
  });
}

/**
 * Render a meeting minute as a Word (.docx) document. Pure JS — safe to run in
 * a Vercel serverless function.
 */
export async function buildMinuteDocx(doc: MinuteDocument, t: Translator): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: doc.hospitalName, bold: true, size: 22 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 60 },
      children: [new TextRun({ text: t("meetings.minuteTitle").toUpperCase(), bold: true, size: 30 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new TextRun({ text: doc.title, italics: true })],
    }),
    infoLine(t("meetings.codeLabel"), doc.code),
    infoLine(t("meetings.dateLabel"), formatMinuteDate(doc.meetingDate, doc.locale)),
  ];

  if (doc.location) children.push(infoLine(t("meetings.locationLabel"), doc.location));
  if (doc.chairName) children.push(infoLine(t("meetings.chairLabel"), doc.chairName));
  if (doc.secretaryName) children.push(infoLine(t("meetings.secretaryLabel"), doc.secretaryName));

  const participants = doc.participants
    .map((participant) => (participant.role ? `${participant.name} (${participant.role})` : participant.name))
    .join(", ");
  children.push(infoLine(t("meetings.participantsLabel"), participants || "—"));

  if (doc.summary) {
    children.push(sectionHeading(t("meetings.summaryLabel")));
    children.push(new Paragraph({ text: doc.summary }));
  }

  children.push(sectionHeading(t("meetings.contentLabel")));
  for (const block of parseMinuteContent(doc.content)) {
    if (block.type === "heading") {
      children.push(
        new Paragraph({
          spacing: { before: 120, after: 60 },
          children: [new TextRun({ text: block.text, bold: true })],
        }),
      );
    } else if (block.type === "bullet") {
      children.push(new Paragraph({ text: block.text, bullet: { level: 0 } }));
    } else {
      children.push(new Paragraph({ text: block.text, spacing: { after: 80 } }));
    }
  }

  if (doc.decisions) {
    children.push(sectionHeading(t("meetings.decisionsLabel")));
    children.push(new Paragraph({ text: doc.decisions }));
  }

  if (doc.actionItems.length > 0) {
    children.push(sectionHeading(t("meetings.actionItemsLabel")));
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              cell(t("meetings.actionItemLabel"), true),
              cell(t("fields.department"), true),
              cell(t("meetings.assigneeLabel"), true),
              cell(t("tasks.dueDateLabel"), true),
            ],
          }),
          ...doc.actionItems.map(
            (item) =>
              new TableRow({
                children: [
                  cell(item.title),
                  cell(item.departmentName ?? "—"),
                  cell(item.assigneeName ?? "—"),
                  cell(item.dueDate ? formatMinuteDate(item.dueDate, doc.locale) : "—"),
                ],
              }),
          ),
        ],
      }),
    );
  }

  const footer: string[] = [];
  if (doc.authorName) footer.push(`${t("meetings.authorLabel")}: ${doc.authorName}`);
  if (doc.approvedByName) {
    const when = doc.approvedAt ? formatMinuteDate(doc.approvedAt, doc.locale) : "";
    footer.push(`${t("meetings.approvedByLabel")}: ${doc.approvedByName}${when ? ` (${when})` : ""}`);
  }
  if (footer.length > 0) {
    children.push(new Paragraph({ spacing: { before: 240 }, text: footer.join("  ·  ") }));
  }

  const document = new Document({ sections: [{ children }] });
  return Packer.toBuffer(document);
}
