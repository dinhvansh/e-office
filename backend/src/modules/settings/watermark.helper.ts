import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib';
import { settingsRepository } from './settings.repository';

export type WatermarkFontFamily =
  | 'helvetica'
  | 'helvetica_bold'
  | 'times_roman'
  | 'times_bold'
  | 'courier'
  | 'courier_bold';

export type WatermarkContentMode = 'none' | 'text' | 'image' | 'both';

export interface WatermarkConfig {
  enabled: boolean;
  text: string;
  draft_text: string;
  in_progress_text: string;
  completed_text: string;
  draft_mode: WatermarkContentMode;
  in_progress_mode: WatermarkContentMode;
  completed_mode: WatermarkContentMode;
  draft_image_data: string;
  draft_image_mime_type: string;
  in_progress_image_data: string;
  in_progress_image_mime_type: string;
  completed_image_data: string;
  completed_image_mime_type: string;
  font_family: WatermarkFontFamily;
  position: 'center' | 'diagonal' | 'top' | 'bottom';
  opacity: number;
  fontSize: number;
  rotation: number;
  color: string;
  repeat: boolean;
  image_scale: number;
}

export interface WatermarkVariant {
  mode: WatermarkContentMode;
  text: string;
  image_data: string;
  image_mime_type: string;
}

const defaultWatermarkConfig: WatermarkConfig = {
  enabled: false,
  text: 'CHUA HOAN THANH',
  draft_text: 'VAN BAN CHUA CO HIEU LUC',
  in_progress_text: 'CHUA HOAN THANH',
  completed_text: 'BAN PHAT HANH',
  draft_mode: 'text',
  in_progress_mode: 'text',
  completed_mode: 'none',
  draft_image_data: '',
  draft_image_mime_type: '',
  in_progress_image_data: '',
  in_progress_image_mime_type: '',
  completed_image_data: '',
  completed_image_mime_type: '',
  font_family: 'helvetica_bold',
  position: 'diagonal',
  opacity: 0.15,
  fontSize: 60,
  rotation: 45,
  color: '#DC2626',
  repeat: true,
  image_scale: 0.35,
};

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value !== null && typeof value === 'object' ? value as UnknownRecord : {};
}

export function normalizeWatermarkConfig(raw: unknown): WatermarkConfig {
  const config = asRecord(raw);
  const legacyImageData = normalizeImageData(config.image_data || config.imageData);
  const legacyImageMimeType = normalizeImageMimeType(config.image_mime_type || config.imageMimeType);
  const legacyUseImage = Boolean(config.use_image);

  return {
    enabled: Boolean(config.enabled),
    text: normalizeText(config.text, defaultWatermarkConfig.text),
    draft_text: normalizeText(config.draft_text || config.draftText, defaultWatermarkConfig.draft_text),
    in_progress_text: normalizeText(
      config.in_progress_text || config.inProgressText || config.text,
      defaultWatermarkConfig.in_progress_text,
    ),
    completed_text: normalizeText(config.completed_text || config.completedText, defaultWatermarkConfig.completed_text),
    draft_mode: resolveMode(config.draft_mode || config.draftMode, defaultWatermarkConfig.draft_mode),
    in_progress_mode: resolveMode(
      config.in_progress_mode || config.inProgressMode,
      legacyUseImage ? 'both' : defaultWatermarkConfig.in_progress_mode,
    ),
    completed_mode: resolveMode(config.completed_mode || config.completedMode, defaultWatermarkConfig.completed_mode),
    draft_image_data: normalizeImageData(config.draft_image_data || config.draftImageData),
    draft_image_mime_type: normalizeImageMimeType(config.draft_image_mime_type || config.draftImageMimeType),
    in_progress_image_data: normalizeImageData(config.in_progress_image_data || config.inProgressImageData || legacyImageData),
    in_progress_image_mime_type: normalizeImageMimeType(
      config.in_progress_image_mime_type || config.inProgressImageMimeType || legacyImageMimeType,
    ),
    completed_image_data: normalizeImageData(config.completed_image_data || config.completedImageData),
    completed_image_mime_type: normalizeImageMimeType(
      config.completed_image_mime_type || config.completedImageMimeType,
    ),
    font_family: resolveFontFamily(config.font_family || config.fontFamily),
    position: ['center', 'diagonal', 'top', 'bottom'].includes(String(config.position))
      ? (String(config.position) as WatermarkConfig['position'])
      : defaultWatermarkConfig.position,
    opacity: clampNumber(config.opacity, 0.05, 1, defaultWatermarkConfig.opacity),
    fontSize: clampNumber(config.fontSize, 16, 160, defaultWatermarkConfig.fontSize),
    rotation: clampNumber(config.rotation, -90, 90, defaultWatermarkConfig.rotation),
    color: normalizeHexColor(config.color),
    repeat: config.repeat === undefined ? defaultWatermarkConfig.repeat : Boolean(config.repeat),
    image_scale: clampNumber(config.image_scale || config.imageScale, 0.1, 1.5, defaultWatermarkConfig.image_scale),
  };
}

export async function getTenantWatermarkConfig(tenantId: number): Promise<WatermarkConfig> {
  const setting = await settingsRepository.getSetting(tenantId, 'watermark_config');
  return normalizeWatermarkConfig(setting?.setting_value);
}

export function resolveWatermarkVariantForStatus(
  config: WatermarkConfig,
  status: string | null | undefined,
): WatermarkVariant | null {
  if (!config.enabled) {
    return null;
  }

  const normalizedStatus = String(status || '').toLowerCase();

  if (normalizedStatus === 'draft') {
    return buildVariant(config.draft_mode, config.draft_text, config.draft_image_data, config.draft_image_mime_type);
  }

  if (['pending', 'pending_approval', 'pending_signature', 'in_progress', 'rejected'].includes(normalizedStatus)) {
    return buildVariant(
      config.in_progress_mode,
      config.in_progress_text,
      config.in_progress_image_data,
      config.in_progress_image_mime_type,
    );
  }

  if (['completed', 'signed'].includes(normalizedStatus)) {
    return buildVariant(
      config.completed_mode,
      config.completed_text,
      config.completed_image_data,
      config.completed_image_mime_type,
    );
  }

  return null;
}

export function shouldApplyWatermarkForStatus(config: WatermarkConfig, status: string | null | undefined): boolean {
  return resolveWatermarkVariantForStatus(config, status) !== null;
}

export async function applyWatermarkToPdfBytes(
  pdfBytes: Uint8Array,
  config: WatermarkConfig,
  variant: WatermarkVariant,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(resolveStandardFont(config.font_family));
  const color = hexToRgb(config.color);
  const image = await embedWatermarkImage(pdfDoc, variant);

  for (const page of pages) {
    const { width, height } = page.getSize();
    const positions = resolveWatermarkPositions(width, height, config);
    const angle = config.position === 'diagonal' ? resolveDiagonalAngle(width, height) : config.rotation;
    const textWidth = variant.text ? font.widthOfTextAtSize(variant.text, config.fontSize) : 0;
    const textHeight = variant.text ? font.heightAtSize(config.fontSize) : 0;

    for (const pos of positions) {
      if ((variant.mode === 'text' || variant.mode === 'both') && variant.text) {
        const textOrigin = resolveRotatedOrigin(pos.x, pos.y, textWidth, textHeight, angle);
        page.drawText(variant.text, {
          x: textOrigin.x,
          y: textOrigin.y,
          size: config.fontSize,
          font,
          color: rgb(color.r, color.g, color.b),
          opacity: config.opacity,
          rotate: degrees(angle),
        });
      }

      if ((variant.mode === 'image' || variant.mode === 'both') && image) {
        const scaled = image.scale(config.image_scale);
        const imageOrigin = resolveRotatedOrigin(pos.x, pos.y, scaled.width, scaled.height, angle);
        page.drawImage(image, {
          x: imageOrigin.x,
          y: imageOrigin.y,
          width: scaled.width,
          height: scaled.height,
          opacity: config.opacity,
          rotate: degrees(angle),
        });
      }
    }
  }

  return pdfDoc.save();
}

function buildVariant(
  mode: WatermarkContentMode,
  text: string,
  image_data: string,
  image_mime_type: string,
): WatermarkVariant | null {
  if (mode === 'none') {
    return null;
  }

  const normalizedText = String(text || '').trim();
  const normalizedImage = normalizeImageData(image_data);
  const normalizedMimeType = normalizeImageMimeType(image_mime_type);

  if (mode === 'text' && !normalizedText) return null;
  if (mode === 'image' && !normalizedImage) return null;
  if (mode === 'both' && !normalizedText && !normalizedImage) return null;

  return {
    mode,
    text: normalizedText,
    image_data: normalizedImage,
    image_mime_type: normalizedMimeType,
  };
}

function resolveWatermarkPositions(width: number, height: number, config: WatermarkConfig) {
  const centerX = width / 2;
  const centerY = height / 2;

  if (!config.repeat) {
    return [resolveSingleWatermarkPosition(width, height, config.position)];
  }

  if (config.position === 'top') {
    return [
      { x: centerX, y: height - 80 },
      { x: centerX, y: height / 2 },
      { x: centerX, y: 80 },
    ];
  }

  if (config.position === 'bottom') {
    return [
      { x: centerX, y: 80 },
      { x: centerX, y: height / 2 },
      { x: centerX, y: height - 80 },
    ];
  }

  if (config.position === 'diagonal') {
    return [0.22, 0.5, 0.78].map((ratio) => resolveDiagonalPoint(width, height, ratio));
  }

  return [
    { x: centerX, y: centerY },
    { x: centerX - width / 3, y: centerY - height / 3 },
    { x: centerX + width / 3, y: centerY + height / 3 },
  ];
}

function resolveSingleWatermarkPosition(width: number, height: number, position: WatermarkConfig['position']) {
  if (position === 'top') return { x: width / 2, y: height - 80 };
  if (position === 'bottom') return { x: width / 2, y: 80 };
  if (position === 'diagonal') return resolveDiagonalPoint(width, height, 0.5);
  return { x: width / 2, y: height / 2 };
}

function resolveDiagonalAngle(width: number, height: number) {
  return Math.atan2(height, width) * (180 / Math.PI);
}

function resolveDiagonalPoint(width: number, height: number, ratio: number) {
  return {
    x: width * ratio,
    y: height * ratio,
  };
}

function resolveRotatedOrigin(centerX: number, centerY: number, width: number, height: number, angle: number) {
  const radians = (angle * Math.PI) / 180;
  const offsetX = Math.cos(radians) * (width / 2) - Math.sin(radians) * (height / 2);
  const offsetY = Math.sin(radians) * (width / 2) + Math.cos(radians) * (height / 2);

  return {
    x: centerX - offsetX,
    y: centerY - offsetY,
  };
}

function normalizeText(value: unknown, fallback: string) {
  return String(value || fallback).trim() || fallback;
}

function resolveMode(value: unknown, fallback: WatermarkContentMode): WatermarkContentMode {
  const normalized = String(value || '').trim().toLowerCase();
  return ['none', 'text', 'image', 'both'].includes(normalized)
    ? (normalized as WatermarkContentMode)
    : fallback;
}

function resolveFontFamily(value: unknown): WatermarkFontFamily {
  const normalized = String(value || '').trim().toLowerCase();
  const available: WatermarkFontFamily[] = [
    'helvetica',
    'helvetica_bold',
    'times_roman',
    'times_bold',
    'courier',
    'courier_bold',
  ];
  return available.includes(normalized as WatermarkFontFamily)
    ? (normalized as WatermarkFontFamily)
    : defaultWatermarkConfig.font_family;
}

function resolveStandardFont(fontFamily: WatermarkFontFamily) {
  switch (fontFamily) {
    case 'helvetica':
      return StandardFonts.Helvetica;
    case 'times_roman':
      return StandardFonts.TimesRoman;
    case 'times_bold':
      return StandardFonts.TimesRomanBold;
    case 'courier':
      return StandardFonts.Courier;
    case 'courier_bold':
      return StandardFonts.CourierBold;
    default:
      return StandardFonts.HelveticaBold;
  }
}

async function embedWatermarkImage(pdfDoc: PDFDocument, variant: WatermarkVariant) {
  if (!(variant.mode === 'image' || variant.mode === 'both') || !variant.image_data) {
    return null;
  }

  const imageBytes = extractImageBytes(variant.image_data);
  if (!imageBytes) return null;
  if ((variant.image_mime_type || '').toLowerCase() === 'image/png') {
    return pdfDoc.embedPng(imageBytes);
  }
  return pdfDoc.embedJpg(imageBytes);
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function normalizeHexColor(value: unknown) {
  const color = String(value || '').trim();
  return /^#([0-9a-fA-F]{6})$/.test(color) ? color : defaultWatermarkConfig.color;
}

function hexToRgb(hex: string) {
  const normalized = normalizeHexColor(hex).replace('#', '');
  return {
    r: parseInt(normalized.slice(0, 2), 16) / 255,
    g: parseInt(normalized.slice(2, 4), 16) / 255,
    b: parseInt(normalized.slice(4, 6), 16) / 255,
  };
}

function normalizeImageData(value: unknown) {
  const data = String(value || '').trim();
  if (!data) return '';
  return /^data:image\/(png|jpeg|jpg);base64,/.test(data) ? data : '';
}

function normalizeImageMimeType(value: unknown) {
  const mimeType = String(value || '').trim().toLowerCase();
  return ['image/png', 'image/jpeg', 'image/jpg'].includes(mimeType) ? mimeType : '';
}

function extractImageBytes(dataUrl: string) {
  const match = dataUrl.match(/^data:image\/(?:png|jpeg|jpg);base64,(.+)$/);
  if (!match) return null;
  return Uint8Array.from(Buffer.from(match[1], 'base64'));
}
