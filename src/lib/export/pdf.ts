import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import type { Translator } from "@/i18n/translator";
import {
  formatMinuteDate,
  parseMinuteContent,
  type MinuteDocument,
} from "./minute-document";

const FONT_DIR = path.join(process.cwd(), "src", "lib", "export", "fonts");
const FONT_REGULAR = path.join(FONT_DIR, "Roboto-Regular.woff");
const FONT_BOLD = path.join(FONT_DIR, "Roboto-Bold.woff");

let fontsChecked = false;

function assertFontsAvailable() {
  if (fontsChecked) return;
  if (!fs.existsSync(FONT_REGULAR) || !fs.existsSync(FONT_BOLD)) {
    throw new Error("Minute PDF fonts are missing from the deployment bundle");
  }
  fontsChecked = true;
}

/**
 * Render a meeting minute as a PDF. Vietnamese diacritics require an embedded
 * Unicode font, so Roboto (Apache-2.0) ships with the app instead of relying on
 * the built-in PDF fonts.
 */
export function buildMinutePdf(doc: MinuteDocument, t: Translator): Promise<Buffer> {
  assertFontsAvailable();

  return new Promise<Buffer>((resolve, reject) => {
    try {
      const pdf = new PDFDocument({
        size: "A4",
        margins: { top: 50, bottom: 50, left: 56, right: 56 },
        info: { Title: `${doc.code} — ${doc.title}` },
      });

      const chunks: Buffer[] = [];
      pdf.on("data", (chunk: Buffer) => chunks.push(chunk));
      pdf.on("end", () => resolve(Buffer.concat(chunks)));
      pdf.on("error", reject);

      pdf.registerFont("regular", FONT_REGULAR);
      pdf.registerFont("bold", FONT_BOLD);

      const heading = (text: string) => {
        pdf.moveDown(0.6);
        pdf.font("bold").fontSize(12).fillColor("#111111").text(text, { paragraphGap: 4 });
        pdf.font("regular").fontSize(11).fillColor("#111111");
      };

      pdf.font("bold").fontSize(11).text(doc.hospitalName, { align: "center" });
      pdf.moveDown(0.3);
      pdf
        .font("bold")
        .fontSize(16)
        .text(t("meetings.minuteTitle").toUpperCase(), { align: "center" });
      pdf.moveDown(0.2);
      pdf.font("regular").fontSize(10).fillColor("#444444").text(doc.title, { align: "center" });
      pdf.fillColor("#111111");
      pdf.moveDown(0.8);

      const info = (label: string, value: string) => {
        pdf
          .font("bold")
          .fontSize(11)
          .text(`${label}: `, { continued: true })
          .font("regular")
          .text(value || "—");
      };

      info(t("meetings.codeLabel"), doc.code);
      info(t("meetings.dateLabel"), formatMinuteDate(doc.meetingDate, doc.locale));
      if (doc.location) info(t("meetings.locationLabel"), doc.location);
      if (doc.chairName) info(t("meetings.chairLabel"), doc.chairName);
      if (doc.secretaryName) info(t("meetings.secretaryLabel"), doc.secretaryName);
      info(
        t("meetings.participantsLabel"),
        doc.participants
          .map((participant) =>
            participant.role ? `${participant.name} (${participant.role})` : participant.name,
          )
          .join(", "),
      );

      if (doc.summary) {
        heading(t("meetings.summaryLabel"));
        pdf.font("regular").fontSize(11).text(doc.summary, { align: "justify" });
      }

      heading(t("meetings.contentLabel"));
      for (const block of parseMinuteContent(doc.content)) {
        if (block.type === "heading") {
          pdf.moveDown(0.3);
          pdf.font("bold").fontSize(11).text(block.text);
          pdf.font("regular").fontSize(11);
        } else if (block.type === "bullet") {
          pdf.text(`•  ${block.text}`, { indent: 10 });
        } else {
          pdf.text(block.text, { align: "justify", paragraphGap: 4 });
        }
      }

      if (doc.decisions) {
        heading(t("meetings.decisionsLabel"));
        pdf.font("regular").fontSize(11).text(doc.decisions, { align: "justify" });
      }

      if (doc.actionItems.length > 0) {
        heading(t("meetings.actionItemsLabel"));
        doc.actionItems.forEach((item, index) => {
          pdf
            .font("bold")
            .fontSize(11)
            .text(`${index + 1}. ${item.title}`, { continued: false });
          pdf.font("regular").fontSize(10).fillColor("#444444");
          const details: string[] = [];
          if (item.departmentName) details.push(`${t("fields.department")}: ${item.departmentName}`);
          if (item.assigneeName) details.push(`${t("meetings.assigneeLabel")}: ${item.assigneeName}`);
          if (item.dueDate) {
            details.push(`${t("tasks.dueDateLabel")}: ${formatMinuteDate(item.dueDate, doc.locale)}`);
          }
          if (item.workOrderCode) {
            details.push(`${t("meetings.workOrderLabel")}: ${item.workOrderCode}`);
          }
          if (details.length > 0) pdf.text(details.join("  ·  "), { indent: 14 });
          pdf.fillColor("#111111");
          pdf.moveDown(0.3);
        });
      }

      const footer: string[] = [];
      if (doc.authorName) footer.push(`${t("meetings.authorLabel")}: ${doc.authorName}`);
      if (doc.approvedByName) {
        const when = doc.approvedAt ? formatMinuteDate(doc.approvedAt, doc.locale) : "";
        footer.push(`${t("meetings.approvedByLabel")}: ${doc.approvedByName}${when ? ` (${when})` : ""}`);
      }
      if (footer.length > 0) {
        pdf.moveDown(0.8);
        pdf.font("regular").fontSize(9).fillColor("#666666").text(footer.join("  ·  "));
      }

      pdf.end();
    } catch (error) {
      reject(error);
    }
  });
}
