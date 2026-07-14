import assert from "node:assert/strict";
import test from "node:test";
import { normalizeStoredFieldBox, pctToPdfBox, pxToPct } from "../src/modules/signRequests/coordinate.helper";

test("three non-edge field positions remain normalized through storage and PDF conversion", () => {
  for (const [left, top] of [[120, 90], [400, 300], [650, 480]]) {
    const browser = pxToPct({ left, top, width: 120, height: 50 }, 800, 600);
    const restored = normalizeStoredFieldBox({ x: browser.xPct, y: browser.yPct, width: browser.widthPct, height: browser.heightPct });
    const pdf = pctToPdfBox(restored, 800, 600);

    assert.ok(restored.xPct > 0);
    assert.ok(restored.yPct > 0);
    assert.equal(restored.xPct, browser.xPct);
    assert.equal(restored.yPct, browser.yPct);
    assert.ok(pdf.x > 0);
    assert.ok(pdf.y > 0);
  }
});
