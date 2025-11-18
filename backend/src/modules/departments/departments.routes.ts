import { Router } from 'express';
import { departmentsController } from './departments.controller';
import { authGuard } from '../auth/auth.middleware';

const router = Router();

router.use(authGuard);

router.get('/', departmentsController.getDepartments);
router.get('/tree', departmentsController.getDepartmentTree);
router.get('/:id', departmentsController.getDepartmentById);
router.post('/', departmentsController.createDepartment);
router.put('/:id', departmentsController.updateDepartment);
router.delete('/:id', departmentsController.deleteDepartment);

export default router;
