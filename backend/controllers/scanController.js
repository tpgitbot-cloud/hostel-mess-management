import Meal from '../models/Meal.js';
import Egg from '../models/Egg.js';
import Student from '../models/Student.js';
import { isWithinMealTime, isThursday } from '../utils/validation.js';

export const scanMeal = async (req, res) => {
  try {
    const { mealType, studentId } = req.body;

    if (!mealType || !studentId) {
      return res.status(400).json({ error: 'Meal type and student ID are required' });
    }

    if (!['BREAKFAST', 'LUNCH', 'DINNER'].includes(mealType)) {
      return res.status(400).json({ error: 'Invalid meal type' });
    }

    // Check if user is authenticated
    const authStudentId = req.user?.id;
    if (!authStudentId || authStudentId !== studentId) {
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

    // Check meal time restrictions
    if (!isWithinMealTime(mealType)) {
      const times = {
        BREAKFAST: '7-9 AM',
        LUNCH: '12-2 PM',
        DINNER: '7-9 PM',
      };
      return res.status(400).json({
        error: `${mealType} can only be scanned between ${times[mealType]}`,
      });
    }

    // Get today's date at midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);

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

    // Check if user is authenticated
    const authStudentId = req.user?.id;
    if (!authStudentId || authStudentId !== studentId) {
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

    // Check if today is Thursday
    if (!isThursday()) {
      return res.status(400).json({ error: 'Eggs are only distributed on Thursday' });
    }

    // Get today's date at midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);

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
