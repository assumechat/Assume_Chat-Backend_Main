import { Router } from 'express';
import { getHealth } from '../controllers/health';

const router = Router();
router.get('/', getHealth);
export default router;
