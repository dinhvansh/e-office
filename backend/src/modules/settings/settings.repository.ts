import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const settingsRepository = {
  async getSetting(tenantId: number, key: string) {
    return prisma.tenant_settings.findFirst({
      where: {
        tenant_id: tenantId,
        setting_key: key
      }
    });
  },

  async upsertSetting(tenantId: number, key: string, value: any, updatedBy?: number) {
    const existing = await prisma.tenant_settings.findFirst({
      where: {
        tenant_id: tenantId,
        setting_key: key
      }
    });

    if (existing) {
      return prisma.tenant_settings.update({
        where: { id: existing.id },
        data: {
          setting_value: value,
          updated_by: updatedBy,
          updated_at: new Date()
        }
      });
    } else {
      return prisma.tenant_settings.create({
        data: {
          tenant_id: tenantId,
          setting_key: key,
          setting_value: value,
          updated_by: updatedBy
        }
      });
    }
  },

  async getAllSettings(tenantId: number) {
    return prisma.tenant_settings.findMany({
      where: { tenant_id: tenantId }
    });
  },

  async deleteSetting(tenantId: number, key: string) {
    const existing = await prisma.tenant_settings.findFirst({
      where: {
        tenant_id: tenantId,
        setting_key: key
      }
    });

    if (existing) {
      return prisma.tenant_settings.delete({
        where: { id: existing.id }
      });
    }
    return null;
  }
};
