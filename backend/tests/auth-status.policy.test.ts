import assert from "node:assert/strict";
import test from "node:test";
import { getAuthStatusError } from "../src/modules/auth/auth-status.policy";

test("allows an active user in an active tenant", () => {
  assert.equal(getAuthStatusError("active", "active"), null);
});

for (const status of ["pending", "rejected", "disabled", "inactive", null, undefined]) {
  test(`rejects a ${String(status)} user`, () => {
    assert.deepEqual(getAuthStatusError(status, "active"), {
      code: "ACCOUNT_NOT_ACTIVE",
      message: "Account is not active",
    });
  });
}

for (const status of ["inactive", "disabled", "pending", null, undefined]) {
  test(`rejects a ${String(status)} tenant`, () => {
    assert.deepEqual(getAuthStatusError("active", status), {
      code: "TENANT_NOT_ACTIVE",
      message: "Tenant is not active",
    });
  });
}
