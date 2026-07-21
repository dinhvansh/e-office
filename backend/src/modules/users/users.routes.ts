import { Router } from 'express';
import { usersController } from './users.controller';
import { authGuard } from '../auth/auth.middleware';
import { requirePermission } from '../../middleware/permission';

const router = Router();

router.use(authGuard);

// Public routes (authenticated users)
router.get('/profile', usersController.getProfile);
router.patch('/profile', usersController.updateProfile);
router.get('/profile/avatar', usersController.getAvatar);
router.post('/profile/avatar', usersController.uploadAvatar);
router.delete('/profile/avatar', usersController.deleteAvatar);
router.get('/profile/signature', usersController.getSignature);
router.post('/profile/signature', usersController.uploadSignature);
router.delete('/profile/signature', usersController.deleteSignature);
router.post('/change-password', usersController.changePassword);
router.get('/directory', usersController.getDirectoryUsers);

// Admin routes (require permissions)
router.get('/', requirePermission('users', 'read'), usersController.getUsers);
router.get('/active', requirePermission('users', 'read'), usersController.getActiveUsers); // ✅ NEW: Active users only
router.get('/stats', requirePermission('users', 'read'), usersController.getUserStats);
router.get('/:id', requirePermission('users', 'read'), usersController.getUserById);
router.post('/', requirePermission('users', 'create'), usersController.createUser);
router.put('/:id', requirePermission('users', 'update'), usersController.updateUser);
router.delete('/:id', requirePermission('users', 'delete'), usersController.deleteUser);

export default router;
