import { Request, Response } from "express";
import { externalOrgsService } from "./external-orgs.service";

export class ExternalOrgsController {
  async getAll(req: Request, res: Response) {
    const tenantId = req.auth!.tenantId;
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
