import { Router } from 'express';
import { documentTypesController } from './documentTypes.controller';
import { authGuard } from '../auth/auth.middleware';
import { requireAnyPermission, requirePermission } from '../../middleware/permission';

const router = Router();

router.use(authGuard);

router.get('/', requireAnyPermission(['document_types', 'read'], ['documents', 'read']), documentTypesController.getDocumentTypes);
router.get('/stats', requireAnyPermission(['document_types', 'read'], ['documents', 'read']), documentTypesController.getStats);
router.get('/:id', requireAnyPermission(['document_types', 'read'], ['documents', 'read']), documentTypesController.getDocumentTypeById);
router.post('/', requireAnyPermission(['document_types', 'create'], ['settings', 'update']), documentTypesController.createDocumentType);
router.put('/:id', requireAnyPermission(['document_types', 'update'], ['settings', 'update']), documentTypesController.updateDocumentType);
router.delete('/:id', requireAnyPermission(['document_types', 'delete'], ['settings', 'update']), documentTypesController.deleteDocumentType);

export default router;
