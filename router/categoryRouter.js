import express from 'express'
import * as categoryController from '../controller/categoryController.js'
import { authRequired, requirePermission } from '../middleware/auth.js'

const router = express.Router()

router.get('/', authRequired, categoryController.listCategories)
router.post('/', authRequired, requirePermission('CATEGORY_CREATE'), categoryController.createCategory)

router.get('/:id', authRequired, categoryController.getCategory)
router.put('/:id', authRequired, requirePermission('CATEGORY_UPDATE'), categoryController.updateCategory)
router.delete('/:id', authRequired, requirePermission('CATEGORY_DELETE'), categoryController.deleteCategory)

export default router