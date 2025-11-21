import { Request, Response } from 'express';
import { positionsService } from './positions.service';

export const positionsController = {
  async getPositions(req: Request, res: Response) {
    try {
      const tenantId = (req as any).auth.tenantId;
      const filters = req.query;
      const positions = await positionsService.getPositions(tenantId, filters);
      res.json({ success: true, data: { positions } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  },

  async getPositionById(req: Request, res: Response) {
    try {
      const tenantId = (req as any).auth.tenantId;
      const { id } = req.params;
      const position = await positionsService.getPositionById(parseInt(id), tenantId);
      res.json({ success: true, data: { position } });
    } catch (error: any) {
      res.status(404).json({ success: false, error: { message: error.message } });
    }
  },

  async createPosition(req: Request, res: Response) {
    try {
      const tenantId = (req as any).auth.tenantId;
      const position = await positionsService.createPosition(tenantId, req.body);
      res.status(201).json({ success: true, data: { position } });
    } catch (error: any) {
      res.status(400).json({ success: false, error: { message: error.message } });
    }
  },

  async updatePosition(req: Request, res: Response) {
    try {
      const tenantId = (req as any).auth.tenantId;
      const { id } = req.params;
      const position = await positionsService.updatePosition(parseInt(id), tenantId, req.body);
      res.json({ success: true, data: { position } });
    } catch (error: any) {
      res.status(400).json({ success: false, error: { message: error.message } });
    }
  },

  async deletePosition(req: Request, res: Response) {
    try {
      const tenantId = (req as any).auth.tenantId;
      const { id } = req.params;
      await positionsService.deletePosition(parseInt(id), tenantId);
      res.json({ success: true, data: { deleted: true } });
    } catch (error: any) {
      res.status(400).json({ success: false, error: { message: error.message } });
    }
  },

  async getStats(req: Request, res: Response) {
    try {
      const tenantId = (req as any).auth.tenantId;
      const stats = await positionsService.getStats(tenantId);
      res.json({ success: true, data: stats });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  },
};
