import express from 'express';
import httpStatus from 'http-status';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';

const router = express.Router();

router.get('/health', (req, res) => {
  res.status(httpStatus.OK).json({
    success: true,
    message: 'Steps Journey backend is running',
  });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);

export default router;
