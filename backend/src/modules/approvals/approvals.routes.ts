import { Router } from 'express';
import { approvalsController } from './approvals.controller';
import { authGuard } from '../auth/auth.middleware';
import { requirePermission } from '../../middleware/permission';
import { asyncHandler } from '../../core/utils/asyncHandler';

const router = Router();

router.use(authGuard);

// List all approvals
router.get(
  '/',
  requirePermission('approvals', 'read'),
  asyncHandler(approvalsController.list)
);

// Get my pending approvals (MUST be before /:id)
router.get(
  '/my-pending',
  requirePermission('approvals', 'read'),
  asyncHandler(approvalsController.getMyPending)
);

// Get my combined tasks (approvals + signing) (MUST be before /:id)
router.get(
  '/my-tasks',
  requirePermission('approvals', 'read'),
  asyncHandler(approvalsController.getMyCombinedTasks)
);

// Get document approvals (MUST be before /:id)
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

// Submit document for approval
router.post(
  '/submit',
  requirePermission('documents', 'update'),
  asyncHandler(approvalsController.submit)
);

// Approval actions
router.get(
  '/:id/comments',
  requirePermission('approvals', 'read'),
  asyncHandler(approvalsController.listComments)
);

router.post(
  '/:id/comments',
  requirePermission('approvals', 'update'),
  asyncHandler(approvalsController.addComment)
);

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

router.get(
  '/:id/document/view',
  requirePermission('approvals', 'read'),
  asyncHandler(approvalsController.viewDocument)
);

router.get(
  '/:id/document/download',
  requirePermission('approvals', 'read'),
  asyncHandler(approvalsController.downloadDocument)
);

// Get approval by ID (MUST be last among GET routes)
router.get(
  '/:id',
  requirePermission('approvals', 'read'),
  asyncHandler(approvalsController.getById)
);

export default router;
