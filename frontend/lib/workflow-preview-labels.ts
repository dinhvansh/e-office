import type { TranslationKey } from '@/i18n';

export const workflowPreviewKeys = {
  loading: 'workflow.preview.loading',
  title: 'workflow.preview.title',
  steps: 'workflow.preview.steps',
  missingApprover: 'workflow.preview.missingApprover',
  approverTypes: {
    user: 'workflow.preview.approverType.user',
    role: 'workflow.preview.approverType.role',
    department: 'workflow.preview.approverType.department',
    manager: 'workflow.preview.approverType.manager',
  },
  dueInDays: 'workflow.preview.dueInDays',
  parallelMarker: 'workflow.preview.parallelMarker',
} as const satisfies {
  loading: TranslationKey;
  title: TranslationKey;
  steps: TranslationKey;
  missingApprover: TranslationKey;
  approverTypes: Record<'user' | 'role' | 'department' | 'manager', TranslationKey>;
  dueInDays: TranslationKey;
  parallelMarker: TranslationKey;
};
