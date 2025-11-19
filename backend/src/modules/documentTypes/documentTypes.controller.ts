import { Request, Response } from 'express';
import { documentTypesService } from './documentTypes.service';

export const documentTypesController = {
  async getDocumentTypes(req: Request, res: Response) {
    try {
      const tenantId = (req as any).auth.tenantId;
      const filters = {
        category: req.query.category as string,
        is_active: req.query.is_active === 'true' ? true : req.query.is_active === 'false' ? false : undefined,
      };

      const documentTypes = await documentTypesService.getDocumentTypes(tenantId, filters);
      res.json({ success: true, data: documentTypes });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getDocumentTypeById(req: Request, res: Response) {
    try {
      const tenantId = (req as any).auth.tenantId;
      const { id } = req.params;
      const documentType = await documentTypesService.getDocumentTypeById(parseInt(id), tenantId);
      res.json({ success: true, data: documentType });
    } catch (error: any) {
      res.status(404).json({ success: false, error: error.message });
    }
  },

  async createDocumentType(req: Request, res: Response) {
    try {
      const tenantId = (req as any).auth.tenantId;
      const documentType = await documentTypesService.createDocumentType(tenantId, req.body);
      res.status(201).json({ success: true, data: documentType });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  },

  async updateDocumentType(req: Request, res: Response) {
    try {
      const tenantId = (req as any).auth.tenantId;
      const { id } = req.params;
      const documentType = await documentTypesService.updateDocumentType(parseInt(id), tenantId, req.body);
      res.json({ success: true, data: documentType });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  },

  async deleteDocumentType(req: Request, res: Response) {
    try {
      const tenantId = (req as any).auth.tenantId;
      const { id } = req.params;
      await documentTypesService.deleteDocumentType(parseInt(id), tenantId);
      res.json({ success: true, message: 'Document type deleted' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  },

  async getStats(req: Request, res: Response) {
    try {
      const tenantId = (req as any).auth.tenantId;
      const stats = await documentTypesService.getStats(tenantId);
      res.json({ success: true, data: stats });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
};
