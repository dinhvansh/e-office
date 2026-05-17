import { Request, Response } from "express";
import { z } from "zod";
import { externalOrgsService } from "./external-orgs.service";

const idSchema = z.coerce.number().int().positive();
const externalOrgPayloadSchema = z.object({
  name: z.string().trim().min(1).max(255),
  code: z.string().trim().max(50).nullable().optional(),
  category: z.string().trim().max(50).nullable().optional(),
  address: z.string().trim().max(500).nullable().optional(),
  phone: z.string().trim().max(50).nullable().optional(),
  email: z.string().trim().email().nullable().optional(),
  contact_person: z.string().trim().max(255).nullable().optional(),
  is_active: z.boolean().optional(),
});

const updateExternalOrgPayloadSchema = externalOrgPayloadSchema.partial();
type CreateExternalOrgInput = {
  name: string;
  code?: string | null;
  category?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  contact_person?: string | null;
  is_active?: boolean;
};

export class ExternalOrgsController {
  async getAll(req: Request, res: Response) {
    const tenantId = req.auth!.tenantId;
    
    // Check if pagination is requested
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const category = req.query.category as string | undefined;
    
    // If page or limit is provided, use pagination
    if (req.query.page || req.query.limit) {
      const result = await externalOrgsService.getAllPaginated(tenantId, {
        page,
        limit,
        category,
      });
      return res.json({
        success: true,
        data: {
          orgs: result.orgs,
          pagination: result.pagination,
        },
      });
    }
    
    // Otherwise, return all (for backward compatibility)
    const orgs = await externalOrgsService.getAll(tenantId);
    res.json({ success: true, data: orgs });
  }

  async getById(req: Request, res: Response) {
    const tenantId = req.auth!.tenantId;
    const id = idSchema.parse(req.params.id);
    const org = await externalOrgsService.getById(id, tenantId);
    res.json({ success: true, data: org });
  }

  async create(req: Request, res: Response) {
    const tenantId = req.auth!.tenantId;
    const payload = externalOrgPayloadSchema.parse(req.body) as CreateExternalOrgInput;
    const org = await externalOrgsService.create(tenantId, payload);
    res.status(201).json({ success: true, data: org });
  }

  async update(req: Request, res: Response) {
    const tenantId = req.auth!.tenantId;
    const id = idSchema.parse(req.params.id);
    const payload = updateExternalOrgPayloadSchema.parse(req.body);
    const org = await externalOrgsService.update(id, tenantId, payload);
    res.json({ success: true, data: org });
  }

  async delete(req: Request, res: Response) {
    const tenantId = req.auth!.tenantId;
    const id = idSchema.parse(req.params.id);
    await externalOrgsService.delete(id, tenantId);
    res.json({ success: true, data: null });
  }

  async getStats(req: Request, res: Response) {
    const tenantId = req.auth!.tenantId;
    const stats = await externalOrgsService.getStatsByCategory(tenantId);
    res.json({ success: true, data: stats });
  }
}

export const externalOrgsController = new ExternalOrgsController();
