import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import jwt from "jsonwebtoken";
import test, { afterEach } from "node:test";
import { env } from "../src/config/env";
import { ApiError } from "../src/core/errors/api-error";
import { prisma } from "../src/config/prisma";
import { AuthService } from "../src/modules/auth/auth.service";

const originalCreate = prisma.refresh_sessions.create;
const originalFindUnique = prisma.refresh_sessions.findUnique;
const originalUpdateMany = prisma.refresh_sessions.updateMany;

const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
const makeToken = (id: string, expiresIn: string | number = "5m") =>
  jwt.sign({ sub: "41", tenantId: 9, jti: id }, env.REFRESH_TOKEN_SECRET, {
    expiresIn: expiresIn as jwt.SignOptions["expiresIn"],
  });

const activeUser = {
  id: 41,
  email: "active@example.test",
  password_hash: "unused",
  status: "active",
  tenant_id: 9,
  role: "User",
  tenant: { name: "Test tenant", plan: "free", status: "active" },
  user_roles: [],
};

afterEach(() => {
  (prisma.refresh_sessions as unknown as { create: unknown }).create = originalCreate;
  (prisma.refresh_sessions as unknown as { findUnique: unknown }).findUnique = originalFindUnique;
  (prisma.refresh_sessions as unknown as { updateMany: unknown }).updateMany = originalUpdateMany;
});

test("refresh persists a replacement session and rejects reuse of the rotated token", async () => {
  const oldToken = makeToken("old-session");
  const sessions = new Map<string, { id: string; family_id: string; user_id: number; tenant_id: number; token_hash: string; expires_at: Date; revoked_at: Date | null; replaced_by_id: string | null }>([
    ["old-session", { id: "old-session", family_id: "family-1", user_id: 41, tenant_id: 9, token_hash: tokenHash(oldToken), expires_at: new Date(Date.now() + 60_000), revoked_at: null, replaced_by_id: null }],
  ]);
  (prisma.refresh_sessions as unknown as { findUnique: unknown }).findUnique = async ({ where }: { where: { id: string } }) => sessions.get(where.id) ?? null;
  (prisma.refresh_sessions as unknown as { create: unknown }).create = async ({ data }: { data: { id: string; family_id: string; user_id: number; tenant_id: number; token_hash: string; expires_at: Date } }) => {
    sessions.set(data.id, { ...data, revoked_at: null, replaced_by_id: null });
  };
  (prisma.refresh_sessions as unknown as { updateMany: unknown }).updateMany = async ({ where, data }: { where: { id?: string; family_id?: string; revoked_at?: null }; data: { revoked_at: Date; replaced_by_id?: string } }) => {
    const matching = [...sessions.values()].filter((session) =>
      (!where.id || session.id === where.id) && (!where.family_id || session.family_id === where.family_id) &&
      (where.revoked_at !== null || !session.revoked_at),
    );
    for (const session of matching) {
      session.revoked_at = data.revoked_at;
      session.replaced_by_id = data.replaced_by_id ?? null;
    }
    return { count: matching.length };
  };
  const service = new AuthService({ findByEmail: async () => activeUser, findById: async () => activeUser });

  const result = await service.refresh(oldToken);
  const replacement = result.tokens.refreshToken;
  const replacementId = jwt.decode(replacement) as { jti: string };
  assert.notEqual(replacement, oldToken);
  assert.equal(sessions.get("old-session")?.revoked_at instanceof Date, true);
  assert.equal(sessions.get("old-session")?.replaced_by_id, replacementId.jti);
  assert.equal(sessions.get(replacementId.jti)?.token_hash, tokenHash(replacement));
  assert.equal(sessions.get(replacementId.jti)?.family_id, "family-1");

  await assert.rejects(service.refresh(oldToken), (error: unknown) =>
    error instanceof ApiError && error.code === "INVALID_REFRESH_TOKEN",
  );
  assert.equal(sessions.get(replacementId.jti)?.revoked_at instanceof Date, true);
});

test("logout revokes the current persisted refresh session", async () => {
  const token = makeToken("logout-session");
  let revoked = false;
  (prisma.refresh_sessions as unknown as { updateMany: unknown }).updateMany = async ({ where }: { where: { id: string; user_id: number; tenant_id: number } }) => {
    revoked = where.id === "logout-session" && where.user_id === 41 && where.tenant_id === 9;
    return { count: 1 };
  };
  const service = new AuthService({ findByEmail: async () => activeUser, findById: async () => activeUser });
  await service.logout(token);
  assert.equal(revoked, true);
});

test("expired persisted sessions and malformed refresh tokens are rejected", async () => {
  const token = makeToken("expired-session");
  let findCount = 0;
  (prisma.refresh_sessions as unknown as { findUnique: unknown }).findUnique = async () => {
    findCount += 1;
    return { id: "expired-session", user_id: 41, tenant_id: 9, token_hash: tokenHash(token), expires_at: new Date(Date.now() - 1), revoked_at: null };
  };
  const service = new AuthService({ findByEmail: async () => activeUser, findById: async () => activeUser });
  await assert.rejects(service.refresh(token), (error: unknown) => error instanceof ApiError && error.code === "INVALID_REFRESH_TOKEN");
  await assert.rejects(service.refresh("malformed"), (error: unknown) => error instanceof ApiError && error.code === "INVALID_REFRESH_TOKEN");
  assert.equal(findCount, 1);
});
