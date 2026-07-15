import { Request, Response } from 'express';
import { z } from 'zod';
import { positionsService } from './positions.service';

const idSchema = z.coerce.number().int().positive();
const createPositionSchema = z.object({
  code: z.string().trim().min(1).max(50),
  name: z.string().trim().min(1).max(255),
  description: z.string().trim().max(500).nullable().optional(),
  level: z.coerce.number().int().min(0).nullable().optional(),
  is_active: z.boolean().optional(),
});

const updatePositionSchema = createPositionSchema.partial();
type CreatePositionInput = {
  code: string;
  name: string;
  description?: string | null;
  level?: number | null;
  is_active?: boolean;
};

const errorMessage = (error: unknown): string => error instanceof Error ? error.message : "Unexpected error";

export const positionsController = {
  async getPositions(req: Request, res: Response) {
    try {
      const tenantId = req.auth!.tenantId;
      const page = parseInt(req.query.page as string) || undefined;
      const limit = parseInt(req.query.limit as string) || undefined;
      const is_active = req.query.is_active as string | undefined;
      
      // If pagination requested
      if (page && limit) {
        const result = await positionsService.getPositionsPaginated(tenantId, {
          page,
          limit,
          is_active: is_active === 'true' ? true : is_active === 'false' ? false : undefined,
        });
        return res.json({
          success: true,
          data: {
            positions: result.positions,
            pagination: result.pagination,
          },
        });
      }
      
      // Otherwise return all
      const filters = { is_active: is_active === 'true' ? true : is_active === 'false' ? false : undefined };
      const positions = await positionsService.getPositions(tenantId, filters);
      res.json({ success: true, data: { positions } });
    } catch (error: unknown) {
      res.status(500).json({ success: false, error: { message: errorMessage(error) } });
    }
  },

  async getPositionById(req: Request, res: Response) {
    try {
      const tenantId = req.auth!.tenantId;
      const id = idSchema.parse(req.params.id);
      const position = await positionsService.getPositionById(id, tenantId);
      res.json({ success: true, data: { position } });
    } catch (error: unknown) {
      res.status(404).json({ success: false, error: { message: errorMessage(error) } });
    }
  },

  async createPosition(req: Request, res: Response) {
    try {
      const tenantId = req.auth!.tenantId;
      const payload = createPositionSchema.parse(req.body) as CreatePositionInput;
      const position = await positionsService.createPosition(tenantId, payload);
      res.status(201).json({ success: true, data: { position } });
    } catch (error: unknown) {
      res.status(400).json({ success: false, error: { message: errorMessage(error) } });
    }
  },

  async updatePosition(req: Request, res: Response) {
    try {
      const tenantId = req.auth!.tenantId;
      const id = idSchema.parse(req.params.id);
      const payload = updatePositionSchema.parse(req.body);
      const position = await positionsService.updatePosition(id, tenantId, payload);
      res.json({ success: true, data: { position } });
    } catch (error: unknown) {
      res.status(400).json({ success: false, error: { message: errorMessage(error) } });
    }
  },

  async deletePosition(req: Request, res: Response) {
    try {
      const tenantId = req.auth!.tenantId;
      const id = idSchema.parse(req.params.id);
      await positionsService.deletePosition(id, tenantId);
      res.json({ success: true, data: { deleted: true } });
    } catch (error: unknown) {
      res.status(400).json({ success: false, error: { message: errorMessage(error) } });
    }
  },

  async getStats(req: Request, res: Response) {
    try {
      const tenantId = req.auth!.tenantId;
      const stats = await positionsService.getStats(tenantId);
      res.json({ success: true, data: stats });
    } catch (error: unknown) {
      res.status(500).json({ success: false, error: { message: errorMessage(error) } });
    }
  },
};
