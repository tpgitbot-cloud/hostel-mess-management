import express from 'express';
import { scanMeal, scanEgg } from '../controllers/scanController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/meal', protect, scanMeal);
router.post('/egg', protect, scanEgg);

export default router;
