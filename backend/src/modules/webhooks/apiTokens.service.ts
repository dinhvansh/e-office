import crypto from "crypto";
import { prisma } from "../../config/prisma";

const API_TOKENS_SETTING_KEY = "api_tokens";

type StoredApiToken = {
  id: string;
  name: string;
  token_prefix: string;
  token_hash: string;
  tenant_id: number;
  created_by_user_id: number;
  created_by_email: string | null;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

type PublicApiToken = Omit<StoredApiToken, "token_hash">;

const isStoredApiToken = (value: unknown): value is StoredApiToken => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const token = value as Record<string, unknown>;

  return (
    typeof token.id === "string" &&
    typeof token.name === "string" &&
    typeof token.token_prefix === "string" &&
    typeof token.token_hash === "string" &&
    typeof token.tenant_id === "number" &&
    typeof token.created_by_user_id === "number" &&
    typeof token.created_at === "string"
  );
};

const sanitizeTokens = (value: unknown): StoredApiToken[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isStoredApiToken)
    .map((token) => ({
      ...token,
      created_by_email: token.created_by_email ?? null,
      last_used_at: token.last_used_at ?? null,
      revoked_at: token.revoked_at ?? null,
    }));
};

const toPublicToken = (token: StoredApiToken): PublicApiToken => ({
  id: token.id,
  name: token.name,
  token_prefix: token.token_prefix,
  tenant_id: token.tenant_id,
  created_by_user_id: token.created_by_user_id,
  created_by_email: token.created_by_email,
  created_at: token.created_at,
  last_used_at: token.last_used_at,
  revoked_at: token.revoked_at,
});

const hashToken = (token: string): string =>
  crypto.createHash("sha256").update(token).digest("hex");

class ApiTokensService {
  private async getTenantTokens(tenantId: number): Promise<StoredApiToken[]> {
    const setting = await prisma.tenant_settings.findFirst({
      where: {
        tenant_id: tenantId,
        setting_key: API_TOKENS_SETTING_KEY,
      },
    });

    return sanitizeTokens(setting?.setting_value);
  }

  private async saveTenantTokens(tenantId: number, tokens: StoredApiToken[], updatedBy?: number): Promise<void> {
    const existing = await prisma.tenant_settings.findFirst({
      where: {
        tenant_id: tenantId,
        setting_key: API_TOKENS_SETTING_KEY,
      },
      select: { id: true },
    });

    if (existing) {
      await prisma.tenant_settings.update({
        where: { id: existing.id },
        data: {
          setting_value: tokens,
          updated_by: updatedBy,
        },
      });
      return;
    }

    await prisma.tenant_settings.create({
      data: {
        tenant_id: tenantId,
        setting_key: API_TOKENS_SETTING_KEY,
        setting_value: tokens,
        updated_by: updatedBy,
      },
    });
  }

  async listForTenant(tenantId: number): Promise<PublicApiToken[]> {
    const tokens = await this.getTenantTokens(tenantId);
    return tokens
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map(toPublicToken);
  }

  async createForTenant(tenantId: number, userId: number, name: string): Promise<{ token: string; metadata: PublicApiToken }> {
    const creator = await prisma.users.findFirst({
      where: {
        id: userId,
        tenant_id: tenantId,
      },
      select: {
        email: true,
      },
    });

    const rawToken = `esign_${crypto.randomBytes(24).toString("hex")}${crypto.randomBytes(24).toString("hex")}`;
    const storedToken: StoredApiToken = {
      id: crypto.randomUUID(),
      name,
      token_prefix: `${rawToken.slice(0, 12)}...`,
      token_hash: hashToken(rawToken),
      tenant_id: tenantId,
      created_by_user_id: userId,
      created_by_email: creator?.email ?? null,
      created_at: new Date().toISOString(),
      last_used_at: null,
      revoked_at: null,
    };

    const tokens = await this.getTenantTokens(tenantId);
    tokens.push(storedToken);
    await this.saveTenantTokens(tenantId, tokens, userId);

    return {
      token: rawToken,
      metadata: toPublicToken(storedToken),
    };
  }

  async revokeForTenant(tenantId: number, tokenId: string, userId: number): Promise<PublicApiToken | null> {
    const tokens = await this.getTenantTokens(tenantId);
    const tokenIndex = tokens.findIndex((item) => item.id === tokenId);

    if (tokenIndex === -1) {
      return null;
    }

    tokens[tokenIndex] = {
      ...tokens[tokenIndex],
      revoked_at: new Date().toISOString(),
    };

    await this.saveTenantTokens(tenantId, tokens, userId);
    return toPublicToken(tokens[tokenIndex]);
  }

  async authenticate(rawToken: string): Promise<StoredApiToken | null> {
    const tokenHash = hashToken(rawToken);

    const settings = await prisma.tenant_settings.findMany({
      where: {
        setting_key: API_TOKENS_SETTING_KEY,
      },
      select: {
        setting_value: true,
      },
    });

    for (const setting of settings) {
      const tokens = sanitizeTokens(setting.setting_value);
      const matched = tokens.find(
        (token) => token.token_hash === tokenHash && !token.revoked_at
      );

      if (matched) {
        return matched;
      }
    }

    return null;
  }

  async touchLastUsed(tenantId: number, tokenId: string): Promise<void> {
    const tokens = await this.getTenantTokens(tenantId);
    const tokenIndex = tokens.findIndex((item) => item.id === tokenId);

    if (tokenIndex === -1) {
      return;
    }

    tokens[tokenIndex] = {
      ...tokens[tokenIndex],
      last_used_at: new Date().toISOString(),
    };

    await this.saveTenantTokens(tenantId, tokens, tokens[tokenIndex].created_by_user_id);
  }
}

export const apiTokensService = new ApiTokensService();
