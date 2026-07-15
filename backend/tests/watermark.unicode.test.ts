import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { PDFDocument } from "pdf-lib";
import { applyWatermarkToPdfBytes } from "../src/modules/settings/watermark.helper";

test("watermark embeds Vietnamese Unicode text into a valid PDF", async () => {
  const font = [process.env.PDF_UNICODE_FONT_PATH, "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf", "C:/Windows/Fonts/arial.ttf"].find((value) => value && fs.existsSync(value));
  assert.ok(font, "a Unicode-capable system font is required");
  const previous = process.env.PDF_UNICODE_FONT_PATH;
  process.env.PDF_UNICODE_FONT_PATH = font;
  try {
    const input = await PDFDocument.create();
    input.addPage([300, 300]);
    const bytes = await applyWatermarkToPdfBytes(await input.save(), {
      enabled: true, text: "ÄÃ£ kÃ½ - Nguyá»…n VÄƒn A", draft_text: "", in_progress_text: "", completed_text: "", draft_mode: "none", in_progress_mode: "none", completed_mode: "none", draft_image_data: "", draft_image_mime_type: "", in_progress_image_data: "", in_progress_image_mime_type: "", completed_image_data: "", completed_image_mime_type: "", font_family: "helvetica", position: "center", opacity: .2, fontSize: 20, rotation: 0, color: "#000000", repeat: false, image_scale: .3,
    }, { mode: "text", text: "ÄÃ£ kÃ½ - Nguyá»…n VÄƒn A", image_data: "", image_mime_type: "" });
    assert.ok(bytes.byteLength > 1000);
    await PDFDocument.load(bytes);
  } finally { process.env.PDF_UNICODE_FONT_PATH = previous; }
});
