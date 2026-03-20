import express from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController.js';
import { auth, isAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/', getSettings);
router.put('/', auth, isAdmin, updateSettings);

export default router;
