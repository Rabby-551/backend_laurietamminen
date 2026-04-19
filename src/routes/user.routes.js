import express from 'express';
import protect from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import {
  changePassword,
  getProfile,
  updateProfile,
  updateStepGoal,
} from '../controllers/user.controller.js';

const router = express.Router();

router.use(protect);

router.get('/profile', getProfile);
router.patch('/profile', upload.single('profile_picture'), updateProfile);
router.patch('/step-goal', updateStepGoal);
router.patch('/change-password', changePassword);

export default router;
