import Meal from '../models/Meal.js';
import Egg from '../models/Egg.js';
import Student from '../models/Student.js';
import Settings from '../models/Settings.js';
import { isWithinMealTime, isThursday, getISTDate, getMealTimeRestriction } from '../utils/validation.js';

export const scanMeal = async (req, res) => {
  try {
    const { mealType, studentId } = req.body;

    if (!mealType || !studentId) {
      return res.status(400).json({ error: 'Meal type and student ID are required' });
    }

    if (!['BREAKFAST', 'LUNCH', 'DINNER'].includes(mealType)) {
      return res.status(400).json({ error: 'Invalid meal type' });
    }

    // Check authorization: Student can only scan for self, Admin/Staff can scan for anyone
    const isStaff = ['admin', 'master_admin'].includes(req.user?.role);
    if (!isStaff && req.user?.id !== studentId) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    // Check if student exists and is active
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (!student.isActive) {
      return res.status(403).json({ error: 'Student account is inactive' });
    }

    // Check meal time restrictions using dynamic settings
    const settings = await Settings.findOne();
    if (!isWithinMealTime(mealType, settings)) {
      const restriction = getMealTimeRestriction(mealType, settings);
      return res.status(400).json({
        error: `${mealType} can only be scanned between ${restriction.start}-${restriction.end} IST`,
      });
    }

    // Get today's date at midnight in IST
    const istNow = getISTDate();
    const today = new Date(istNow.getFullYear(), istNow.getMonth(), istNow.getDate());

    // Check if meal already exists for today
    const existingMeal = await Meal.findOne({
      studentId,
      date: today,
      mealType,
    });

    if (existingMeal) {
      return res.status(409).json({ error: 'Meal already scanned for today' });
    }

    // Create new meal entry
    const meal = new Meal({
      studentId,
      date: today,
      mealType,
    });

    await meal.save();

    res.status(201).json({
      message: `${mealType} scanned successfully`,
      meal,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const scanEgg = async (req, res) => {
  try {
    const { studentId } = req.body;

    if (!studentId) {
      return res.status(400).json({ error: 'Student ID is required' });
    }

    // Check authorization: Student can only scan for self, Admin/Staff can scan for anyone
    const isStaff = ['admin', 'master_admin'].includes(req.user?.role);
    if (!isStaff && req.user?.id !== studentId) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    // Check if student exists and is active
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (!student.isActive) {
      return res.status(403).json({ error: 'Student account is inactive' });
    }

    // Check if today is the designated egg day using dynamic settings
    const settings = await Settings.findOne();
    if (!isThursday(settings)) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const eggDayIndex = settings?.eggDay ?? 4;
      return res.status(400).json({ error: `Eggs are only distributed on ${days[eggDayIndex]}` });
    }

    // Get today's date at midnight in IST
    const istNow = getISTDate();
    const today = new Date(istNow.getFullYear(), istNow.getMonth(), istNow.getDate());

    // Check if egg already scanned for this week
    const existingEgg = await Egg.findOne({
      studentId,
      date: today,
    });

    if (existingEgg) {
      return res.status(409).json({ error: 'Egg already scanned today' });
    }

    // Create new egg entry
    const egg = new Egg({
      studentId,
      date: today,
    });

    await egg.save();

    res.status(201).json({
      message: 'Egg scanned successfully',
      egg,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export default { scanMeal, scanEgg };
