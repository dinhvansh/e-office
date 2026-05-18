export type SignFieldType = 'signature' | 'text' | 'date' | 'checkbox';

const FIELD_DEFAULTS: Record<SignFieldType, { label: string; placeholder: string }> = {
  signature: {
    label: 'Ký tại đây',
    placeholder: 'Ký tại đây',
  },
  text: {
    label: 'Nhập nội dung',
    placeholder: 'Nhập nội dung',
  },
  date: {
    label: 'Ngày ký',
    placeholder: 'Ngày ký',
  },
  checkbox: {
    label: 'Đánh dấu tại đây',
    placeholder: 'Đánh dấu tại đây',
  },
};

export function getDefaultFieldLabel(type: SignFieldType) {
  return FIELD_DEFAULTS[type].label;
}

export function getDefaultFieldPlaceholder(type: SignFieldType) {
  return FIELD_DEFAULTS[type].placeholder;
}

export function getResolvedFieldLabel(field: { type: SignFieldType; label?: string | null }) {
  return field.label?.trim() || getDefaultFieldLabel(field.type);
}

export function getResolvedFieldPlaceholder(field: {
  type: SignFieldType;
  placeholder?: string | null;
  label?: string | null;
}) {
  return field.placeholder?.trim() || field.label?.trim() || getDefaultFieldPlaceholder(field.type);
}
