import { Router } from 'express';
import { settingsController } from './settings.controller';
import { authGuard } from '../auth/auth.middleware';
import { requirePermission } from '../../middleware/permission';

const router = Router();

// All routes require authentication
router.use(authGuard);

// Email config routes (admin only)
router.get('/email', requirePermission('settings', 'manage'), settingsController.getEmailConfig);
router.post('/email', requirePermission('settings', 'manage'), settingsController.saveEmailConfig);
router.post('/email/test', requirePermission('settings', 'manage'), settingsController.testEmail);

// Watermark config routes (admin only)
router.get('/watermark', requirePermission('settings', 'manage'), settingsController.getWatermarkConfig);
router.post('/watermark', requirePermission('settings', 'manage'), settingsController.saveWatermarkConfig);

// Document type policy routes
router.get('/document-type-policy/:documentTypeId', requirePermission('settings', 'manage'), settingsController.getDocumentTypePolicy);
router.post('/document-type-policy/:documentTypeId', requirePermission('settings', 'manage'), settingsController.saveDocumentTypePolicy);
router.delete('/document-type-policy/:documentTypeId', requirePermission('settings', 'manage'), settingsController.deleteDocumentTypePolicy);

// Get all settings
router.get('/', requirePermission('settings', 'manage'), settingsController.getAllSettings);

export default router;
