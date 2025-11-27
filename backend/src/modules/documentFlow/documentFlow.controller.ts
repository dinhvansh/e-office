import { Request, Response } from 'express';
import { documentFlowService } from './documentFlow.service';
import { z } from 'zod';

// Response helper
const ok = (data: any) => ({ success: true, data });

const idSchema = z.coerce.number().int().positive();

export class DocumentFlowController {
  /**
   * GET /api/v1/documents/:id/flow
   * Get unified flow data for a document
   */
  getDocumentFlow = async (req: Request, res: Response): Promise<void> => {
    try {
      const documentId = idSchema.parse(req.params.id);
      const tenantId = req.auth!.tenantId;
      const userId = req.auth!.userId;

      const flowData = await documentFlowService.getDocumentFlow(
        documentId,
        tenantId,
        userId
      );

      res.json(ok(flowData));
    } catch (error: any) {
      console.error('Error getting document flow:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error',
      });
    }
  };
}

export const documentFlowController = new DocumentFlowController();
