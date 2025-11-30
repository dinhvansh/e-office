import { Router } from 'express';
import { usersController } from './users.controller';
import { authGuard } from '../auth/auth.middleware';
import { requirePermission } from '../../middleware/permission';
import { registrationController } from '../auth/registration.controller';

const router = Router();

router.use(authGuard);

// Public routes (authenticated users)
router.get('/profile', usersController.getProfile);
router.post('/change-password', usersController.changePassword);

// Admin routes (require permissions)
router.get('/', requirePermission('users', 'read'), usersController.getUsers);
router.get('/active', requirePermission('users', 'read'), usersController.getActiveUsers); // ✅ NEW: Active users only
router.get('/pending', requirePermission('users', 'read'), registrationController.getPendingUsers.bind(registrationController));
router.get('/stats', requirePermission('users', 'read'), usersController.getUserStats);
router.get('/:id', requirePermission('users', 'read'), usersController.getUserById);
router.post('/', requirePermission('users', 'create'), usersController.createUser);
router.post('/:id/approve', requirePermission('users', 'update'), registrationController.approveUser.bind(registrationController));
router.post('/:id/reject', requirePermission('users', 'update'), registrationController.rejectUser.bind(registrationController));
router.put('/:id', requirePermission('users', 'update'), usersController.updateUser);
router.delete('/:id', requirePermission('users', 'delete'), usersController.deleteUser);

export default router;
