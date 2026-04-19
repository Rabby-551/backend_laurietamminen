import express from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import {
  triggerAlert,
  updateAlertLocation,
  updateAlertStatus,
} from '../controllers/alert.controller.js';

const router = express.Router();

router.post('/trigger', protect, restrictTo('client'), triggerAlert);
router.patch('/:id/location-update', protect, restrictTo('client'), updateAlertLocation);
router.patch('/:id/status', protect, restrictTo('admin'), updateAlertStatus);

export default router;
