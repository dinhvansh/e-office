import { Router } from 'express';
import { approvalsController } from './approvals.controller';
import { authGuard } from '../auth/auth.middleware';
import { requirePermission } from '../../middleware/permission';
import { asyncHandler } from '../../core/utils/asyncHandler';

const router = Router();

router.use(authGuard);

// Submit document for approval
router.post(
  '/submit',
  requirePermission('documents', 'update'),
  asyncHandler(approvalsController.submit)
);

// Approval actions
router.post(
  '/:id/approve',
  requirePermission('approvals', 'update'),
  asyncHandler(approvalsController.approve)
);

router.post(
  '/:id/reject',
  requirePermission('approvals', 'update'),
  asyncHandler(approvalsController.reject)
);

router.post(
  '/:id/request-info',
  requirePermission('approvals', 'update'),
  asyncHandler(approvalsController.requestInfo)
);

// Get approvals
router.get(
  '/my-pending',
  requirePermission('approvals', 'read'),
  asyncHandler(approvalsController.getMyPending)
);

router.get(
  '/document/:documentId',
  requirePermission('documents', 'read'),
  asyncHandler(approvalsController.getDocumentApprovals)
);

router.get(
  '/document/:documentId/workflow',
  requirePermission('documents', 'read'),
  asyncHandler(approvalsController.getWorkflowInstance)
);

export default router;
