import assert from "node:assert/strict";
import test from "node:test";
import { ApiError } from "../src/core/errors/api-error";
import { signRequestLifecycleService } from "../src/modules/signRequests/signRequestLifecycle.service";

test("completed and cancelled requests retain the stable cancellation denial", async () => {
  await assert.rejects(
    signRequestLifecycleService.cancel({ status: "completed", document_id: 5 }, 2, 3, 4),
    (error: unknown) => error instanceof ApiError && error.code === "SIGN_REQUEST_CANCEL_DENIED",
  );
});

test("non-editable delete and non-completed revoke retain stable error codes", async () => {
  await assert.rejects(
    signRequestLifecycleService.deleteDraft({ status: "completed" }, 2),
    (error: unknown) => error instanceof ApiError && error.code === "SIGN_REQUEST_DELETE_DENIED",
  );
  await assert.rejects(
    signRequestLifecycleService.revokeCompleted({ status: "draft", document_id: 5 }, 2, 3),
    (error: unknown) => error instanceof ApiError && error.code === "SIGN_REQUEST_REVOKE_DENIED",
  );
});
