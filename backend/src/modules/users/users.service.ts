import bcrypt from 'bcrypt';
import { usersRepository } from './users.repository';

export const usersService = {
  async getUsers(tenantId: number, filters?: any) {
    return usersRepository.findByTenant(tenantId, filters);
  },

  async getUserById(id: number, tenantId: number) {
    const user = await usersRepository.findById(id, tenantId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Remove password hash from response
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  },

  async createUser(tenantId: number, data: {
    email: string;
    password: string;
    full_name?: string;
    phone?: string;
    department_id?: number;
    role_ids?: number[];
  }) {
    // Check if email already exists
    const existing = await usersRepository.findByEmail(data.email);
    if (existing) {
      throw new Error('Email already exists');
    }

    const { role_ids, password, ...userData } = data;

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
    if (role_ids && role_ids.length > 0) {
      await usersRepository.assignRoles(user.id, role_ids);
    }

    return usersRepository.findById(user.id, tenantId);
  },

  async updateUser(id: number, tenantId: number, data: {
    full_name?: string;
    phone?: string;
    department_id?: number;
    status?: string;
    role_ids?: number[];
    password?: string;
  }) {
    const existing = await usersRepository.findById(id, tenantId);
    if (!existing) {
      throw new Error('User not found');
    }

    const { role_ids, password, ...userData } = data;

    // Hash new password if provided
    if (password) {
      (userData as any).password_hash = await bcrypt.hash(password, 10);
    }

    // Update user
    await usersRepository.update(id, userData);

    // Update roles if provided
    if (role_ids !== undefined) {
      await usersRepository.assignRoles(id, role_ids);
    }

    return usersRepository.findById(id, tenantId);
  },

  async deleteUser(id: number, tenantId: number) {
    const existing = await usersRepository.findById(id, tenantId);
    if (!existing) {
      throw new Error('User not found');
    }

    // Check if user is managing any departments
    if (existing.managed_departments.length > 0) {
      throw new Error('Cannot delete user who is managing departments');
    }

    return usersRepository.delete(id);
  },

  async getUserStats(tenantId: number) {
    return usersRepository.getUserStats(tenantId);
  },

  async changePassword(userId: number, tenantId: number, oldPassword: string, newPassword: string) {
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
