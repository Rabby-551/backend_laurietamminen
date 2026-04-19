import express from 'express';
import protect from '../middleware/auth.js';
import {
  forgotPassword,
  login,
  logout,
  refreshToken,
  register,
  resetPassword,
  verifyOtp,
} from '../controllers/auth.controller.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', resetPassword);
router.post('/refresh-token', refreshToken);
router.post('/logout', protect, logout);

export default router;
