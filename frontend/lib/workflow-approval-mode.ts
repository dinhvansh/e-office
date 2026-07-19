export const APPROVAL_MODES = ['sequential', 'parallel'] as const;

export type ApprovalMode = (typeof APPROVAL_MODES)[number];

export const DEFAULT_APPROVAL_MODE: ApprovalMode = 'sequential';

export const approvalModeContent: Record<
  ApprovalMode,
  { label: string; description: string; previewHint: string }
> = {
  sequential: {
    label: 'Duyệt tuần tự',
    description: 'Người duyệt xử lý lần lượt theo thứ tự từng bước.',
    previewHint: 'Các bước được kích hoạt lần lượt theo thứ tự.',
  },
  parallel: {
    label: 'Duyệt song song',
    description: 'Tất cả người duyệt được yêu cầu xử lý cùng lúc. Workflow chỉ tiếp tục khi tất cả đã duyệt.',
    previewHint: 'Tất cả bước duyệt được kích hoạt đồng thời.',
  },
};

export function normalizeApprovalMode(value: unknown): ApprovalMode {
  return value === 'parallel' ? 'parallel' : DEFAULT_APPROVAL_MODE;
}
