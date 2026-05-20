import { settingsRepository } from './settings.repository';
import nodemailer from 'nodemailer';
import { getTenantWatermarkConfig, normalizeWatermarkConfig } from './watermark.helper';

function normalizeDocumentTypePolicy(policy: any) {
  const source = policy && typeof policy === 'object' ? policy : {};
  const allowedScopes = new Set(['public', 'department', 'private']);
  const allowedLevels = new Set(['normal', 'confidential', 'secret', 'top_secret']);

  const normalizeStringArray = (value: any) =>
    Array.from(
      new Set(
        Array.isArray(value)
          ? value.map((item) => String(item || '').trim()).filter(Boolean)
          : []
      )
    );

  const normalizeNumberArray = (value: any) =>
    Array.from(
      new Set(
        Array.isArray(value)
          ? value
              .map((item) => Number(item))
              .filter((item) => Number.isInteger(item) && item > 0)
          : []
      )
    );

  const visibility = String(source.default_visibility_scope || '').trim().toLowerCase();
  const confidential = String(source.default_confidential_level || '').trim().toLowerCase();
  const minPositionLevel = Number(source.min_position_level);

  return {
    allow_roles: normalizeStringArray(source.allow_roles),
    deny_roles: normalizeStringArray(source.deny_roles),
    allow_departments: normalizeNumberArray(source.allow_departments),
    deny_departments: normalizeNumberArray(source.deny_departments),
    min_position_level: Number.isFinite(minPositionLevel) && minPositionLevel > 0 ? minPositionLevel : null,
    default_visibility_scope: allowedScopes.has(visibility) ? visibility : 'department',
    default_confidential_level: allowedLevels.has(confidential) ? confidential : 'normal',
    inherit_creator_department:
      source.inherit_creator_department === undefined ? true : Boolean(source.inherit_creator_department),
    force_private_until_completed: Boolean(source.force_private_until_completed),
  };
}

function normalizeEmailConfig(config: any) {
  const port = Number(config?.smtp_port || 587);
  const smtpSecure =
    config?.smtp_secure === true
    || config?.smtp_secure === 'true'
    || config?.smtp_secure === 1
    || config?.smtp_secure === '1';

  return {
    ...config,
    smtp_port: Number.isFinite(port) && port > 0 ? port : 587,
    smtp_secure: smtpSecure,
  };
}

function buildSmtpAttempts(config: any) {
  const normalized = normalizeEmailConfig(config);
  const host = String(normalized.smtp_host || '').trim();
  const port = Number(normalized.smtp_port || 587);
  const user = String(normalized.smtp_user || '').trim();
  const pass = String(normalized.smtp_password || '');
  const fromEmail = String(normalized.smtp_from || user).trim();
  const fromName = String(normalized.smtp_from_name || 'E-Office').trim();

  const attempts: Array<{ secure: boolean; label: string }> = [];
  const pushAttempt = (secure: boolean, label: string) => {
    if (!attempts.some((attempt) => attempt.secure === secure)) {
      attempts.push({ secure, label });
    }
  };

  if (port === 465) {
    pushAttempt(true, 'SSL/TLS trực tiếp');
    pushAttempt(false, 'không SSL trực tiếp');
  } else if (port === 587) {
    pushAttempt(false, 'STARTTLS / không SSL trực tiếp');
    pushAttempt(true, 'SSL/TLS trực tiếp');
  } else {
    pushAttempt(Boolean(normalized.smtp_secure), normalized.smtp_secure ? 'SSL/TLS trực tiếp' : 'không SSL trực tiếp');
    pushAttempt(!Boolean(normalized.smtp_secure), !normalized.smtp_secure ? 'SSL/TLS trực tiếp' : 'không SSL trực tiếp');
  }

  return { host, port, user, pass, fromEmail, fromName, attempts, normalized };
}

export const settingsService = {
  async getEmailConfig(tenantId: number) {
    const setting = await settingsRepository.getSetting(tenantId, 'email_config');
    return setting?.setting_value || null;
  },

  async saveEmailConfig(tenantId: number, config: any, userId?: number) {
    return settingsRepository.upsertSetting(tenantId, 'email_config', normalizeEmailConfig(config), userId);
  },

  async sendTestEmail(tenantId: number, testEmail: string) {
    const config = await this.getEmailConfig(tenantId);
    if (!config) {
      throw new Error('Email config not found');
    }

    if (config.use_oauth) {
      throw new Error('OAuth SMTP test is not implemented yet. Please use SMTP/App Password for this setup.');
    }

    const { host, port, user, pass, fromEmail, fromName, attempts } = buildSmtpAttempts(config);

    if (!host || !port || !user || !pass || !fromEmail) {
      throw new Error('Missing SMTP host, port, username, password, or from email');
    }

    const errors: string[] = [];

    for (const attempt of attempts) {
      try {
        const transporter = nodemailer.createTransport({
          host,
          port,
          secure: attempt.secure,
          auth: { user, pass },
          tls: {
            minVersion: 'TLSv1.2',
          },
        });

        await transporter.verify();

        await transporter.sendMail({
          from: `${fromName} <${fromEmail}>`,
          to: testEmail,
          subject: 'E-Office SMTP test',
          text: 'SMTP configuration is working. This is a test email from E-Office.',
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
              <h2 style="margin: 0 0 12px;">E-Office SMTP test</h2>
              <p>SMTP configuration is working.</p>
              <p style="color: #6b7280; font-size: 13px;">This message was sent from the tenant email settings screen.</p>
            </div>
          `,
        });

        return;
      } catch (error: any) {
        errors.push(`${attempt.label}: ${error?.message || 'Unknown SMTP error'}`);
      }
    }

    const lastError = errors[errors.length - 1] || 'Unknown SMTP error';
    const tlsMismatch = errors.some((entry) => /wrong version number|ssl3_get_record|EPROTO/i.test(entry));
    if (tlsMismatch) {
      throw new Error(
        `Cấu hình SSL/TLS không khớp với cổng SMTP. Port 465 thường bật "SSL/TLS trực tiếp", còn port 587 thường tắt mục này và dùng STARTTLS. Chi tiết: ${lastError}`
      );
    }

    throw new Error(`Gửi email test thất bại. Chi tiết: ${lastError}`);
  },

  async getWatermarkConfig(tenantId: number) {
    return getTenantWatermarkConfig(tenantId);
  },

  async saveWatermarkConfig(tenantId: number, config: any, userId?: number) {
    return settingsRepository.upsertSetting(tenantId, 'watermark_config', normalizeWatermarkConfig(config), userId);
  },

  async getAllSettings(tenantId: number) {
    const settings = await settingsRepository.getAllSettings(tenantId);
    const result: Record<string, any> = {};
    settings.forEach(s => {
      result[s.setting_key] = s.setting_value;
    });
    return result;
  },

  async getDocumentTypePolicy(tenantId: number, documentTypeId: number) {
    const key = `doc_type_policy:${documentTypeId}`;
    const setting = await settingsRepository.getSetting(tenantId, key);
    return normalizeDocumentTypePolicy(setting?.setting_value || {});
  },

  async saveDocumentTypePolicy(tenantId: number, documentTypeId: number, policy: any, userId?: number) {
    const key = `doc_type_policy:${documentTypeId}`;
    return settingsRepository.upsertSetting(tenantId, key, normalizeDocumentTypePolicy(policy), userId);
  },

  async deleteDocumentTypePolicy(tenantId: number, documentTypeId: number) {
    const key = `doc_type_policy:${documentTypeId}`;
    return settingsRepository.deleteSetting(tenantId, key);
  }
};
