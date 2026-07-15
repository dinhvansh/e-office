import { Request, Response } from 'express';
import { numberingService } from './numbering.service';

const errorMessage = (error: unknown): string => error instanceof Error ? error.message : 'Unexpected error';

export const numberingController = {
  async getAllNumberingRules(req: Request, res: Response) {
    try {
      const tenantId = req.auth!.tenantId;
      const rules = await numberingService.getAllNumberingRules(tenantId);
      res.json({ success: true, data: rules });
    } catch (error: unknown) {
      res.status(500).json({ success: false, error: errorMessage(error) });
    }
  },

  async getNumberingRule(req: Request, res: Response) {
    try {
      const tenantId = req.auth!.tenantId;
      const { documentTypeId } = req.params;
      const rule = await numberingService.getNumberingRule(tenantId, parseInt(documentTypeId));
      res.json({ success: true, data: rule });
    } catch (error: unknown) {
      res.status(404).json({ success: false, error: errorMessage(error) });
    }
  },

  async createNumberingRule(req: Request, res: Response) {
    try {
      const tenantId = req.auth!.tenantId;
      const rule = await numberingService.createNumberingRule(tenantId, req.body);
      res.status(201).json({ success: true, data: rule });
    } catch (error: unknown) {
      res.status(400).json({ success: false, error: errorMessage(error) });
    }
  },

  async updateNumberingRule(req: Request, res: Response) {
    try {
      const tenantId = req.auth!.tenantId;
      const { id } = req.params;
      const rule = await numberingService.updateNumberingRule(parseInt(id), tenantId, req.body);
      res.json({ success: true, data: rule });
    } catch (error: unknown) {
      res.status(400).json({ success: false, error: errorMessage(error) });
    }
  },

  async generateNumber(req: Request, res: Response) {
    try {
      const tenantId = req.auth!.tenantId;
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
    } catch (error: unknown) {
      res.status(400).json({ success: false, error: errorMessage(error) });
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
    } catch (error: unknown) {
      res.status(400).json({ success: false, error: errorMessage(error) });
    }
  },
};
