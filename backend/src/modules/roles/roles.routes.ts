import { Router } from 'express';
import { rolesController } from './roles.controller';
import { authGuard } from '../auth/auth.middleware';
import { requirePermission } from '../../middleware/permission';

const router = Router();

router.use(authGuard);

router.get('/', requirePermission('roles', 'read'), rolesController.getRoles);
router.get('/permissions', requirePermission('roles', 'read'), rolesController.getAllPermissions);
router.get('/my-permissions', rolesController.getUserPermissions);
router.get('/:id/users', requirePermission('roles', 'read'), rolesController.getRoleUsers);
router.get('/:id', requirePermission('roles', 'read'), rolesController.getRoleById);
router.post('/', requirePermission('roles', 'create'), rolesController.createRole);
router.put('/:id', requirePermission('roles', 'update'), rolesController.updateRole);
router.delete('/:id', requirePermission('roles', 'delete'), rolesController.deleteRole);
router.delete('/:id/permissions/:permissionId', requirePermission('roles', 'update'), rolesController.removePermission);

export default router;
