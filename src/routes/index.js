import express from 'express';
import httpStatus from 'http-status';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import stepsRoutes from './steps.routes.js';
import activityRoutes from './activity.routes.js';
import alertRoutes from './alert.routes.js';

const router = express.Router();

router.get('/health', (req, res) => {
  res.status(httpStatus.OK).json({
    success: true,
    message: 'Steps Journey backend is running',
  });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/steps', stepsRoutes);
router.use('/activities', activityRoutes);
router.use('/alerts', alertRoutes);

export default router;
