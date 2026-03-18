import Meal from '../models/Meal.js';
import Student from '../models/Student.js';
import Price from '../models/Price.js';

export const getStudentBill = async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!studentId) {
      return res.status(400).json({ error: 'Student ID is required' });
    }

    // Check if user is authenticated
    const authStudentId = req.user?.id;
    if (!authStudentId || authStudentId !== studentId) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    // Check if student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Get current month's meals
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const meals = await Meal.find({
      studentId,
      date: { $gte: startOfMonth, $lte: endOfMonth },
    });

    // Count meals by type
    const mealCount = {
      breakfast: meals.filter((m) => m.mealType === 'BREAKFAST').length,
      lunch: meals.filter((m) => m.mealType === 'LUNCH').length,
      dinner: meals.filter((m) => m.mealType === 'DINNER').length,
    };

    // Get latest prices
    const latestPrice = await Price.findOne().sort({ createdAt: -1 });

    if (!latestPrice) {
      return res.status(404).json({ error: 'Price configuration not found' });
    }

    // Calculate bill
    const totalBill =
      mealCount.breakfast * latestPrice.breakfast +
      mealCount.lunch * latestPrice.lunch +
      mealCount.dinner * latestPrice.dinner;

    res.status(200).json({
      studentId,
      studentName: student.name,
      month: startOfMonth.toLocaleString('default', { month: 'long', year: 'numeric' }),
      mealCount,
      prices: {
        breakfast: latestPrice.breakfast,
        lunch: latestPrice.lunch,
        dinner: latestPrice.dinner,
      },
      totalBill,
      meals: meals.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getDailyMealCount = async (req, res) => {
  try {
    const { date } = req.query;

    const queryDate = new Date(date || new Date());
    queryDate.setHours(0, 0, 0, 0);

    const meals = await Meal.find({
      date: queryDate,
    });

    const mealCount = {
      breakfast: meals.filter((m) => m.mealType === 'BREAKFAST').length,
      lunch: meals.filter((m) => m.mealType === 'LUNCH').length,
      dinner: meals.filter((m) => m.mealType === 'DINNER').length,
      total: meals.length,
    };

    res.status(200).json({
      date: queryDate,
      ...mealCount,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export default { getStudentBill, getDailyMealCount };
