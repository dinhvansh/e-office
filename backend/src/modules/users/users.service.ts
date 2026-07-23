import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import sharp from 'sharp';
import { usersRepository } from './users.repository';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../core/errors/api-error';
import { readStoredFile } from '../../core/storage/fileStorage';
import { storageService } from '../../core/storage/storage.service';
import { assertValidUserPassword } from './user-password.policy';

type UserFilters = {
  page?: number;
  limit?: number;
  department_id?: number;
  role?: string;
  status?: string;
  search?: string;
};

const decodeProfileImage = (value: string, maxBytes: number): Buffer => {
  const base64 = value.replace(/^data:[^;]+;base64,/, '');
  let buffer: Buffer;
  try {
    buffer = Buffer.from(base64, 'base64');
  } catch {
    throw ApiError.badRequest('Invalid image data', 'PROFILE_IMAGE_INVALID');
  }
  if (!buffer.length || buffer.length > maxBytes) {
    throw ApiError.badRequest('Image exceeds the allowed size', 'PROFILE_IMAGE_TOO_LARGE');
  }
  return buffer;
};

const assertSupportedImage = async (buffer: Buffer) => {
  try {
    const metadata = await sharp(buffer, { failOn: 'error' }).metadata();
    if (!metadata.format || !['jpeg', 'png', 'webp'].includes(metadata.format)) {
      throw ApiError.badRequest('Only PNG, JPEG and WebP images are supported', 'PROFILE_IMAGE_TYPE_UNSUPPORTED');
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest('Invalid image data', 'PROFILE_IMAGE_INVALID');
  }
};

export const usersService = {
  async getProfile(userId: number, tenantId: number) {
    const user = await this.getUserById(userId, tenantId);
    const safeUser = { ...user };
    delete safeUser.signature_image_path;
    return {
      ...safeUser,
      avatar_url: user.avatar_url ? '/users/profile/avatar' : null,
      signature_image_url: user.signature_image_path ? '/users/profile/signature' : null,
    };
  },

  async updateProfile(userId: number, tenantId: number, data: { full_name?: string; phone?: string | null }) {
    const existing = await usersRepository.findById(userId, tenantId);
    if (!existing) throw ApiError.notFound('User not found', 'USER_NOT_FOUND');
    await usersRepository.update(userId, {
      ...(data.full_name !== undefined ? { full_name: data.full_name.trim() } : {}),
      ...(data.phone !== undefined ? { phone: data.phone?.trim() || null } : {}),
    });
    return this.getProfile(userId, tenantId);
  },

  async uploadAvatar(userId: number, tenantId: number, imageData: string) {
    const existing = await usersRepository.findById(userId, tenantId);
    if (!existing) throw ApiError.notFound('User not found', 'USER_NOT_FOUND');
    const source = decodeProfileImage(imageData, 2 * 1024 * 1024);
    await assertSupportedImage(source);
    const output = await sharp(source).rotate().resize(256, 256, { fit: 'cover', position: 'centre' }).webp({ quality: 86 }).toBuffer();
    const key = `storage/${tenantId}/profiles/${userId}/avatar-${randomUUID()}.webp`;
    await storageService.put({ key, body: output, contentType: 'image/webp' });
    try {
      await usersRepository.update(userId, { avatar_url: key });
    } catch (error) {
      await storageService.delete(key).catch(() => undefined);
      throw error;
    }
    if (existing.avatar_url && existing.avatar_url !== key) {
      await storageService.delete(existing.avatar_url).catch(() => undefined);
    }
    return this.getProfile(userId, tenantId);
  },

  async deleteAvatar(userId: number, tenantId: number) {
    const existing = await usersRepository.findById(userId, tenantId);
    if (!existing) throw ApiError.notFound('User not found', 'USER_NOT_FOUND');
    await usersRepository.update(userId, { avatar_url: null });
    if (existing.avatar_url) await storageService.delete(existing.avatar_url).catch(() => undefined);
    return this.getProfile(userId, tenantId);
  },

  async getAvatar(userId: number, tenantId: number) {
    const user = await usersRepository.findById(userId, tenantId);
    if (!user?.avatar_url) throw ApiError.notFound('Avatar not found', 'AVATAR_NOT_FOUND');
    return { bytes: await readStoredFile(storageService, user.avatar_url), contentType: 'image/webp' };
  },

  async uploadSignature(userId: number, tenantId: number, imageData: string, signatureType: 'drawn' | 'uploaded' | 'typed') {
    const existing = await usersRepository.findById(userId, tenantId);
    if (!existing) throw ApiError.notFound('User not found', 'USER_NOT_FOUND');
    const source = decodeProfileImage(imageData, 1024 * 1024);
    await assertSupportedImage(source);
    const output = await sharp(source).rotate().resize(600, 240, {
      fit: 'contain',
      withoutEnlargement: true,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    }).png().toBuffer();
    const key = `storage/${tenantId}/profiles/${userId}/signature-${randomUUID()}.png`;
    await storageService.put({ key, body: output, contentType: 'image/png' });
    try {
      await usersRepository.update(userId, {
        signature_image_path: key,
        signature_type: signatureType,
        signature_updated_at: new Date(),
      });
    } catch (error) {
      await storageService.delete(key).catch(() => undefined);
      throw error;
    }
    if (existing.signature_image_path && existing.signature_image_path !== key) {
      await storageService.delete(existing.signature_image_path).catch(() => undefined);
    }
    return this.getProfile(userId, tenantId);
  },

  async deleteSignature(userId: number, tenantId: number) {
    const existing = await usersRepository.findById(userId, tenantId);
    if (!existing) throw ApiError.notFound('User not found', 'USER_NOT_FOUND');
    await usersRepository.update(userId, {
      signature_image_path: null,
      signature_type: null,
      signature_updated_at: null,
    });
    if (existing.signature_image_path) await storageService.delete(existing.signature_image_path).catch(() => undefined);
    return this.getProfile(userId, tenantId);
  },

  async getSignature(userId: number, tenantId: number) {
    const user = await usersRepository.findById(userId, tenantId);
    if (!user?.signature_image_path) throw ApiError.notFound('Signature not found', 'SIGNATURE_NOT_FOUND');
    return { bytes: await readStoredFile(storageService, user.signature_image_path), contentType: 'image/png' };
  },

  validateOrganizationalFields(data: {
    department_id?: number;
    position_id?: number;
    manager_id?: number;
  }, requireAll = false) {
    if (requireAll && !data.department_id) {
      throw new Error('Department is required');
    }

    if (requireAll && !data.position_id) {
      throw new Error('Position is required');
    }
  },

  async getUsers(tenantId: number | null, filters?: UserFilters) {
    return usersRepository.findByTenant(tenantId, filters);
  },

  // ✅ NEW: Get only active users
  async getActiveUsers(tenantId: number) {
    return usersRepository.findByTenant(tenantId, { status: 'active' });
  },

  async getDirectoryUsers(tenantId: number, search?: string) {
    const users = await usersRepository.findByTenant(tenantId, { status: 'active', search });
    return users.map((user) => ({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      department: user.department ? { id: user.department.id, name: user.department.name } : null,
      position: user.position ? { id: user.position.id, name: user.position.name, code: user.position.code } : null,
    }));
  },

  async getUserById(id: number, tenantId: number) {
    const user = await usersRepository.findById(id, tenantId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Remove password hash from response
    const userWithoutPassword = { ...user };
    delete userWithoutPassword.password_hash;
    return userWithoutPassword;
  },

  async createUser(tenantId: number, data: {
    email: string;
    password: string;
    full_name?: string;
    phone?: string;
    department_id?: number;
    manager_id?: number;
    position_id?: number;
    role_ids?: number[];
  }) {
    this.validateOrganizationalFields(data, true);
    assertValidUserPassword(data.password);

    // Check if email already exists
    const existing = await usersRepository.findByEmail(data.email);
    if (existing) {
      throw new Error('Email already exists');
    }

    const { role_ids, password, ...userData } = data;
    const requestedRoleIds = [...new Set(role_ids ?? [])];
    let effectiveRoleIds = requestedRoleIds;

    if (requestedRoleIds.length > 0) {
      const tenantRoles = await prisma.roles.findMany({
        where: { tenant_id: tenantId, id: { in: requestedRoleIds } },
        select: { id: true },
      });
      if (tenantRoles.length !== requestedRoleIds.length) {
        throw new Error('One or more roles are invalid for this tenant');
      }
    } else {
      const defaultRole = await prisma.roles.findFirst({
        where: { tenant_id: tenantId, name: { equals: 'User', mode: 'insensitive' } },
        select: { id: true },
      });
      if (!defaultRole) {
        throw new Error('Default User role is not configured for this tenant');
      }
      effectiveRoleIds = [defaultRole.id];
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Create user
    const user = await usersRepository.create({
      ...userData,
      password_hash,
      tenant_id: tenantId,
      status: 'active',
      role: 'user',
    });

    // Assign roles
    await usersRepository.assignRoles(user.id, effectiveRoleIds);

    return usersRepository.findById(user.id, tenantId);
  },

  async updateUser(id: number, tenantId: number | null, data: {
    full_name?: string;
    phone?: string;
    department_id?: number;
    manager_id?: number;
    position_id?: number;
    status?: string;
    role_ids?: number[];
    password?: string;
  }) {
    this.validateOrganizationalFields(data);

    if (data.status !== undefined && !['active', 'inactive'].includes(data.status)) {
      throw new Error('User status must be active or inactive');
    }

    const existing = await usersRepository.findById(id, tenantId);
    if (!existing) {
      throw new Error('User not found');
    }

    if (data.manager_id && data.manager_id === id) {
      throw new Error('Manager cannot be the same user');
    }

    if (data.status === 'inactive' && existing.status !== 'inactive') {
      if (existing.managed_departments.length > 0) {
        throw new Error('Assign a replacement department manager before deactivating this user');
      }
      const [pendingApprovals, pendingSigners] = await Promise.all([
        prisma.document_approvals.count({ where: { approver_user_id: id, action: 'pending' } }),
        prisma.signers.count({ where: { user_id: id, status: { in: ['draft', 'pending', 'otp_sent', 'waiting_approval', 'waiting_signing'] } } }),
      ]);
      if (pendingApprovals > 0 || pendingSigners > 0) {
        throw new Error('Reassign pending approval and signing tasks before deactivating this user');
      }
      await prisma.$transaction([
        prisma.department_support_managers.deleteMany({ where: { user_id: id } }),
        prisma.users.updateMany({ where: { tenant_id: existing.tenant_id, manager_id: id }, data: { manager_id: null } }),
      ]);
    }

    const { role_ids, password, ...userData } = data;

    // Hash new password if provided
    if (password) {
      assertValidUserPassword(password);
      const updateData: Prisma.usersUncheckedUpdateInput = {
        ...userData,
        password_hash: await bcrypt.hash(password, 10),
      };
      await usersRepository.update(id, updateData);
    } else {
      await usersRepository.update(id, userData);
    }

    // Update roles if provided
    if (role_ids !== undefined) {
      await usersRepository.assignRoles(id, role_ids);
    }

    return usersRepository.findById(id, tenantId);
  },

  async deleteUser(id: number, tenantId: number | null) {
    const existing = await usersRepository.findById(id, tenantId);
    if (!existing) {
      throw new Error('User not found');
    }

    // Check if user is managing any departments
    if (existing.managed_departments.length > 0) {
      throw new Error('Cannot delete user who is managing departments');
    }

    const internalSignerCount = await prisma.signers.count({
      where: { user_id: id, is_internal: true },
    });
    if (internalSignerCount > 0) {
      throw new Error('Cannot delete user with signing assignments');
    }

    return usersRepository.delete(id);
  },

  async getUserStats(tenantId: number) {
    return usersRepository.getUserStats(tenantId);
  },

  async changePassword(userId: number, tenantId: number, oldPassword: string, newPassword: string) {
    assertValidUserPassword(newPassword);
    const user = await usersRepository.findById(userId, tenantId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify old password
    const isValid = await bcrypt.compare(oldPassword, user.password_hash);
    if (!isValid) {
      throw new Error('Invalid old password');
    }

    // Hash and update new password
    const password_hash = await bcrypt.hash(newPassword, 10);
    await usersRepository.update(userId, { password_hash });

    return { success: true };
  },
};
