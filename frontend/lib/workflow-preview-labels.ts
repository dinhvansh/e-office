export const workflowPreviewLabels = {
  loading: 'Đang tải quy trình...',
  title: 'Quy trình phê duyệt',
  steps: (count: number) => `${count} bước`,
  missingApprover: 'Chưa có thông tin người phê duyệt',
  approverTypes: {
    user: 'Người dùng', role: 'Vai trò', department: 'Phòng ban', manager: 'Quản lý',
  },
  dueInDays: (days: number) => `${days} ngày`,
} as const;
