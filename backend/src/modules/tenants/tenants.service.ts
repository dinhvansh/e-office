import { ApiError } from "../../core/errors/api-error";
import { tenantsRepository } from "./tenants.repository";
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { ADMIN_PERMISSION_KEYS, PERMISSION_CATALOG } from "../roles/permission-catalog";

const prisma = new PrismaClient();

class TenantsService {
  private async ensurePermissionCatalog(tx: any) {
    for (const permission of PERMISSION_CATALOG) {
      await tx.permissions.upsert({
        where: {
          resource_action: {
            resource: permission.resource,
            action: permission.action,
          },
        },
        update: {
          description: permission.description,
        },
        create: permission,
      });
    }
  }

  async getTenantProfile(tenantId: number) {
    const tenant = await tenantsRepository.findById(tenantId);
    if (!tenant) {
      throw ApiError.notFound("Tenant not found", "TENANT_NOT_FOUND");
    }
    return tenant;
  }

  async getTenantStats(tenantId: number) {
    return tenantsRepository.getStats(tenantId);
  }

  /**
   * Create new tenant with admin user
   * This is for SaaS onboarding - creates a complete tenant setup
   */
  async createTenantWithAdmin(data: {
    // Tenant info
    tenant_name: string;
    tenant_domain?: string;
    
    // Admin user info
    admin_email: string;
    admin_password: string;
    admin_full_name: string;
  }) {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.admin_email)) {
      throw ApiError.badRequest('Invalid email format', 'INVALID_EMAIL');
    }

    // Check if email already exists
    const existingUser = await prisma.users.findUnique({
      where: { email: data.admin_email }
    });

    if (existingUser) {
      throw ApiError.badRequest('Email already registered', 'EMAIL_EXISTS');
    }

    // Validate password strength
    if (data.admin_password.length < 8) {
      throw ApiError.badRequest('Password must be at least 8 characters', 'WEAK_PASSWORD');
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(data.admin_password)) {
      throw ApiError.badRequest(
        'Password must contain uppercase, lowercase, and number',
        'WEAK_PASSWORD'
      );
    }

    // Use transaction to ensure atomicity
    return await prisma.$transaction(async (tx) => {
      await this.ensurePermissionCatalog(tx);

      // 1. Create tenant
      const tenant = await tx.tenants.create({
        data: {
          name: data.tenant_name,
          domain: data.tenant_domain || null,
          status: 'active'
        }
      });

      // 2. Hash password
      const passwordHash = await bcrypt.hash(data.admin_password, 10);

      // 3. Create admin user
      const adminUser = await tx.users.create({
        data: {
          email: data.admin_email,
          password_hash: passwordHash,
          full_name: data.admin_full_name,
          tenant_id: tenant.id,
          status: 'active', // Admin is active immediately
          role: 'admin'
        }
      });

      // 4. Create default roles for tenant
      const adminRole = await tx.roles.create({
        data: {
          tenant_id: tenant.id,
          name: 'Admin',
          description: 'Full system access'
        }
      });

      const managerRole = await tx.roles.create({
        data: {
          tenant_id: tenant.id,
          name: 'Manager',
          description: 'Department manager'
        }
      });

      const userRole = await tx.roles.create({
        data: {
          tenant_id: tenant.id,
          name: 'User',
          description: 'Regular user'
        }
      });

      // 5. Assign admin role to admin user
      await tx.user_roles.create({
        data: {
          user_id: adminUser.id,
          role_id: adminRole.id
        }
      });

      // 6. Create default permissions for Admin role
      for (const permission of ADMIN_PERMISSION_KEYS) {
        const [resource, action] = permission.split('.');
        const perm = await tx.permissions.findUnique({
          where: { resource_action: { resource, action } }
        });
        if (perm) {
          await tx.role_permissions.create({
            data: {
              role_id: adminRole.id,
              permission_id: perm.id
            }
          });
        }
      }

      // 7. Create default department
      const defaultDept = await tx.departments.create({
        data: {
          tenant_id: tenant.id,
          name: 'General',
          code: 'GEN',
          description: 'Default department'
        }
      });

      // 8. Assign admin to default department
      await tx.users.update({
        where: { id: adminUser.id },
        data: { department_id: defaultDept.id }
      });

      // 9. Create default document types
      const documentTypes = [
        { code: 'CV', name: 'Công văn', prefix: 'CV' },
        { code: 'QD', name: 'Quyết định', prefix: 'QD' },
        { code: 'TB', name: 'Thông báo', prefix: 'TB' },
        { code: 'BC', name: 'Báo cáo', prefix: 'BC' },
        { code: 'HD', name: 'Hợp đồng', prefix: 'HD' },
        { code: 'TT', name: 'Thông tư', prefix: 'TT' },
        { code: 'GN', name: 'Giấy nghỉ', prefix: 'GN' },
        { code: 'KH', name: 'Kế hoạch', prefix: 'KH' }
      ];

      for (const docType of documentTypes) {
        await tx.document_types.create({
          data: {
            tenant_id: tenant.id,
            code: docType.code,
            name: docType.name,
            description: null
          }
        });
      }

      return {
        tenant: {
          id: tenant.id,
          name: tenant.name,
          domain: tenant.domain,
          status: tenant.status
        },
        admin: {
          id: adminUser.id,
          email: adminUser.email,
          full_name: adminUser.full_name
        },
        message: 'Tenant and admin created successfully'
      };
    });
  }
}

export const tenantsService = new TenantsService();
