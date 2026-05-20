import { Router } from 'express';
import { documentFlowController } from './documentFlow.controller';
import { authGuard } from '../auth/auth.middleware';
import { requirePermission } from '../../middleware/permission';
import { requireDocumentAccess } from '../../middleware/document-access';
import { asyncHandler } from '../../core/utils/asyncHandler';

const router = Router();

// All routes require authentication
router.use(authGuard);

/**
 * GET /api/v1/documents/:id/flow
 * Get unified flow data (approval + signing)
 * Note: Document visibility is checked in service layer
 */
router.get(
  '/:id/flow',
  requirePermission('documents', 'read'),
  requireDocumentAccess('read'),
  asyncHandler(documentFlowController.getDocumentFlow)
);

export default router;
