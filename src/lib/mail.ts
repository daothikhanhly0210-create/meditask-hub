import nodemailer, { type Transporter } from "nodemailer";

/**
 * SMTP transport is optional. When SMTP_HOST is not configured the mailer
 * falls back to logging the message so local development needs no mail server.
 */
let cachedTransporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.SMTP_HOST;
  if (!host) return null;

  cachedTransporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 1025),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });

  return cachedTransporter;
}

export type MailAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
};

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: MailAttachment[];
};

export async function sendMail(message: MailMessage): Promise<boolean> {
  const from = process.env.SMTP_FROM ?? "Hệ thống Giao việc Y tế <no-reply@company.local>";
  const transporter = getTransporter();

  if (!transporter) {
    console.info("[mail] SMTP not configured, message suppressed:", {
      to: message.to,
      subject: message.subject,
    });
    return false;
  }

  try {
    await transporter.sendMail({ from, ...message });
    return true;
  } catch (error) {
    console.error("[mail] failed to send", error);
    return false;
  }
}
