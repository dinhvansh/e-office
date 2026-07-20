import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { PDFDocument } from "pdf-lib";
import { applyWatermarkToPdfBytes, resolveWatermarkPositions, type WatermarkConfig } from "../src/modules/settings/watermark.helper";

test("watermark embeds Vietnamese Unicode text into a valid PDF", async () => {
  const font = [process.env.PDF_UNICODE_FONT_PATH, "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf", "C:/Windows/Fonts/arial.ttf"].find((value) => value && fs.existsSync(value));
  assert.ok(font, "a Unicode-capable system font is required");
  const previous = process.env.PDF_UNICODE_FONT_PATH;
  process.env.PDF_UNICODE_FONT_PATH = font;
  try {
    const input = await PDFDocument.create();
    input.addPage([300, 300]);
    const bytes = await applyWatermarkToPdfBytes(await input.save(), {
      enabled: true, text: "Đã ký - Nguyễn Văn A", draft_text: "", in_progress_text: "", completed_text: "", draft_mode: "none", in_progress_mode: "none", completed_mode: "none", draft_image_data: "", draft_image_mime_type: "", in_progress_image_data: "", in_progress_image_mime_type: "", completed_image_data: "", completed_image_mime_type: "", font_family: "helvetica", position: "center", opacity: .2, fontSize: 20, rotation: 0, color: "#000000", repeat: false, image_scale: .3,
    }, { mode: "text", text: "Đã ký - Nguyễn Văn A", image_data: "", image_mime_type: "" });
    assert.ok(bytes.byteLength > 1000);
    await PDFDocument.load(bytes);
  } finally { process.env.PDF_UNICODE_FONT_PATH = previous; }
});

test("long repeated diagonal watermarks collapse to one readable mark", () => {
  const config: WatermarkConfig = {
    enabled: true, text: "", draft_text: "", in_progress_text: "", completed_text: "", draft_mode: "none", in_progress_mode: "none", completed_mode: "none", draft_image_data: "", draft_image_mime_type: "", in_progress_image_data: "", in_progress_image_mime_type: "", completed_image_data: "", completed_image_mime_type: "", font_family: "helvetica", position: "diagonal", opacity: .2, fontSize: 60, rotation: 45, color: "#000000", repeat: true, image_scale: .3,
  };
  const positions = resolveWatermarkPositions(612, 792, config, 500);
  assert.equal(positions.length, 1);
  assert.deepEqual(positions[0], { x: 306, y: 396 });
});
