import { Router } from 'express';
import { resetUsage } from '../../controllers/admin.controller';
import { validateAdminKey } from '../../middleware/auth.middleware';

const router = Router();

// POST /v1/admin/reset-usage - Reset usage statistics
router.post('/reset-usage', validateAdminKey, resetUsage);

export default router; 