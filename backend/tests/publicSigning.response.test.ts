import assert from "node:assert/strict";
import test from "node:test";
import { buildPreOtpSigningMetadata, buildVerifiedSigningMetadata } from "../src/modules/public/publicSigning.response";

const source = {
  signer: {
    id: 10,
    name: "Synthetic Signer",
    email: "signer@example.test",
    role: "signer",
    status: "pending",
    signed_at: null,
  },
  signRequest: {
    id: 20,
    title: "Synthetic signing request",
    message: "Please sign",
    deadline: null,
    created_at: new Date("2026-01-01T00:00:00.000Z"),
    document: {
      id: 30,
      title: "Synthetic document",
      original_file_name: "document.pdf",
    },
  },
};

test("pre-OTP public metadata is minimal", () => {
  const metadata = buildPreOtpSigningMetadata(source);
  assert.deepEqual(metadata, {
    otp_required: true,
    signer: { name: "Synthetic Signer", status: "pending" },
    sign_request: { title: "Synthetic signing request", deadline: null },
  });
});

test("verified public metadata contains only the current signer and no storage path", () => {
  const metadata = buildVerifiedSigningMetadata(source);
  const serialized = JSON.stringify(metadata);

  assert.equal("signers" in metadata, false);
  assert.equal("activities" in metadata, false);
  assert.equal("file_path" in metadata.document, false);
  assert.equal(serialized.includes("other-signer@example.test"), false);
  assert.equal(metadata.signer.email, "signer@example.test");
});
