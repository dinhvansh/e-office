import assert from "node:assert/strict";
import test from "node:test";
import { ApiError } from "../src/core/errors/api-error";
import { documentLifecycleService } from "../src/modules/documents/documentLifecycle.service";

test("archive and cancel retain stable lifecycle error codes", async () => {
  await assert.rejects(
    documentLifecycleService.archive({ id: 1, status: "draft" } as never),
    (error: unknown) => error instanceof ApiError && error.code === "DOCUMENT_NOT_COMPLETED",
  );
  await assert.rejects(
    documentLifecycleService.cancel({ id: 1, status: "completed", sign_request_id: null } as never, 2),
    (error: unknown) => error instanceof ApiError && error.code === "DOCUMENT_CANCEL_DENIED",
  );
});
