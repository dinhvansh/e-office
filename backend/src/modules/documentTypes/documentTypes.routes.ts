import { Router } from 'express';
import { documentTypesController } from './documentTypes.controller';
import { authGuard } from '../auth/auth.middleware';
import { requireAnyPermission, requirePermission } from '../../middleware/permission';

const router = Router();

router.use(authGuard);

router.get('/', requireAnyPermission(['document_types', 'read'], ['documents', 'read']), documentTypesController.getDocumentTypes);
router.get('/stats', requireAnyPermission(['document_types', 'read'], ['documents', 'read']), documentTypesController.getStats);
router.get('/:id', requireAnyPermission(['document_types', 'read'], ['documents', 'read']), documentTypesController.getDocumentTypeById);
router.post('/', requirePermission('document_types', 'create'), documentTypesController.createDocumentType);
router.put('/:id', requirePermission('document_types', 'update'), documentTypesController.updateDocumentType);
router.delete('/:id', requirePermission('document_types', 'delete'), documentTypesController.deleteDocumentType);

export default router;
