import Student from '../models/Student.js';
import Admin from '../models/Admin.js';
import Meal from '../models/Meal.js';
import Egg from '../models/Egg.js';
import Price from '../models/Price.js';
import cloudinary from '../config/cloudinary.js';
import fs from 'fs';
import { generatePassword } from '../utils/passwordGenerator.js';
import { getISTDate } from '../utils/validation.js';

// Helper: get hostel filter for staff
const getHostelFilter = (user) => {
  if (user.role === 'master_admin' || user.hostel === 'ALL') return {};
  return { hostel: user.hostel };
};

// ===== STUDENT MANAGEMENT =====

export const addStudent = async (req, res) => {
  try {
    const { name, registerNumber, department, year, mobile, email, hostel } = req.body;

    if (!name || !registerNumber || !department || !year || !mobile || !hostel) {
      return res.status(400).json({ error: 'All required fields must be provided (including hostel)' });
    }

    // Validate hostel
    if (!['B1', 'B2', 'B3', 'G1', 'G2'].includes(hostel)) {
      return res.status(400).json({ error: 'Invalid hostel. Must be B1, B2, B3, G1, or G2' });
    }

    // Staff can only add students to their own hostel
    if (req.user.role === 'staff' && req.user.hostel !== 'ALL' && req.user.hostel !== hostel) {
      return res.status(403).json({ error: 'You can only add students to your assigned hostel' });
    }

    const existingStudent = await Student.findOne({ registerNumber: registerNumber.toUpperCase() });
    if (existingStudent) {
      if (!existingStudent.isActive) {
        // Permanently remove the old inactive record so it can be re-added
        await Student.findByIdAndDelete(existingStudent._id);
      } else {
        return res.status(409).json({ error: 'Student with this register number already exists' });
      }
    }

    // Auto-generate password
    const autoPassword = generatePassword(8);

    // Handle photo upload
    let photoUrl = null;
    if (req.file) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path);
        photoUrl = result.secure_url;
        fs.unlinkSync(req.file.path);
      } catch (uploadError) {
        return res.status(500).json({ error: 'Photo upload failed' });
      }
    }

    const student = new Student({
      name,
      registerNumber: registerNumber.toUpperCase(),
      department,
      year: parseInt(year),
      hostel,
      mobile,
      email,
      photo: photoUrl,
      password: autoPassword,
      isFirstLogin: true,
    });

    await student.save();

    res.status(201).json({
      message: 'Student added successfully',
      student: student.toJSON(),
      generatedPassword: autoPassword, // Show once for admin to note down
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const uploadStudentsCSV = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const filePath = req.file.path;
    const errors = [];
    let successCount = 0;
    const addedStudents = [];

    const fsModule = await import('fs').then((m) => m.default);
    const CSV = await import('csv-parser').then((m) => m.default);
    const readStream = fsModule.createReadStream(filePath);
    const records = [];

    readStream
      .pipe(CSV())
      .on('data', (row) => records.push(row))
      .on('end', async () => {
        for (const row of records) {
          try {
            const { name, registerNumber, department, year, mobile, email, hostel } = row;

            if (!name || !registerNumber || !department || !year || !mobile || !hostel) {
              errors.push({ row, error: 'Missing required fields (name, registerNumber, department, year, mobile, hostel)' });
              continue;
            }

            if (!['B1', 'B2', 'B3', 'G1', 'G2'].includes(hostel.toUpperCase())) {
              errors.push({ row, error: 'Invalid hostel' });
              continue;
            }

            const existing = await Student.findOne({ registerNumber: registerNumber.toUpperCase() });
            if (existing) {
              if (!existing.isActive) {
                await Student.findByIdAndDelete(existing._id);
              } else {
                errors.push({ row, error: 'Duplicate register number' });
                continue;
              }
            }

            const autoPassword = generatePassword(8);

            const student = new Student({
              name,
              registerNumber: registerNumber.toUpperCase(),
              department,
              year: parseInt(year),
              hostel: hostel.toUpperCase(),
              mobile,
              email,
              password: autoPassword,
              isFirstLogin: true,
            });

            await student.save();
            successCount++;
            addedStudents.push({
              name,
              registerNumber: registerNumber.toUpperCase(),
              password: autoPassword,
            });
          } catch (error) {
            errors.push({ row, error: error.message });
          }
        }

        fsModule.unlinkSync(filePath);

        res.status(200).json({
          message: `${successCount} students imported successfully`,
          successCount,
          addedStudents,
          errors,
        });
      });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getStudents = async (req, res) => {
  try {
    const { search, department, year, hostel, page = 1, limit = 200 } = req.query;

    const filter = { isActive: true, ...getHostelFilter(req.user) };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { registerNumber: { $regex: search, $options: 'i' } },
      ];
    }
    if (department) filter.department = department;
    if (year) filter.year = parseInt(year);
    if (hostel && (req.user.role === 'master_admin' || req.user.hostel === 'ALL')) {
      filter.hostel = hostel;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const students = await Student.find(filter)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ hostel: 1, department: 1, name: 1 });

    const total = await Student.countDocuments(filter);

    res.status(200).json({
      students,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, department, year, mobile, email, hostel } = req.body;

    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (name) student.name = name;
    if (department) student.department = department;
    if (year) student.year = year;
    if (mobile) student.mobile = mobile;
    if (email) student.email = email;
    if (hostel && ['B1', 'B2', 'B3', 'G1', 'G2'].includes(hostel)) student.hostel = hostel;

    if (req.file) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path);
        student.photo = result.secure_url;
        import('fs').then((m) => m.default.unlinkSync(req.file.path));
      } catch (uploadError) {
        return res.status(500).json({ error: 'Photo upload failed' });
      }
    }

    await student.save();

    res.status(200).json({
      message: 'Student updated successfully',
      student: student.toJSON(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await Student.findByIdAndDelete(id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.status(200).json({ message: 'Student deleted permanently' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ===== STAFF MANAGEMENT (Master Admin Only) =====

export const addStaff = async (req, res) => {
  try {
    const { name, email, hostel } = req.body;

    if (!name || !email || !hostel) {
      return res.status(400).json({ error: 'Name, email, and hostel are required' });
    }

    if (!['B1', 'B2', 'B3', 'G1', 'G2'].includes(hostel)) {
      return res.status(400).json({ error: 'Invalid hostel. Must be B1, B2, B3, G1, or G2' });
    }

    const existing = await Admin.findOne({ email: email.toLowerCase() });
    if (existing) {
      if (!existing.isActive) {
        // Permanently remove the old inactive record so it can be re-added
        await Admin.findByIdAndDelete(existing._id);
      } else {
        return res.status(409).json({ error: 'Staff with this email already exists' });
      }
    }

    const autoPassword = generatePassword(8);

    const staff = new Admin({
      name,
      email: email.toLowerCase(),
      password: autoPassword,
      role: 'staff',
      hostel,
      isFirstLogin: true,
    });

    await staff.save();

    res.status(201).json({
      message: 'Staff added successfully',
      staff: staff.toJSON(),
      generatedPassword: autoPassword,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getStaff = async (req, res) => {
  try {
    const staff = await Admin.find({ role: 'staff', isActive: true }).sort({ hostel: 1 });
    res.status(200).json({ staff });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const staff = await Admin.findById(id);
    if (!staff || staff.role === 'master_admin') {
      return res.status(404).json({ error: 'Staff not found' });
    }
    await Admin.findByIdAndDelete(id);
    res.status(200).json({ message: 'Staff removed permanently' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ===== MEAL STATUS (Who ate / Who didn't) =====

export const getMealStatus = async (req, res) => {
  try {
    const { date, department, hostel: filterHostel, year } = req.query;

    const istNow = getISTDate();
    const queryDate = date ? new Date(date) : new Date(istNow.getFullYear(), istNow.getMonth(), istNow.getDate());

    // Get students filtered by hostel
    const studentFilter = { isActive: true, ...getHostelFilter(req.user) };
    if (department) studentFilter.department = department;
    if (year) studentFilter.year = parseInt(year);
    if (filterHostel && (req.user.role === 'master_admin' || req.user.hostel === 'ALL')) {
      studentFilter.hostel = filterHostel;
    }

    const students = await Student.find(studentFilter).sort({ hostel: 1, department: 1, name: 1 });

    // Get all meals for the date
    const meals = await Meal.find({ date: queryDate });
    const mealMap = {};
    meals.forEach((m) => {
      if (!mealMap[m.studentId.toString()]) {
        mealMap[m.studentId.toString()] = {};
      }
      mealMap[m.studentId.toString()][m.mealType] = true;
    });

    // Build status for each student
    const status = students.map((s) => {
      const sid = s._id.toString();
      const studentMeals = mealMap[sid] || {};
      return {
        _id: s._id,
        name: s.name,
        registerNumber: s.registerNumber,
        department: s.department,
        year: s.year,
        hostel: s.hostel,
        breakfast: !!studentMeals.BREAKFAST,
        lunch: !!studentMeals.LUNCH,
        dinner: !!studentMeals.DINNER,
        totalMeals: (studentMeals.BREAKFAST ? 1 : 0) + (studentMeals.LUNCH ? 1 : 0) + (studentMeals.DINNER ? 1 : 0),
      };
    });

    // Summary counts
    const summary = {
      total: students.length,
      breakfast: { ate: status.filter((s) => s.breakfast).length, notAte: status.filter((s) => !s.breakfast).length },
      lunch: { ate: status.filter((s) => s.lunch).length, notAte: status.filter((s) => !s.lunch).length },
      dinner: { ate: status.filter((s) => s.dinner).length, notAte: status.filter((s) => !s.dinner).length },
    };

    res.status(200).json({
      date: queryDate,
      summary,
      students: status,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ===== STATS & PRICES =====

export const getMealStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();

    // Filter meals by hostel's students
    const hostelFilter = getHostelFilter(req.user);
    let studentIds = null;
    if (Object.keys(hostelFilter).length > 0) {
      const students = await Student.find({ ...hostelFilter, isActive: true }).select('_id');
      studentIds = students.map((s) => s._id);
    }

    const mealFilter = { date: { $gte: start, $lte: end } };
    if (studentIds) mealFilter.studentId = { $in: studentIds };

    const meals = await Meal.find(mealFilter);

    const stats = {
      breakfast: meals.filter((m) => m.mealType === 'BREAKFAST').length,
      lunch: meals.filter((m) => m.mealType === 'LUNCH').length,
      dinner: meals.filter((m) => m.mealType === 'DINNER').length,
      total: meals.length,
    };

    res.status(200).json({ period: { start, end }, stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getEggStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();

    const hostelFilter = getHostelFilter(req.user);
    let studentIds = null;
    if (Object.keys(hostelFilter).length > 0) {
      const students = await Student.find({ ...hostelFilter, isActive: true }).select('_id');
      studentIds = students.map((s) => s._id);
    }

    const eggFilter = { date: { $gte: start, $lte: end } };
    if (studentIds) eggFilter.studentId = { $in: studentIds };

    const eggs = await Egg.find(eggFilter);

    res.status(200).json({ period: { start, end }, eggCount: eggs.length, eggs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const setPrices = async (req, res) => {
  try {
    const { breakfast, lunch, dinner } = req.body;
    if (breakfast === undefined || lunch === undefined || dinner === undefined) {
      return res.status(400).json({ error: 'All prices must be provided' });
    }
    const price = new Price({
      breakfast: parseFloat(breakfast),
      lunch: parseFloat(lunch),
      dinner: parseFloat(dinner),
    });
    await price.save();
    res.status(201).json({ message: 'Prices set successfully', price });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getPrices = async (req, res) => {
  try {
    const price = await Price.findOne().sort({ createdAt: -1 });
    if (!price) {
      return res.status(200).json({ breakfast: 0, lunch: 0, dinner: 0, _default: true });
    }
    res.status(200).json(price);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export default {
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
};
