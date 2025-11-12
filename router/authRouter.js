import express from 'express';
import * as authController from '../controller/authController.js';
import { authRequired } from '../middleware/auth.js';

const router = express.Router();

// POST /api/auth/register
router.post('/register', authController.register);

// POST /api/auth/login
router.post('/login', authController.login);

// GET /api/auth/profile
router.get('/profile', authRequired, authController.profile);

export default router;
