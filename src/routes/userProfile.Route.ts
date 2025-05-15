import { Router } from 'express';
import {
  upsertProfile,
  getProfile,
  deleteProfile,
} from '../controllers/userProfile.Controller';

const router = Router();

// Create or update current user's profile
router.post('/', upsertProfile);

// Get a user's profile
router.get('/:userId', getProfile);

// Delete a user's profile
router.delete('/:userId', deleteProfile);

export default router;