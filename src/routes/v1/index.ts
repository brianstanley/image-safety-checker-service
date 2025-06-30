import { Router } from 'express';
import imageRoutes from './image.routes';
import adminRoutes from './admin.routes';

const router = Router();

// V1 API Routes
router.use('/images', imageRoutes);
router.use('/admin', adminRoutes);

export default router; 