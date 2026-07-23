import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";
import { errorHandler } from "../src/core/middlewares/errorHandler";

test("validation failures return a structured 400 response", () => {
  const validationError = z.object({ email: z.string().email() }).safeParse({ email: "invalid" });
  assert.equal(validationError.success, false);
  if (validationError.success) return;

  let statusCode: number | undefined;
  let body: unknown;
  const response = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(payload: unknown) {
      body = payload;
      return this;
    },
  };

  errorHandler(
    validationError.error,
    { context: { requestId: "request-123" } } as never,
    response as never,
    (() => undefined) as never,
  );

  assert.equal(statusCode, 400);
  assert.deepEqual(body, {
    success: false,
    error: {
      message: "Invalid request data",
      code: "VALIDATION_ERROR",
      details: [{
        code: "invalid_string",
        path: ["email"],
        message: "Invalid email",
      }],
      requestId: "request-123",
    },
  });
});
