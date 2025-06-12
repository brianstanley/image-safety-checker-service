import { Router } from 'express';
import { resetUsage } from '../controllers/admin.controller';
import { validateAdminKey } from '../middleware/auth.middleware';

const router = Router();

router.post('/reset-usage', validateAdminKey, resetUsage);

export const adminRoutes = router; 