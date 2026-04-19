import express from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import {
  confirmSteps,
  getTodaySteps,
  getWeeklySteps,
} from '../controllers/steps.controller.js';

const router = express.Router();

router.use(protect, restrictTo('user', 'client'));

router.post('/confirm', confirmSteps);
router.get('/today', getTodaySteps);
router.get('/weekly', getWeeklySteps);

export default router;
