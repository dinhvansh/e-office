import { Router } from 'express';
import { workflowsController } from './workflows.controller';
import { authGuard } from '../auth/auth.middleware';
import { requirePermission } from '../../middleware/permission';
import { asyncHandler } from '../../core/utils/asyncHandler';

const router = Router();

router.use(authGuard);

// Workflows
router.get(
  '/',
  requirePermission('workflows', 'read'),
  asyncHandler(workflowsController.list)
);

router.get(
  '/approvers',
  requirePermission('workflows', 'read'),
  asyncHandler(workflowsController.getAvailableApprovers)
);

router.get(
  '/:id',
  requirePermission('workflows', 'read'),
  asyncHandler(workflowsController.getById)
);

router.post(
  '/',
  requirePermission('workflows', 'create'),
  asyncHandler(workflowsController.create)
);

router.put(
  '/:id',
  requirePermission('workflows', 'update'),
  asyncHandler(workflowsController.update)
);

router.delete(
  '/:id',
  requirePermission('workflows', 'delete'),
  asyncHandler(workflowsController.delete)
);

// Workflow Steps
router.get(
  '/:id/steps',
  requirePermission('workflows', 'read'),
  asyncHandler(workflowsController.getSteps)
);

router.post(
  '/:id/steps',
  requirePermission('workflows', 'update'),
  asyncHandler(workflowsController.createStep)
);

router.put(
  '/steps/:stepId',
  requirePermission('workflows', 'update'),
  asyncHandler(workflowsController.updateStep)
);

router.delete(
  '/steps/:stepId',
  requirePermission('workflows', 'delete'),
  asyncHandler(workflowsController.deleteStep)
);

router.post(
  '/:id/steps/reorder',
  requirePermission('workflows', 'update'),
  asyncHandler(workflowsController.reorderSteps)
);

export default router;
