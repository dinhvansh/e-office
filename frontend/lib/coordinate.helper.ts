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
