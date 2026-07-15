import { Request, Response } from 'express';
import { settingsService } from './settings.service';
import { z } from 'zod';
const errorMessage = (error: unknown): string => error instanceof Error ? error.message : 'Unexpected error';

const documentTypeIdSchema = z.coerce.number().int().positive();
const aclTemplateSchema = z.object({
  id: z.string().min(1).optional(),
  subject_type: z.enum([
    'creator',
    'creator_department',
    'creator_manager',
    'specific_department',
    'specific_role',
    'specific_user',
    'workflow_participant',
    'cc_user',
    'legacy_position_in_department',
  ]),
  subject_id: z.coerce.number().int().positive().nullable().optional(),
  scope_department_id: z.coerce.number().int().positive().nullable().optional(),
  scope: z.enum(['OWN', 'DEPARTMENT', 'COMPANY', 'ASSIGNED_ONLY', 'ALL']).optional(),
  permissions: z.array(z.enum(['CREATE', 'VIEW', 'DOWNLOAD', 'EDIT', 'COMMENT', 'APPROVE', 'SIGN', 'SHARE', 'DELETE'])).min(1),
  status_limit: z.array(z.enum(['DRAFT', 'REJECTED', 'SUBMITTED', 'APPROVED', 'SIGNED'])).optional().nullable(),
  is_active: z.boolean().optional(),
});

const advancedPolicySchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1),
  priority: z.coerce.number().int(),
  effect: z.enum(['ALLOW', 'DENY']),
  condition_json: z.record(z.any()),
  permission_json: z.record(z.any()),
  is_active: z.boolean(),
});

const documentTypePolicySchema = z.object({
  version: z.coerce.number().int().optional(),
  visibility: z.object({
    default_visibility_scope: z.enum([
      'private',
      'creator_only',
      'department',
      'department_and_manager',
      'workflow_only',
      'company',
      'custom_acl',
    ]),
    default_security_level: z.enum(['normal', 'internal', 'confidential', 'secret']),
    auto_assign_creator_department: z.boolean(),
    force_private_on_create: z.boolean(),
  }).optional(),
  acl_templates: z.array(aclTemplateSchema).optional(),
  advanced_policies: z.array(advancedPolicySchema).optional(),
  detail_permissions: z.array(z.any()).optional(),
  allow_roles: z.array(z.string()).optional(),
  deny_roles: z.array(z.string()).optional(),
  allow_departments: z.array(z.coerce.number().int().positive()).optional(),
  deny_departments: z.array(z.coerce.number().int().positive()).optional(),
  min_position_level: z.coerce.number().int().positive().nullable().optional(),
  default_visibility_scope: z.string().optional(),
  default_confidential_level: z.string().optional(),
  inherit_creator_department: z.boolean().optional(),
  force_private_until_completed: z.boolean().optional(),
});

export const settingsController = {
  async getEmailConfig(req: Request, res: Response) {
    try {
      const tenantId = req.auth!.tenantId;
      const config = await settingsService.getEmailConfig(tenantId);
      res.json({ success: true, data: config });
    } catch (error: unknown) {
      res.status(500).json({ success: false, error: errorMessage(error) });
    }
  },

  async saveEmailConfig(req: Request, res: Response) {
    try {
      const tenantId = req.auth!.tenantId;
      const userId = req.auth!.userId;
      const config = req.body;

      await settingsService.saveEmailConfig(tenantId, config, userId);
      res.json({ success: true, message: 'Email config saved successfully' });
    } catch (error: unknown) {
      res.status(500).json({ success: false, error: errorMessage(error) });
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
    } catch (error: unknown) {
      res.status(400).json({ success: false, error: errorMessage(error) });
    }
  },

  async getWatermarkConfig(req: Request, res: Response) {
    try {
      const tenantId = req.auth!.tenantId;
      const config = await settingsService.getWatermarkConfig(tenantId);
      res.json({ success: true, data: config });
    } catch (error: unknown) {
      res.status(500).json({ success: false, error: errorMessage(error) });
    }
  },

  async saveWatermarkConfig(req: Request, res: Response) {
    try {
      const tenantId = req.auth!.tenantId;
      const userId = req.auth!.userId;
      const config = req.body;

      await settingsService.saveWatermarkConfig(tenantId, config, userId);
      res.json({ success: true, message: 'Watermark config saved successfully' });
    } catch (error: unknown) {
      res.status(500).json({ success: false, error: errorMessage(error) });
    }
  },

  async getAllSettings(req: Request, res: Response) {
    try {
      const tenantId = req.auth!.tenantId;
      const settings = await settingsService.getAllSettings(tenantId);
      res.json({ success: true, data: settings });
    } catch (error: unknown) {
      res.status(500).json({ success: false, error: errorMessage(error) });
    }
  },

  async getDocumentTypePolicy(req: Request, res: Response) {
    try {
      const tenantId = req.auth!.tenantId;
      const documentTypeId = documentTypeIdSchema.parse(req.params.documentTypeId);
      const data = await settingsService.getDocumentTypePolicy(tenantId, documentTypeId);
      res.json({ success: true, data });
    } catch (error: unknown) {
      res.status(400).json({ success: false, error: errorMessage(error) });
    }
  },

  async saveDocumentTypePolicy(req: Request, res: Response) {
    try {
      const tenantId = req.auth!.tenantId;
      const userId = req.auth!.userId;
      const documentTypeId = documentTypeIdSchema.parse(req.params.documentTypeId);
      const policy = documentTypePolicySchema.parse(req.body);
      await settingsService.saveDocumentTypePolicy(tenantId, documentTypeId, policy, userId);
      res.json({ success: true, message: "Document type policy saved" });
    } catch (error: unknown) {
      res.status(400).json({ success: false, error: errorMessage(error) });
    }
  },

  async deleteDocumentTypePolicy(req: Request, res: Response) {
    try {
      const tenantId = req.auth!.tenantId;
      const documentTypeId = documentTypeIdSchema.parse(req.params.documentTypeId);
      await settingsService.deleteDocumentTypePolicy(tenantId, documentTypeId);
      res.json({ success: true, message: "Document type policy deleted" });
    } catch (error: unknown) {
      res.status(400).json({ success: false, error: errorMessage(error) });
    }
  }
};
