import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { PDFDocument, rgb } from "pdf-lib";
import { PdfGenerationService } from "../src/modules/signRequests/pdfGeneration.service";

const vietnameseSamples = [
  "Nguyễn Văn A",
  "Cộng hòa Xã hội Chủ nghĩa Việt Nam",
  "Đã ký",
  "Ngày ký",
  "Ý kiến phê duyệt",
];

function availableUnicodeFont(): string {
  const candidates = [
    process.env.PDF_UNICODE_FONT_PATH,
    "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf",
    "C:/Windows/Fonts/arial.ttf",
  ].filter((candidate): candidate is string => Boolean(candidate));
  const fontPath = candidates.find((candidate) => fs.existsSync(candidate));
  if (!fontPath) throw new Error("A Unicode-capable test font is required");
  return path.resolve(fontPath);
}

function serviceWithFont(fontPath: string): PdfGenerationService {
  const service = new PdfGenerationService();
  const mutable = service as unknown as { unicodeFontPath: string; unicodeBoldFontPath: string };
  mutable.unicodeFontPath = fontPath;
  mutable.unicodeBoldFontPath = fontPath;
  return service;
}

test("Unicode PDF font embeds Vietnamese text intact and keeps English generation working", async () => {
  const service = serviceWithFont(availableUnicodeFont()) as unknown as {
    embedUnicodeFont(document: PDFDocument, bold?: boolean): Promise<{ encodeText(value: string): unknown }>;
  };
  const document = await PDFDocument.create();
  const font = await service.embedUnicodeFont(document);
  const page = document.addPage([595, 842]);

  for (const [index, text] of [...vietnameseSamples, "English text still works"].entries()) {
    assert.doesNotThrow(() => font.encodeText(text));
    page.drawText(text, { x: 40, y: 780 - index * 24, size: 12, font: font as never, color: rgb(0, 0, 0) });
  }

  const bytes = await document.save();
  assert.ok(bytes.byteLength > 1_000);
});

test("a missing Unicode font fails clearly before an artifact can complete", async () => {
  const service = serviceWithFont(path.resolve("missing-unicode-font.ttf")) as unknown as {
    embedUnicodeFont(document: PDFDocument, bold?: boolean): Promise<unknown>;
  };
  await assert.rejects(service.embedUnicodeFont(await PDFDocument.create()), /Unicode PDF font is unavailable/);
});
