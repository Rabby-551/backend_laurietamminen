import express from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import {
  getAdminAlertDetail,
  getAdminAlerts,
  getAdminUsers,
  toggleAdminUserActive,
  updateAdminAlertStatus,
} from '../controllers/admin.controller.js';

const router = express.Router();

router.use(protect, restrictTo('admin'));

router.get('/alerts', getAdminAlerts);
router.get('/alerts/:id', getAdminAlertDetail);
router.patch('/alerts/:id/status', updateAdminAlertStatus);
router.get('/users', getAdminUsers);
router.patch('/users/:id/toggle-active', toggleAdminUserActive);

export default router;
