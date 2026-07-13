import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import test from "node:test";
import { env } from "../src/config/env";
import { ApiError } from "../src/core/errors/api-error";
import { AuthService } from "../src/modules/auth/auth.service";

type AuthUser = {
  id: number;
  email: string;
  password_hash: string;
  status: string;
  tenant_id: number;
  role: string | null;
  tenant: { id: number; name: string; plan: string; status: string };
  user_roles: [];
};

const makeUser = async (userStatus: string, tenantStatus: string): Promise<AuthUser> => ({
  id: 41,
  email: "inactive@example.test",
  password_hash: await bcrypt.hash("correct-password", 4),
  status: userStatus,
  tenant_id: 9,
  role: "User",
  tenant: { id: 9, name: "Test tenant", plan: "free", status: tenantStatus },
  user_roles: [],
});

const makeService = (
  user: AuthUser,
  revokedSessions: Array<{ id: string; userId: number; tenantId: number }> = [],
): AuthService => new AuthService({
  findByEmail: async () => user,
  findById: async () => user,
}, {
  revokeIfActive: async (session) => {
    revokedSessions.push(session);
  },
});

const expectAuthError = async (operation: Promise<unknown>, code: string) => {
  await assert.rejects(operation, (error: unknown) => error instanceof ApiError && error.statusCode === 403 && error.code === code);
};

test("login rejects every inactive account status before issuing tokens", async () => {
  for (const status of ["pending", "rejected", "disabled", "inactive"]) {
    await expectAuthError(makeService(await makeUser(status, "active")).login({
      email: "inactive@example.test",
      password: "correct-password",
    }), "ACCOUNT_NOT_ACTIVE");
  }
});

test("login rejects an active user when its tenant is inactive", async () => {
  await expectAuthError(makeService(await makeUser("active", "inactive")).login({
    email: "inactive@example.test",
    password: "correct-password",
  }), "TENANT_NOT_ACTIVE");
});

test("refresh rejects a disabled user before accessing refresh-session persistence", async () => {
  const refreshToken = jwt.sign({ sub: "41", tenantId: 9, jti: "session-1" }, env.REFRESH_TOKEN_SECRET, { expiresIn: "5m" });
  const revokedSessions: Array<{ id: string; userId: number; tenantId: number }> = [];
  await expectAuthError(makeService(await makeUser("disabled", "active"), revokedSessions).refresh(refreshToken), "ACCOUNT_NOT_ACTIVE");
  assert.deepEqual(revokedSessions, [{ id: "session-1", userId: 41, tenantId: 9 }]);
});

test("refresh rejects an inactive tenant before accessing refresh-session persistence", async () => {
  const refreshToken = jwt.sign({ sub: "41", tenantId: 9, jti: "session-2" }, env.REFRESH_TOKEN_SECRET, { expiresIn: "5m" });
  const revokedSessions: Array<{ id: string; userId: number; tenantId: number }> = [];
  await expectAuthError(makeService(await makeUser("active", "disabled"), revokedSessions).refresh(refreshToken), "TENANT_NOT_ACTIVE");
  assert.deepEqual(revokedSessions, [{ id: "session-2", userId: 41, tenantId: 9 }]);
});
