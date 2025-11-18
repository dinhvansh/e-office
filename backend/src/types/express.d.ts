import type { tenants, users } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      context?: {
        requestId: string;
        startedAt: number;
      };
      auth?: {
        userId: number;
        tenantId: number;
        role?: string | null;
      };
      tenant?: tenants;
      user?: users;
    }
  }
}

export {};
