import { Router } from 'express';
import { positionsController } from './positions.controller';
import { requirePermission } from '../../middleware/permission';
import { authGuard } from '../auth/auth.middleware';

const router = Router();

router.use(authGuard);

router.get('/', requirePermission('positions', 'read'), positionsController.getPositions);
router.get('/stats', requirePermission('positions', 'read'), positionsController.getStats);
router.get('/:id', requirePermission('positions', 'read'), positionsController.getPositionById);
router.post('/', requirePermission('positions', 'create'), positionsController.createPosition);
router.put('/:id', requirePermission('positions', 'update'), positionsController.updatePosition);
router.delete('/:id', requirePermission('positions', 'delete'), positionsController.deletePosition);

export default router;
