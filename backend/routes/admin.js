import express from 'express';
import multer from 'multer';
import {
  addStudent,
  uploadStudentsCSV,
  getStudents,
  updateStudent,
  deleteStudent,
  getMealStats,
  getEggStats,
  setPrices,
  getPrices,
} from '../controllers/adminController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ dest: '/tmp' });

// All admin routes require authentication and admin role
router.use(protect, adminOnly);

router.post('/add-student', upload.single('photo'), addStudent);
router.post('/upload-csv', upload.single('file'), uploadStudentsCSV);
router.get('/students', getStudents);
router.put('/student/:id', upload.single('photo'), updateStudent);
router.delete('/student/:id', deleteStudent);
router.get('/stats/meals', getMealStats);
router.get('/stats/eggs', getEggStats);
router.post('/prices', setPrices);
router.get('/prices/current', getPrices);

export default router;
