import express from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import { createActivity, getActivities } from '../controllers/activity.controller.js';

const router = express.Router();

router.use(protect, restrictTo('user', 'client'));

router.post('/', createActivity);
router.get('/', getActivities);

export default router;
