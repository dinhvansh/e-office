import { Request, Response } from "express";
import { ok } from "../../core/utils/response";
import { tenantsService } from "./tenants.service";
import { z } from "zod";

const updateTenantSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  domain: z.string().trim().min(1).max(255).nullable().optional(),
});

export class TenantsController {
  me = async (req: Request, res: Response): Promise<void> => {
    const tenant = await tenantsService.getTenantProfile(req.auth!.tenantId);
    res.json(
      ok({
        tenant: {
          id: tenant.id,
          name: tenant.name,
          domain: tenant.domain,
          plan: tenant.plan,
          status: tenant.status,
          created_at: tenant.created_at,
        },
      }),
    );
  };

  stats = async (req: Request, res: Response): Promise<void> => {
    const stats = await tenantsService.getTenantStats(req.auth!.tenantId);
    res.json(ok({ stats }));
  };

  updateMe = async (req: Request, res: Response): Promise<void> => {
    const payload = updateTenantSchema.parse(req.body);
    const tenant = await tenantsService.updateTenantProfile(req.auth!.tenantId, payload);
    res.json(ok({ tenant }));
  };

  /**
   * Create new tenant with admin user (Public endpoint for SaaS onboarding)
   * POST /api/v1/tenants/create-with-admin
   */
  createWithAdmin = async (req: Request, res: Response): Promise<void> => {
    const { tenant_name, tenant_domain, admin_email, admin_password, admin_full_name } = req.body;

    // Validate required fields
    if (!tenant_name || !admin_email || !admin_password || !admin_full_name) {
      res.status(400).json({
        error: 'Missing required fields',
        required: ['tenant_name', 'admin_email', 'admin_password', 'admin_full_name']
      });
      return;
    }

    const result = await tenantsService.createTenantWithAdmin({
      tenant_name,
      tenant_domain,
      admin_email,
      admin_password,
      admin_full_name
    });

    res.status(201).json(ok(result));
  };
}
