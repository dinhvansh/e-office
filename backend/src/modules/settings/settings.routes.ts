import { Router } from 'express';
import { settingsController } from './settings.controller';
import { authGuard } from '../auth/auth.middleware';
import { requirePermission } from '../../middleware/permission';

const router = Router();

// All routes require authentication
router.use(authGuard);

// Email config routes
router.get('/email', requirePermission('settings', 'read'), settingsController.getEmailConfig);
router.post('/email', requirePermission('settings', 'update'), settingsController.saveEmailConfig);
router.post('/email/test', requirePermission('settings', 'update'), settingsController.testEmail);

// Watermark config routes
router.get('/watermark', requirePermission('settings', 'read'), settingsController.getWatermarkConfig);
router.post('/watermark', requirePermission('settings', 'update'), settingsController.saveWatermarkConfig);

// Document type policy routes
router.get('/document-type-policy/:documentTypeId', requirePermission('document_types', 'read'), settingsController.getDocumentTypePolicy);
router.post('/document-type-policy/:documentTypeId', requirePermission('document_types', 'update'), settingsController.saveDocumentTypePolicy);
router.delete('/document-type-policy/:documentTypeId', requirePermission('document_types', 'update'), settingsController.deleteDocumentTypePolicy);

// Get all settings
router.get('/', requirePermission('settings', 'read'), settingsController.getAllSettings);

export default router;
