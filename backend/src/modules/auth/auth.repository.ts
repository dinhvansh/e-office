import { users } from "@prisma/client";
import { prisma } from "../../config/prisma";

export class AuthRepository {
  findByEmail(email: string) {
    return prisma.users.findUnique({
      where: { email },
      include: { 
        tenant: true,
        user_roles: {
          include: {
            role: true
          }
        }
      },
    });
  }

  findById(id: number) {
    return prisma.users.findFirst({
      where: { id },
      include: { 
        tenant: true,
        user_roles: {
          include: {
            role: true
          }
        }
      },
    });
  }

  async updatePasswordHash(userId: number, passwordHash: string): Promise<users> {
    return prisma.users.update({
      where: { id: userId },
      data: { password_hash: passwordHash },
    });
  }
}

export const authRepository = new AuthRepository();
