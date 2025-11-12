import jwt from 'jsonwebtoken';
import * as todoModel from '../model/todo.js';
import { userHasPermission } from '../model/rbac.js';

const JWT_SECRET = process.env.JWT_SECRET_KEY || process.env.JWT_SECRET || 'dev-secret';

export function authRequired(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [type, token] = header.split(' ');
    if (type !== 'Bearer' || !token) {
      const err = new Error('Требуется токен авторизации');
      err.statusCode = 401; throw err;
    }
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { userId: payload.userId, username: payload.username, role: payload.role };
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      error.statusCode = 401;
      error.message = 'Недействительный или просроченный токен';
    }
    next(error);
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role === 'admin') return next();
  const err = new Error('Недостаточно прав');
  err.statusCode = 403;
  next(err);
}

// Alias, чтобы соответствовать формулировке "isAdmin"
export const isAdmin = requireAdmin;

// Проверка: владелец ресурса (todo) или администратор
export async function isOwnerOrAdmin(req, res, next) {
  try {
    if (req.user?.role === 'admin') return next();
    const id = req.params.id;
    const todo = todoModel.getTodoById(id);
    if (!todo) {
      const err = new Error('Todo not found');
      err.statusCode = 404; throw err;
    }
    if (todo.owner_id !== req.user?.userId) {
      const err = new Error('Недостаточно прав');
      err.statusCode = 403; throw err;
    }
    next();
  } catch (error) {
    next(error);
  }
}

// Проверка конкретного permission-кода из RBAC
export function requirePermission(permissionCode) {
  return (req, res, next) => {
    try {
      if (req.user?.role === 'admin') return next();
      const ok = userHasPermission(req.user?.userId, permissionCode);
      if (ok) return next();
      const err = new Error('Недостаточно прав');
      err.statusCode = 403; throw err;
    } catch (error) {
      next(error);
    }
  };
}
