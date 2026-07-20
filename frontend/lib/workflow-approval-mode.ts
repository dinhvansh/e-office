import type { TranslationKey } from '@/i18n';

export const APPROVAL_MODES = ['sequential', 'parallel'] as const;

export type ApprovalMode = (typeof APPROVAL_MODES)[number];

export const DEFAULT_APPROVAL_MODE: ApprovalMode = 'sequential';

export const approvalModeTranslationKeys: Record<
  ApprovalMode,
  { label: TranslationKey; description: TranslationKey; previewHint: TranslationKey }
> = {
  sequential: {
    label: 'workflow.approvalMode.sequential',
    description: 'workflow.approvalMode.sequentialDescription',
    previewHint: 'workflow.approvalMode.sequentialPreview',
  },
  parallel: {
    label: 'workflow.approvalMode.parallel',
    description: 'workflow.approvalMode.parallelDescription',
    previewHint: 'workflow.approvalMode.parallelPreview',
  },
};

export function normalizeApprovalMode(value: unknown): ApprovalMode {
  return value === 'parallel' ? 'parallel' : DEFAULT_APPROVAL_MODE;
}
