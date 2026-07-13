import assert from "node:assert/strict";
import test from "node:test";
import { getArtifactCompletionStatus } from "../src/modules/signRequests/artifactCompletion.policy";

test("a generated artifact permits completion", () => {
  assert.equal(getArtifactCompletionStatus(true), "completed");
});

test("a failed artifact is never marked completed", () => {
  assert.equal(getArtifactCompletionStatus(false), "artifact_failed");
});
