import express from 'express'
import * as todoController from '../controller/todoController.js'
import { authRequired, isOwnerOrAdmin, requirePermission } from '../middleware/auth.js'

const router = express.Router()

router.get('/', authRequired, todoController.listTodos)
router.post('/', authRequired, requirePermission('TODO_CREATE'), todoController.createTodo)

router.get('/:id', authRequired, isOwnerOrAdmin, todoController.getTodo)
router.put('/:id', authRequired, requirePermission('TODO_UPDATE'), isOwnerOrAdmin, todoController.updateTodo)
router.delete('/:id', authRequired, requirePermission('TODO_DELETE'), isOwnerOrAdmin, todoController.deleteTodo)
router.patch('/:id/toggle', authRequired, requirePermission('TODO_UPDATE'), isOwnerOrAdmin, todoController.toggleTodo)
export default router