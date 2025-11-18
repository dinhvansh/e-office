import nodemailer, { Transporter } from "nodemailer";
import { env } from "./env";

let transporter: Transporter | null = null;

export function getEmailTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: parseInt(env.SMTP_PORT, 10),
      secure: env.SMTP_SECURE === "true",
      auth: env.SMTP_USER && env.SMTP_PASSWORD
        ? {
            user: env.SMTP_USER,
            pass: env.SMTP_PASSWORD,
          }
        : undefined,
    });
  }
  return transporter;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const transporter = getEmailTransporter();
  
  // In development, log email instead of sending
  if (env.NODE_ENV === "development" && !env.SMTP_USER) {
    console.log("📧 [EMAIL] Would send email:", {
      from: `${env.EMAIL_FROM_NAME} <${env.EMAIL_FROM}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    return;
  }

  await transporter.sendMail({
    from: `${env.EMAIL_FROM_NAME} <${env.EMAIL_FROM}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });
}
