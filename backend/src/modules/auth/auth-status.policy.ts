export type AuthStatusError = {
  code: "ACCOUNT_NOT_ACTIVE" | "TENANT_NOT_ACTIVE";
  message: string;
};

/**
 * Authentication is permitted only for active users in active tenants.
 * Treat missing and unknown statuses as inactive so legacy data cannot bypass
 * this boundary.
 */
export function getAuthStatusError(
  userStatus: string | null | undefined,
  tenantStatus: string | null | undefined,
): AuthStatusError | null {
  if (userStatus !== "active") {
    return {
      code: "ACCOUNT_NOT_ACTIVE",
      message: "Account is not active",
    };
  }

  if (tenantStatus !== "active") {
    return {
      code: "TENANT_NOT_ACTIVE",
      message: "Tenant is not active",
    };
  }

  return null;
}
