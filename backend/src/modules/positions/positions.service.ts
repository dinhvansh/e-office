import { positionsRepository } from './positions.repository';

export const positionsService = {
  async getPositions(tenantId: number, filters?: any) {
    return positionsRepository.findByTenant(tenantId, filters);
  },

  async getPositionById(id: number, tenantId: number) {
    const position = await positionsRepository.findById(id, tenantId);
    if (!position) {
      throw new Error('Position not found');
    }
    return position;
  },

  async createPosition(tenantId: number, data: {
    code: string;
    name: string;
    description?: string;
    level?: number;
  }) {
    // Check if code already exists
    const existing = await positionsRepository.findByCode(data.code, tenantId);
    if (existing) {
      throw new Error('Position code already exists');
    }

    return positionsRepository.create({
      ...data,
      tenant_id: tenantId,
      is_active: true,
    });
  },

  async updatePosition(id: number, tenantId: number, data: {
    name?: string;
    description?: string;
    level?: number;
    is_active?: boolean;
  }) {
    const existing = await positionsRepository.findById(id, tenantId);
    if (!existing) {
      throw new Error('Position not found');
    }

    return positionsRepository.update(id, data);
  },

  async deletePosition(id: number, tenantId: number) {
    const existing = await positionsRepository.findById(id, tenantId);
    if (!existing) {
      throw new Error('Position not found');
    }

    // Check if position is in use
    if (existing._count.users > 0) {
      throw new Error('Cannot delete position that is in use by users');
    }

    return positionsRepository.delete(id);
  },

  async getStats(tenantId: number) {
    return positionsRepository.getStats(tenantId);
  },
};
