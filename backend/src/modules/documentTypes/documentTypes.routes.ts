import { Router } from 'express';
import { documentTypesController } from './documentTypes.controller';
import { authGuard } from '../auth/auth.middleware';
import { requirePermission } from '../../middleware/permission';

const router = Router();

router.use(authGuard);

router.get('/', requirePermission('documents', 'read'), documentTypesController.getDocumentTypes);
router.get('/stats', requirePermission('documents', 'read'), documentTypesController.getStats);
router.get('/:id', requirePermission('documents', 'read'), documentTypesController.getDocumentTypeById);
router.post('/', requirePermission('settings', 'update'), documentTypesController.createDocumentType);
router.put('/:id', requirePermission('settings', 'update'), documentTypesController.updateDocumentType);
router.delete('/:id', requirePermission('settings', 'update'), documentTypesController.deleteDocumentType);

export default router;
