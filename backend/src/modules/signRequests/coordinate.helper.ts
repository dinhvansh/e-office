export interface NormalizedFieldBox {
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
}

export interface PixelFieldBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface PdfFieldBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

const clamp01 = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
};

export function clampNormalizedBox(box: NormalizedFieldBox): NormalizedFieldBox {
  const widthPct = clamp01(box.widthPct);
  const heightPct = clamp01(box.heightPct);
  const xPct = Math.min(clamp01(box.xPct), 1 - widthPct);
  const yPct = Math.min(clamp01(box.yPct), 1 - heightPct);

  return {
    xPct,
    yPct,
    widthPct,
    heightPct,
  };
}

export function pxToPct(box: PixelFieldBox, pageWidthPx: number, pageHeightPx: number): NormalizedFieldBox {
  if (!pageWidthPx || !pageHeightPx) {
    return { xPct: 0, yPct: 0, widthPct: 0, heightPct: 0 };
  }

  return clampNormalizedBox({
    xPct: box.left / pageWidthPx,
    yPct: box.top / pageHeightPx,
    widthPct: box.width / pageWidthPx,
    heightPct: box.height / pageHeightPx,
  });
}

export function pctToPx(box: NormalizedFieldBox, pageWidthPx: number, pageHeightPx: number): PixelFieldBox {
  const normalized = clampNormalizedBox(box);
  return {
    left: normalized.xPct * pageWidthPx,
    top: normalized.yPct * pageHeightPx,
    width: normalized.widthPct * pageWidthPx,
    height: normalized.heightPct * pageHeightPx,
  };
}

export function pctToPdfBox(box: NormalizedFieldBox, pageWidthPt: number, pageHeightPt: number): PdfFieldBox {
  const normalized = clampNormalizedBox(box);
  const width = normalized.widthPct * pageWidthPt;
  const height = normalized.heightPct * pageHeightPt;

  return {
    x: normalized.xPct * pageWidthPt,
    y: pageHeightPt - ((normalized.yPct + normalized.heightPct) * pageHeightPt),
    width,
    height,
  };
}

export function normalizeStoredFieldBox(field: {
  x?: number | null;
  y?: number | null;
  width?: number | null;
  height?: number | null;
}): NormalizedFieldBox {
  const rawX = field.x ?? 0;
  const rawY = field.y ?? 0;
  const rawWidth = field.width ?? 0;
  const rawHeight = field.height ?? 0;

  const usesLegacyPercent =
    Math.abs(rawX) > 1 ||
    Math.abs(rawY) > 1 ||
    Math.abs(rawWidth) > 1 ||
    Math.abs(rawHeight) > 1;

  return clampNormalizedBox({
    xPct: usesLegacyPercent ? rawX / 100 : rawX,
    yPct: usesLegacyPercent ? rawY / 100 : rawY,
    widthPct: usesLegacyPercent ? rawWidth / 100 : rawWidth,
    heightPct: usesLegacyPercent ? rawHeight / 100 : rawHeight,
  });
}
