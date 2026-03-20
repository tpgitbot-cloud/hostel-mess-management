import express from 'express';
import { registerFace, faceLogin, faceScanMeal, checkFaceStatus } from '../controllers/faceController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Public - no auth needed for face login
router.post('/login', faceLogin);

// Protected - auth needed for registration and status check
router.post('/register', protect, registerFace);
router.get('/status', protect, checkFaceStatus);

// Protected - face scan for meal identification
router.post('/scan-meal', protect, faceScanMeal);

export default router;
