import { Router } from 'express';
import { numberingController } from './numbering.controller';
import { authGuard } from '../auth/auth.middleware';
import { requirePermission } from '../../middleware/permission';

const router = Router();

router.use(authGuard);

router.get('/', requirePermission('settings', 'read'), numberingController.getAllNumberingRules);
router.get('/:documentTypeId', requirePermission('settings', 'read'), numberingController.getNumberingRule);
router.post('/', requirePermission('settings', 'update'), numberingController.createNumberingRule);
router.put('/:id', requirePermission('settings', 'update'), numberingController.updateNumberingRule);
router.post('/generate', requirePermission('documents', 'create'), numberingController.generateNumber);
router.post('/preview', requirePermission('settings', 'read'), numberingController.previewNumber);

export default router;
