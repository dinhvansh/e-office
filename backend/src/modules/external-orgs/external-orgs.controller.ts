import { Request, Response } from "express";
import { externalOrgsService } from "./external-orgs.service";

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
    const id = parseInt(req.params.id);
    const org = await externalOrgsService.getById(id, tenantId);
    res.json({ success: true, data: org });
  }

  async create(req: Request, res: Response) {
    const tenantId = req.auth!.tenantId;
    const org = await externalOrgsService.create(tenantId, req.body);
    res.status(201).json({ success: true, data: org });
  }

  async update(req: Request, res: Response) {
    const tenantId = req.auth!.tenantId;
    const id = parseInt(req.params.id);
    const org = await externalOrgsService.update(id, tenantId, req.body);
    res.json({ success: true, data: org });
  }

  async delete(req: Request, res: Response) {
    const tenantId = req.auth!.tenantId;
    const id = parseInt(req.params.id);
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
