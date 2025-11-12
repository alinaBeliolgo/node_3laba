import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getUserById, getUserWithPasswordByLogin, createUser } from '../model/user.js';

const JWT_SECRET = process.env.JWT_SECRET_KEY || process.env.JWT_SECRET || 'dev-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

export function register(req, res, next) {
  try {
    const { username, email, password, role } = req.body;

    if (!username || username.length < 3 || username.length > 50) {
      const err = new Error('Имя пользователя должно быть от 3 до 50 символов');
      err.statusCode = 400; throw err;
    }
    if (!email || email.length > 100 || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
      const err = new Error('Некорректный email');
      err.statusCode = 400; throw err;
    }
    if (!password || password.length < 6) {
      const err = new Error('Пароль должен быть минимум 6 символов');
      err.statusCode = 400; throw err;
    }

    const passwordHash = bcrypt.hashSync(password, 10);

    try {
      const user = createUser({ username: username.trim(), email: email.trim(), passwordHash, role: role === 'admin' ? 'admin' : 'user' });
      res.status(201).json({ data: user });
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        error.statusCode = 409;
        error.message = 'Пользователь с таким username или email уже существует';
      }
      throw error;
    }
  } catch (error) { next(error); }
}

export function login(req, res, next) {
  try {
    const { login, password } = req.body; // login может быть username или email
    if (!login || !password) {
      const err = new Error('Требуются поля login и password');
      err.statusCode = 400; throw err;
    }

    const userRow = getUserWithPasswordByLogin(login.trim());
    if (!userRow) {
      const err = new Error('Неверные учетные данные');
      err.statusCode = 401; throw err;
    }

    const ok = bcrypt.compareSync(password, userRow.password);
    if (!ok) {
      const err = new Error('Неверные учетные данные');
      err.statusCode = 401; throw err;
    }

    const token = jwt.sign({ userId: userRow.id, username: userRow.username, role: userRow.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    res.json({ token });
  } catch (error) { next(error); }
}

export function profile(req, res, next) {
  try {
    if (!req.user) {
      const err = new Error('Не авторизован');
      err.statusCode = 401; throw err;
    }
    const user = getUserById(req.user.userId);
    res.json({ data: user });
  } catch (error) { next(error); }
}
