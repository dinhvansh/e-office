import { Request, Response } from 'express';
import { documentTypesService } from './documentTypes.service';
const errorMessage = (error: unknown): string => error instanceof Error ? error.message : 'Unexpected error';

export const documentTypesController = {
  async getDocumentTypes(req: Request, res: Response) {
    try {
      const tenantId = req.auth!.tenantId;
      const filters = {
        category: req.query.category as string,
        is_active: req.query.is_active === 'true' ? true : req.query.is_active === 'false' ? false : undefined,
      };
      const purpose = req.query.purpose as string | undefined;

      const documentTypes = await documentTypesService.getDocumentTypes(
        tenantId,
        filters,
        req.auth!.userId,
        purpose
      );
      res.json({ success: true, data: documentTypes });
    } catch (error: unknown) {
      res.status(500).json({ success: false, error: errorMessage(error) });
    }
  },

  async getDocumentTypeById(req: Request, res: Response) {
    try {
      const tenantId = req.auth!.tenantId;
      const { id } = req.params;
      const documentType = await documentTypesService.getDocumentTypeById(parseInt(id), tenantId);
      res.json({ success: true, data: documentType });
    } catch (error: unknown) {
      res.status(404).json({ success: false, error: errorMessage(error) });
    }
  },

  async createDocumentType(req: Request, res: Response) {
    try {
      const tenantId = req.auth!.tenantId;
      const documentType = await documentTypesService.createDocumentType(tenantId, req.body);
      res.status(201).json({ success: true, data: documentType });
    } catch (error: unknown) {
      res.status(400).json({ success: false, error: errorMessage(error) });
    }
  },

  async updateDocumentType(req: Request, res: Response) {
    try {
      const tenantId = req.auth!.tenantId;
      const { id } = req.params;
      const documentType = await documentTypesService.updateDocumentType(parseInt(id), tenantId, req.body);
      res.json({ success: true, data: documentType });
    } catch (error: unknown) {
      res.status(400).json({ success: false, error: errorMessage(error) });
    }
  },

  async deleteDocumentType(req: Request, res: Response) {
    try {
      const tenantId = req.auth!.tenantId;
      const { id } = req.params;
      await documentTypesService.deleteDocumentType(parseInt(id), tenantId);
      res.json({ success: true, message: 'Document type deleted' });
    } catch (error: unknown) {
      res.status(400).json({ success: false, error: errorMessage(error) });
    }
  },

  async getStats(req: Request, res: Response) {
    try {
      const tenantId = req.auth!.tenantId;
      const stats = await documentTypesService.getStats(tenantId);
      res.json({ success: true, data: stats });
    } catch (error: unknown) {
      res.status(500).json({ success: false, error: errorMessage(error) });
    }
  },
};
