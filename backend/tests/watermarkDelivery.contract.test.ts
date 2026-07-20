import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const backendRoot = path.resolve(__dirname, "..", "..");
const read = (relativePath: string) => fs.readFileSync(path.join(backendRoot, relativePath), "utf8");

test("canonical signing artifacts are stored without tenant watermarks", () => {
  const generation = read("src/modules/signRequests/pdfGeneration.service.ts");
  assert.doesNotMatch(generation, /addWatermark/);
  assert.doesNotMatch(generation, /settings\/watermark\.helper/);
  assert.match(generation, /Watermarks are deliberately applied\s*\/\/ only at delivery time/);
});

test("every primary document delivery channel applies the same watermark policy", () => {
  const documentsController = read("src/modules/documents/documents.controller.ts");
  const approvalsController = read("src/modules/approvals/approvals.controller.ts");
  const publicController = read("src/modules/public/publicSign.controller.ts");
  const documentsService = read("src/modules/documents/documents.service.ts");

  assert.match(documentsController, /download[\s\S]*prepareDocumentDelivery/);
  assert.match(documentsController, /downloadSigned[\s\S]*prepareDocumentDelivery/);
  assert.match(approvalsController, /prepareDocumentDelivery/);
  assert.match(publicController, /getDocument[\s\S]*getWatermarkedDocumentBufferIfNeeded/);
  assert.match(publicController, /downloadSignedPdf[\s\S]*getWatermarkedDocumentBufferIfNeeded/);
  assert.match(documentsService, /const deliveredPrimary = await this\.prepareDocumentDelivery\(primary\)/);
  assert.match(documentsService, /delivery_watermark_applied: deliveredPrimary\.watermarkApplied/);
});
