import { ApiError } from "../../core/errors/api-error";
import { externalOrgsRepository } from "./external-orgs.repository";

export class ExternalOrgsService {
  async getAll(tenantId: number) {
    return externalOrgsRepository.findAll(tenantId);
  }

  async getById(id: number, tenantId: number) {
    const org = await externalOrgsRepository.findById(id, tenantId);
    if (!org) {
      throw ApiError.notFound("External organization not found", "ORG_NOT_FOUND");
    }
    return org;
  }

  async create(
    tenantId: number,
    data: {
      name: string;
      code?: string;
      category?: string;
      address?: string;
      phone?: string;
      email?: string;
      contact_person?: string;
    }
  ) {
    // Check if code already exists
    if (data.code) {
      const existing = await externalOrgsRepository.findByCode(data.code, tenantId);
      if (existing) {
        throw ApiError.badRequest("Organization code already exists", "CODE_EXISTS");
      }
    }

    return externalOrgsRepository.create({
      tenant_id: tenantId,
      ...data,
    });
  }

  async update(
    id: number,
    tenantId: number,
    data: {
      name?: string;
      code?: string;
      category?: string;
      address?: string;
      phone?: string;
      email?: string;
      contact_person?: string;
      is_active?: boolean;
    }
  ) {
    // Check if org exists
    await this.getById(id, tenantId);

    // Check if new code conflicts
    if (data.code) {
      const existing = await externalOrgsRepository.findByCode(data.code, tenantId);
      if (existing && existing.id !== id) {
        throw ApiError.badRequest("Organization code already exists", "CODE_EXISTS");
      }
    }

    return externalOrgsRepository.update(id, tenantId, data);
  }

  async delete(id: number, tenantId: number) {
    await this.getById(id, tenantId);
    return externalOrgsRepository.delete(id, tenantId);
  }

  async getStatsByCategory(tenantId: number) {
    return externalOrgsRepository.countByCategory(tenantId);
  }
}

export const externalOrgsService = new ExternalOrgsService();
