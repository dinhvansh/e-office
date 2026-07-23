import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { env } from "../src/config/env";
import { authService } from "../src/modules/auth/auth.service";
import { AuthController } from "../src/modules/auth/auth.controller";

const originalLogin = authService.login;
const originalRefresh = authService.refresh;

afterEach(() => {
  (authService as unknown as { login: unknown }).login = originalLogin;
  (authService as unknown as { refresh: unknown }).refresh = originalRefresh;
});

function responseHarness() {
  const headers = new Map<string, string>();
  let body: unknown;
  return {
    setHeader: (key: string, value: string) => headers.set(key, value),
    json: (value: unknown) => { body = value; },
    header: (key: string) => headers.get(key),
    body: () => body as { data: { tokens: Record<string, unknown> } },
  };
}

test("login and refresh send refresh tokens only in HttpOnly cookies", async () => {
  const result = {
    tokens: { accessToken: "access-token", refreshToken: "raw-refresh-token" },
    user: { id: 41, email: "active@example.test", role: "User" },
    tenant: { id: 9, name: "Test", plan: "free", status: "active" },
  };
  (authService as unknown as { login: unknown }).login = async () => result;
  (authService as unknown as { refresh: unknown }).refresh = async () => result;
  const controller = new AuthController();
  const loginResponse = responseHarness();
  await controller.login({ body: { email: "active@example.test", password: "correct-password" } } as never, loginResponse as never);
  const refreshResponse = responseHarness();
  await controller.refresh({ body: {}, headers: { cookie: `${env.AUTH_COOKIE_NAME}=raw-refresh-token` } } as never, refreshResponse as never);

  for (const response of [loginResponse, refreshResponse]) {
    assert.equal(response.body().data.tokens.accessToken, "access-token");
    assert.equal("refreshToken" in response.body().data.tokens, false);
    assert.match(response.header("Set-Cookie") || "", /HttpOnly/);
    assert.match(response.header("Set-Cookie") || "", /raw-refresh-token/);
  }
});

test("login forwards a short non-empty password to the credential check", async () => {
  let receivedPassword: string | undefined;
  const result = {
    tokens: { accessToken: "access-token", refreshToken: "raw-refresh-token" },
    user: { id: 41, email: "active@example.test", role: "User" },
    tenant: { id: 9, name: "Test", plan: "free", status: "active" },
  };
  (authService as unknown as { login: unknown }).login = async (input: { password: string }) => {
    receivedPassword = input.password;
    return result;
  };

  const controller = new AuthController();
  const response = responseHarness();
  await controller.login({ body: { email: "active@example.test", password: "x" } } as never, response as never);

  assert.equal(receivedPassword, "x");
});
