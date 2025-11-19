import { Request, Response } from 'express';
import { numberingService } from './numbering.service';

export const numberingController = {
  async getAllNumberingRules(req: Request, res: Response) {
    try {
      const tenantId = (req as any).auth.tenantId;
      const rules = await numberingService.getAllNumberingRules(tenantId);
      res.json({ success: true, data: rules });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getNumberingRule(req: Request, res: Response) {
    try {
      const tenantId = (req as any).auth.tenantId;
      const { documentTypeId } = req.params;
      const rule = await numberingService.getNumberingRule(tenantId, parseInt(documentTypeId));
      res.json({ success: true, data: rule });
    } catch (error: any) {
      res.status(404).json({ success: false, error: error.message });
    }
  },

  async createNumberingRule(req: Request, res: Response) {
    try {
      const tenantId = (req as any).auth.tenantId;
      const rule = await numberingService.createNumberingRule(tenantId, req.body);
      res.status(201).json({ success: true, data: rule });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  },

  async updateNumberingRule(req: Request, res: Response) {
    try {
      const tenantId = (req as any).auth.tenantId;
      const { id } = req.params;
      const rule = await numberingService.updateNumberingRule(parseInt(id), tenantId, req.body);
      res.json({ success: true, data: rule });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  },

  async generateNumber(req: Request, res: Response) {
    try {
      const tenantId = (req as any).auth.tenantId;
      const { document_type_id, department_code } = req.body;

      if (!document_type_id) {
        return res.status(400).json({
          success: false,
          error: 'document_type_id is required',
        });
      }

      const documentNumber = await numberingService.generateDocumentNumber(
        tenantId,
        document_type_id,
        { departmentCode: department_code }
      );

      res.json({ success: true, data: { document_number: documentNumber } });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  },

  async previewNumber(req: Request, res: Response) {
    try {
      const { pattern, last_number, department_code, document_type_code } = req.body;

      if (!pattern) {
        return res.status(400).json({
          success: false,
          error: 'pattern is required',
        });
      }

      const preview = await numberingService.previewDocumentNumber(
        pattern,
        last_number || 0,
        {
          departmentCode: department_code,
          documentTypeCode: document_type_code,
        }
      );

      res.json({ success: true, data: { preview } });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  },
};
