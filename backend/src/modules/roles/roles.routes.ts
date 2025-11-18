import { Router } from 'express';
import { rolesController } from './roles.controller';
import { authGuard } from '../auth/auth.middleware';

const router = Router();

router.use(authGuard);

router.get('/', rolesController.getRoles);
router.get('/permissions', rolesController.getAllPermissions);
router.get('/my-permissions', rolesController.getUserPermissions);
router.get('/:id', rolesController.getRoleById);
router.post('/', rolesController.createRole);
router.put('/:id', rolesController.updateRole);
router.delete('/:id', rolesController.deleteRole);

export default router;
