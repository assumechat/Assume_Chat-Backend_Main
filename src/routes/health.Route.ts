import { Router } from 'express';
import { getHealth } from '../controllers/health.Controller';

const router = Router();
router.get('/', getHealth);
export default router;