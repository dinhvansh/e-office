import fs from "node:fs";
import fontkit from "fontkit";
import { PDFDocument } from "pdf-lib";

export async function embedUnicodeFont(pdfDoc: PDFDocument, bold = false) {
  const fontPath = bold
    ? (process.env.PDF_UNICODE_BOLD_FONT_PATH || "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf")
    : (process.env.PDF_UNICODE_FONT_PATH || "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf");
  if (!fs.existsSync(fontPath)) throw new Error(`Unicode PDF font is unavailable: ${fontPath}`);
  pdfDoc.registerFontkit(fontkit);
  return pdfDoc.embedFont(fs.readFileSync(fontPath), { subset: false });
}
