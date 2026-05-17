import { Router } from 'express';
import { departmentsController } from './departments.controller';
import { authGuard } from '../auth/auth.middleware';
import { requirePermission } from '../../middleware/permission';

const router = Router();

router.use(authGuard);

router.get('/', requirePermission('departments', 'read'), departmentsController.getDepartments);
router.get('/tree', requirePermission('departments', 'read'), departmentsController.getDepartmentTree);
router.get('/:id', requirePermission('departments', 'read'), departmentsController.getDepartmentById);
router.post('/', requirePermission('departments', 'create'), departmentsController.createDepartment);
router.put('/:id', requirePermission('departments', 'update'), departmentsController.updateDepartment);
router.delete('/:id', requirePermission('departments', 'delete'), departmentsController.deleteDepartment);

export default router;
