import express from 'express';
import { getStudentBill, getDailyMealCount } from '../controllers/billController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/:studentId', protect, getStudentBill);
router.get('/daily/count', getDailyMealCount);

export default router;
