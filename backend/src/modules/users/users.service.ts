import bcrypt from 'bcrypt';
import { usersRepository } from './users.repository';

export const usersService = {
  validateOrganizationalFields(data: {
    department_id?: number;
    position_id?: number;
    manager_id?: number;
  }) {
    if (!data.department_id) {
      throw new Error('Department is required');
    }

    if (!data.position_id) {
      throw new Error('Position is required');
    }
  },

  async getUsers(tenantId: number | null, filters?: any) {
    return usersRepository.findByTenant(tenantId, filters);
  },

  // ✅ NEW: Get only active users
  async getActiveUsers(tenantId: number) {
    return usersRepository.findByTenant(tenantId, { status: 'active' });
  },

  async getDirectoryUsers(tenantId: number, search?: string) {
    const users = await usersRepository.findByTenant(tenantId, { status: 'active', search });
    return users.map((user: any) => ({
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
    const { password_hash, ...userWithoutPassword } = user;
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
    this.validateOrganizationalFields(data);

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

    const existing = await usersRepository.findById(id, tenantId);
    if (!existing) {
      throw new Error('User not found');
    }

    if (data.manager_id && data.manager_id === id) {
      throw new Error('Manager cannot be the same user');
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

  async deleteUser(id: number, tenantId: number | null) {
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
