import { settingsRepository } from './settings.repository';
import nodemailer from 'nodemailer';

export const settingsService = {
  async getEmailConfig(tenantId: number) {
    const setting = await settingsRepository.getSetting(tenantId, 'email_config');
    return setting?.setting_value || null;
  },

  async saveEmailConfig(tenantId: number, config: any, userId?: number) {
    return settingsRepository.upsertSetting(tenantId, 'email_config', config, userId);
  },

  async sendTestEmail(tenantId: number, testEmail: string) {
    const config = await this.getEmailConfig(tenantId);
    if (!config) {
      throw new Error('Email config not found');
    }

    if (config.use_oauth) {
      throw new Error('OAuth SMTP test is not implemented yet. Please use SMTP/App Password for this setup.');
    }

    const host = String(config.smtp_host || '').trim();
    const port = Number(config.smtp_port || 587);
    const user = String(config.smtp_user || '').trim();
    const pass = String(config.smtp_password || '');
    const fromEmail = String(config.smtp_from || user).trim();
    const fromName = String(config.smtp_from_name || 'E-Office').trim();

    if (!host || !port || !user || !pass || !fromEmail) {
      throw new Error('Missing SMTP host, port, username, password, or from email');
    }

    const secure = Boolean(config.smtp_secure) || port === 465;
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
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
  },

  async getWatermarkConfig(tenantId: number) {
    const setting = await settingsRepository.getSetting(tenantId, 'watermark_config');
    return setting?.setting_value || {
      enabled: false,
      text: '',
      position: 'center',
      opacity: 0.3,
      fontSize: 48,
      rotation: 45,
      color: '#000000'
    };
  },

  async saveWatermarkConfig(tenantId: number, config: any, userId?: number) {
    return settingsRepository.upsertSetting(tenantId, 'watermark_config', config, userId);
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
    return setting?.setting_value || null;
  },

  async saveDocumentTypePolicy(tenantId: number, documentTypeId: number, policy: any, userId?: number) {
    const key = `doc_type_policy:${documentTypeId}`;
    return settingsRepository.upsertSetting(tenantId, key, policy, userId);
  },

  async deleteDocumentTypePolicy(tenantId: number, documentTypeId: number) {
    const key = `doc_type_policy:${documentTypeId}`;
    return settingsRepository.deleteSetting(tenantId, key);
  }
};
