import nodemailer, { Transporter } from "nodemailer";
import { prisma } from "./prisma";
import { env } from "./env";

let transporter: Transporter | null = null;

function readConfigValue(config: unknown, key: string): unknown {
  if (!config || typeof config !== "object" || Array.isArray(config)) return undefined;
  return (config as Record<string, unknown>)[key];
}

function normalizeTenantEmailConfig(config: unknown) {
  const smtpPort = readConfigValue(config, "smtp_port");
  const smtpSecure = readConfigValue(config, "smtp_secure");
  const smtpHost = readConfigValue(config, "smtp_host");
  const smtpUser = readConfigValue(config, "smtp_user");
  const smtpPassword = readConfigValue(config, "smtp_password");
  const smtpFrom = readConfigValue(config, "smtp_from");
  const smtpFromName = readConfigValue(config, "smtp_from_name");
  const port = Number(smtpPort || 587);
  const secure =
    smtpSecure === true
    || smtpSecure === "true"
    || smtpSecure === 1
    || smtpSecure === "1";

  return {
    host: String(smtpHost || "").trim(),
    port: Number.isFinite(port) && port > 0 ? port : 587,
    secure,
    user: String(smtpUser || "").trim(),
    pass: String(smtpPassword || ""),
    fromEmail: String(smtpFrom || smtpUser || "").trim(),
    fromName: String(smtpFromName || "E-Office").trim(),
  };
}

function getDefaultEmailTransporter(): Transporter {
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

async function getTenantMailer(tenantId?: number) {
  if (!tenantId) {
    return {
      transporter: getDefaultEmailTransporter(),
      fromEmail: env.EMAIL_FROM,
      fromName: env.EMAIL_FROM_NAME,
    };
  }

  const tenantEmailSetting = await prisma.tenant_settings.findFirst({
    where: {
      tenant_id: tenantId,
      setting_key: "email_config",
    },
    select: {
      setting_value: true,
    },
  });

  const config = tenantEmailSetting?.setting_value;
  if (!config) {
    return {
      transporter: getDefaultEmailTransporter(),
      fromEmail: env.EMAIL_FROM,
      fromName: env.EMAIL_FROM_NAME,
    };
  }

  const normalized = normalizeTenantEmailConfig(config);
  if (!normalized.host || !normalized.user || !normalized.pass || !normalized.fromEmail) {
    return {
      transporter: getDefaultEmailTransporter(),
      fromEmail: env.EMAIL_FROM,
      fromName: env.EMAIL_FROM_NAME,
    };
  }

  return {
    transporter: nodemailer.createTransport({
      host: normalized.host,
      port: normalized.port,
      secure: normalized.secure,
      auth: {
        user: normalized.user,
        pass: normalized.pass,
      },
      tls: {
        minVersion: "TLSv1.2",
      },
    }),
    fromEmail: normalized.fromEmail,
    fromName: normalized.fromName,
  };
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  tenantId?: number;
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const { transporter, fromEmail, fromName } = await getTenantMailer(options.tenantId);
  
  // In development, log email instead of sending
  if (env.NODE_ENV === "development" && !env.SMTP_USER) {
    console.log("📧 [EMAIL] Would send email:", {
      from: `${fromName} <${fromEmail}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    return;
  }

  await transporter.sendMail({
    from: `${fromName} <${fromEmail}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });
}
