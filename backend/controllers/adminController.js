import Student from '../models/Student.js';
import Meal from '../models/Meal.js';
import Egg from '../models/Egg.js';
import Price from '../models/Price.js';
import cloudinary from '../config/cloudinary.js';
import fs from 'fs';

export const addStudent = async (req, res) => {
  try {
    const { name, registerNumber, department, year, mobile, email, password } = req.body;

    // Validation
    if (!name || !registerNumber || !department || !year || !mobile || !password) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    // Check if student already exists
    const existingStudent = await Student.findOne({ registerNumber });
    if (existingStudent) {
      return res.status(409).json({ error: 'Student with this register number already exists' });
    }

    // Handle photo upload if provided
    let photoUrl = null;
    if (req.file) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path);
        photoUrl = result.secure_url;
        fs.unlinkSync(req.file.path); // Delete temp file
      } catch (uploadError) {
        return res.status(500).json({ error: 'Photo upload failed' });
      }
    }

    const student = new Student({
      name,
      registerNumber: registerNumber.toUpperCase(),
      department,
      year: parseInt(year),
      mobile,
      email,
      photo: photoUrl,
      password,
    });

    await student.save();

    res.status(201).json({
      message: 'Student added successfully',
      student: student.toJSON(),
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
    const results = [];
    const errors = [];
    let successCount = 0;

    // Parse CSV
    const fs = await import('fs').then((module) => module.default);
    const CSV = await import('csv-parser').then((module) => module.default);

    const readStream = fs.createReadStream(filePath);
    const records = [];

    readStream
      .pipe(CSV())
      .on('data', (row) => records.push(row))
      .on('end', async () => {
        for (const row of records) {
          try {
            const { name, registerNumber, department, year, mobile, email, password } = row;

            if (!name || !registerNumber || !department || !year || !mobile) {
              errors.push({ row, error: 'Missing required fields' });
              continue;
            }

            const existingStudent = await Student.findOne({
              registerNumber: registerNumber.toUpperCase(),
            });
            if (existingStudent) {
              errors.push({ row, error: 'Duplicate register number' });
              continue;
            }

            const student = new Student({
              name,
              registerNumber: registerNumber.toUpperCase(),
              department,
              year: parseInt(year),
              mobile,
              email,
              password: password || 'defaultPassword123',
            });

            await student.save();
            successCount++;
          } catch (error) {
            errors.push({ row, error: error.message });
          }
        }

        fs.unlinkSync(filePath);

        res.status(200).json({
          message: `${successCount} students imported successfully`,
          successCount,
          errors,
        });
      });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getStudents = async (req, res) => {
  try {
    const { search, department, year, page = 1, limit = 20 } = req.query;

    const filter = { isActive: true };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { registerNumber: { $regex: search, $options: 'i' } },
      ];
    }

    if (department) {
      filter.department = department;
    }

    if (year) {
      filter.year = parseInt(year);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const students = await Student.find(filter)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

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
    const { name, department, year, mobile, email } = req.body;

    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (name) student.name = name;
    if (department) student.department = department;
    if (year) student.year = year;
    if (mobile) student.mobile = mobile;
    if (email) student.email = email;

    if (req.file) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path);
        student.photo = result.secure_url;
        import('fs').then((module) => module.default.unlinkSync(req.file.path));
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

    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Soft delete: mark as inactive
    student.isActive = false;
    await student.save();

    res.status(200).json({ message: 'Student deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getMealStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();

    const meals = await Meal.find({
      date: { $gte: start, $lte: end },
    });

    const stats = {
      breakfast: meals.filter((m) => m.mealType === 'BREAKFAST').length,
      lunch: meals.filter((m) => m.mealType === 'LUNCH').length,
      dinner: meals.filter((m) => m.mealType === 'DINNER').length,
      total: meals.length,
    };

    res.status(200).json({
      period: { start, end },
      stats,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getEggStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();

    const eggs = await Egg.find({
      date: { $gte: start, $lte: end },
    });

    res.status(200).json({
      period: { start, end },
      eggCount: eggs.length,
      eggs,
    });
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

    res.status(201).json({
      message: 'Prices set successfully',
      price,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getPrices = async (req, res) => {
  try {
    const price = await Price.findOne().sort({ createdAt: -1 });

    if (!price) {
      return res.status(404).json({ error: 'Prices not configured' });
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
  getMealStats,
  getEggStats,
  setPrices,
  getPrices,
};
