import { settingsRepository } from './settings.repository';

export const settingsService = {
  async getEmailConfig(tenantId: number) {
    const setting = await settingsRepository.getSetting(tenantId, 'email_config');
    return setting?.setting_value || null;
  },

  async saveEmailConfig(tenantId: number, config: any, userId?: number) {
    return settingsRepository.upsertSetting(tenantId, 'email_config', config, userId);
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
  }
};
