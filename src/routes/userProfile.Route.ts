import { Router } from 'express';
import {
  upsertProfile,
  getProfile,
  deleteProfile,
  incrementInviteCount,
} from '../controllers/userProfile.Controller';

const router = Router();

// Create or update current user's profile
router.post('/', upsertProfile);

// Get a user's profile
router.get('/:userId', getProfile);

// Delete a user's profile
router.delete('/:userId', deleteProfile);

// Increment invite count
router.post('/increment-invite/:userId', incrementInviteCount);

export default router;