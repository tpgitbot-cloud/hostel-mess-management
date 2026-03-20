import express from 'express';
import multer from 'multer';
import { studentLogin, adminLogin, changePassword, studentSignup } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ dest: '/tmp' });

router.post('/student-login', studentLogin);
router.post('/student-signup', studentSignup);
router.post('/admin-login', adminLogin);
router.post('/change-password', protect, changePassword);

export default router;
