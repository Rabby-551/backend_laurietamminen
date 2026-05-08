import express from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import {
  getAdminAlertDetail,
  getAdminAlerts,
  getAdminUsers,
  getAdminStats,
  getAdminUserGrowth,
  toggleAdminUserActive,
  updateAdminAlertStatus,
} from '../controllers/admin.controller.js';

const router = express.Router();

router.use(protect, restrictTo('admin'));

router.get('/stats', getAdminStats);
router.get('/user-growth', getAdminUserGrowth);
router.get('/alerts', getAdminAlerts);
router.get('/alerts/:id', getAdminAlertDetail);
router.patch('/alerts/:id/status', updateAdminAlertStatus);
router.get('/users', getAdminUsers);
router.patch('/users/:id/toggle-active', toggleAdminUserActive);

export default router;
