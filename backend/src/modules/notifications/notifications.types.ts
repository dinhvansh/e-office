export enum NotificationType {
  APPROVAL_REQUEST = 'approval_request',
  APPROVAL_APPROVED = 'approval_approved',
  APPROVAL_REJECTED = 'approval_rejected',
  APPROVAL_INFO_REQUESTED = 'approval_info_requested',
  SIGN_REQUEST = 'sign_request',
  SIGN_COMPLETED = 'sign_completed',
  WORKFLOW_COMPLETED = 'workflow_completed',
  DOCUMENT_SHARED = 'document_shared',
  DOCUMENT_COMMENTED = 'document_commented',
  DOCUMENT_ATTACHMENT_ADDED = 'document_attachment_added',
  DOCUMENT_EXPIRING = 'document_expiring',
  DOCUMENT_EXPIRED = 'document_expired',
}

export interface CreateNotificationData {
  tenantId: number;
  userId: number;
  type: NotificationType;
  title: string;
  message?: string;
  link?: string;
}

export interface NotificationListOptions {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}
