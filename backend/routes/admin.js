import express from 'express';
import multer from 'multer';
import {
  addStudent,
  uploadStudentsCSV,
  getStudents,
  updateStudent,
  deleteStudent,
  addStaff,
  getStaff,
  deleteStaff,
  getMealStatus,
  getMealStats,
  getEggStats,
  setPrices,
  getPrices,
} from '../controllers/adminController.js';
import { protect, adminOnly, masterAdminOnly } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ dest: '/tmp' });

// All admin routes require authentication and admin/staff role
router.use(protect, adminOnly);

// Student management
router.post('/add-student', upload.single('photo'), addStudent);
router.post('/upload-csv', upload.single('file'), uploadStudentsCSV);
router.get('/students', getStudents);
router.put('/student/:id', upload.single('photo'), updateStudent);
router.delete('/student/:id', deleteStudent);

// Staff management (Master Admin only)
router.post('/add-staff', masterAdminOnly, addStaff);
router.get('/staff', masterAdminOnly, getStaff);
router.delete('/staff/:id', masterAdminOnly, deleteStaff);

// Meal status (who ate / who didn't)
router.get('/meal-status', getMealStatus);

// Stats
router.get('/stats/meals', getMealStats);
router.get('/stats/eggs', getEggStats);

// Prices
router.post('/prices', setPrices);
router.get('/prices/current', getPrices);

export default router;
