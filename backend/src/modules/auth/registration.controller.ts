import { Request, Response } from 'express';
import { registrationService } from './registration.service';
import { ZodError, z } from 'zod';

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().min(1, 'Full name is required'),
  terms_accepted: z.boolean().refine(val => val === true, 'You must accept terms and conditions'),
  company_name: z.string().optional(),
  create_tenant: z.boolean().optional()
});

export class RegistrationController {
  // POST /auth/register - Public registration
  async register(req: Request, res: Response) {
    try {
      const { email, password, full_name, company_name, create_tenant } = registerSchema.parse(req.body);

      const result = await registrationService.registerUser({
        email,
        password,
        full_name,
        company_name,
        create_tenant
      });

      res.status(201).json(result);
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }

      const message = error instanceof Error ? error.message : '';

      if (message.includes('Email already registered')) {
        return res.status(409).json({ error: message });
      }

      if (message.includes('re-register 24 hours')) {
        return res.status(429).json({ error: message });
      }

      if (message.includes('Password must')) {
        return res.status(400).json({ error: message });
      }

      console.error('Registration error:', error);
      res.status(500).json({ error: 'Failed to register user' });
    }
  }

  // GET /users/pending - Get pending users (admin only)
  async getPendingUsers(req: Request, res: Response) {
    try {
      const user = req.user;
      const tenantId = user?.tenant_id || 1;
      
      // Check if user is super admin (can see all tenants)
      const isSuperAdmin = user?.role === 'super_admin';

      const users = await registrationService.getPendingUsers(isSuperAdmin ? null : tenantId);

      res.json({ users });
    } catch (error: unknown) {
      console.error('Get pending users error:', error);
      res.status(500).json({ error: 'Failed to get pending users' });
    }
  }

  // POST /users/:id/approve - Approve user (admin only)
  async approveUser(req: Request, res: Response) {
    try {
      const userId = parseInt(req.params.id);
      if (!userId || isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }

      const result = await registrationService.approveUser(userId);

      res.json(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('not found')) {
        return res.status(404).json({ error: message });
      }

      if (message.includes('not in pending status')) {
        return res.status(400).json({ error: message });
      }

      console.error('Approve user error:', error);
      res.status(500).json({ error: 'Failed to approve user' });
    }
  }

  // POST /users/:id/reject - Reject user (admin only)
  async rejectUser(req: Request, res: Response) {
    try {
      const userId = parseInt(req.params.id);
      const { reason } = req.body;

      if (!userId || isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }

      if (!reason || reason.trim() === '') {
        return res.status(400).json({ error: 'Rejection reason is required' });
      }

      const result = await registrationService.rejectUser(userId, reason);

      res.json(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('not found')) {
        return res.status(404).json({ error: message });
      }

      if (message.includes('not in pending status')) {
        return res.status(400).json({ error: message });
      }

      console.error('Reject user error:', error);
      res.status(500).json({ error: 'Failed to reject user' });
    }
  }
}

export const registrationController = new RegistrationController();
