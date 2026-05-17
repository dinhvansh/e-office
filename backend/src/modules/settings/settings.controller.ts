import { Request, Response } from 'express';
import { settingsService } from './settings.service';

export const settingsController = {
  async getEmailConfig(req: Request, res: Response) {
    try {
      const tenantId = req.auth!.tenantId;
      const config = await settingsService.getEmailConfig(tenantId);
      res.json({ success: true, data: config });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async saveEmailConfig(req: Request, res: Response) {
    try {
      const tenantId = req.auth!.tenantId;
      const userId = req.auth!.userId;
      const config = req.body;

      await settingsService.saveEmailConfig(tenantId, config, userId);
      res.json({ success: true, message: 'Email config saved successfully' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async testEmail(req: Request, res: Response) {
    try {
      const { testEmail } = req.body;
      const tenantId = req.auth!.tenantId;

      if (!testEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(testEmail))) {
        return res.status(400).json({ success: false, error: 'Valid testEmail is required' });
      }

      await settingsService.sendTestEmail(tenantId, String(testEmail));

      res.json({
        success: true,
        message: `Test email sent to ${testEmail}`,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  },

  async getWatermarkConfig(req: Request, res: Response) {
    try {
      const tenantId = req.auth!.tenantId;
      const config = await settingsService.getWatermarkConfig(tenantId);
      res.json({ success: true, data: config });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async saveWatermarkConfig(req: Request, res: Response) {
    try {
      const tenantId = req.auth!.tenantId;
      const userId = req.auth!.userId;
      const config = req.body;

      await settingsService.saveWatermarkConfig(tenantId, config, userId);
      res.json({ success: true, message: 'Watermark config saved successfully' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getAllSettings(req: Request, res: Response) {
    try {
      const tenantId = req.auth!.tenantId;
      const settings = await settingsService.getAllSettings(tenantId);
      res.json({ success: true, data: settings });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getDocumentTypePolicy(req: Request, res: Response) {
    try {
      const tenantId = req.auth!.tenantId;
      const documentTypeId = Number(req.params.documentTypeId);
      const data = await settingsService.getDocumentTypePolicy(tenantId, documentTypeId);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async saveDocumentTypePolicy(req: Request, res: Response) {
    try {
      const tenantId = req.auth!.tenantId;
      const userId = req.auth!.userId;
      const documentTypeId = Number(req.params.documentTypeId);
      const policy = req.body;
      await settingsService.saveDocumentTypePolicy(tenantId, documentTypeId, policy, userId);
      res.json({ success: true, message: "Document type policy saved" });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async deleteDocumentTypePolicy(req: Request, res: Response) {
    try {
      const tenantId = req.auth!.tenantId;
      const documentTypeId = Number(req.params.documentTypeId);
      await settingsService.deleteDocumentTypePolicy(tenantId, documentTypeId);
      res.json({ success: true, message: "Document type policy deleted" });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};
