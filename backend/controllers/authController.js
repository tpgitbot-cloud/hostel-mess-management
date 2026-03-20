import Student from '../models/Student.js';
import Admin from '../models/Admin.js';
import { generateToken } from '../utils/jwt.js';
import { validatePassword } from '../utils/validation.js';

export const studentLogin = async (req, res) => {
  try {
    const { registerNumber, password } = req.body;

    if (!registerNumber || !password) {
      return res.status(400).json({ error: 'Register number and password are required' });
    }

    const student = await Student.findOne({ registerNumber: registerNumber.toUpperCase() }).select('+password');
    if (!student) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isPasswordMatch = await student.matchPassword(password);
    if (!isPasswordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!student.isActive) {
      return res.status(403).json({ error: 'Account is inactive' });
    }

    const token = generateToken(student._id, 'student');
    res.status(200).json({
      message: 'Login successful',
      token,
      student: student.toJSON(),
      isFirstLogin: student.isFirstLogin,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() }).select('+password');
    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!admin.isActive) {
      return res.status(403).json({ error: 'Account is inactive' });
    }

    const isPasswordMatch = await admin.matchPassword(password);
    if (!isPasswordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(admin._id, admin.role, admin.hostel);
    res.status(200).json({
      message: 'Admin login successful',
      token,
      admin: admin.toJSON(),
      isFirstLogin: admin.isFirstLogin,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    if (!validatePassword(newPassword)) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const role = req.user?.role;

    if (role === 'student') {
      const student = await Student.findById(req.user.id).select('+password');
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      const isPasswordMatch = await student.matchPassword(currentPassword);
      if (!isPasswordMatch) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      student.password = newPassword;
      student.isFirstLogin = false;
      await student.save();

      return res.status(200).json({ message: 'Password changed successfully' });
    }

    if (role === 'master_admin' || role === 'staff') {
      const admin = await Admin.findById(req.user.id).select('+password');
      if (!admin) {
        return res.status(404).json({ error: 'Admin not found' });
      }

      const isPasswordMatch = await admin.matchPassword(currentPassword);
      if (!isPasswordMatch) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      admin.password = newPassword;
      admin.isFirstLogin = false;
      await admin.save();

      return res.status(200).json({ message: 'Password changed successfully' });
    }

    return res.status(400).json({ error: 'Invalid role' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const studentSignup = async (req, res) => {
  try {
    const { name, registerNumber, password, department, year, hostel, mobile, email } = req.body;

    if (!name || !registerNumber || !password || !department || !year || !hostel || !mobile) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existingStudent = await Student.findOne({ registerNumber: registerNumber.toUpperCase() });
    if (existingStudent) {
      if (!existingStudent.isActive) {
        // If an inactive record exists, replace it
        await Student.findByIdAndDelete(existingStudent._id);
      } else {
        return res.status(409).json({ error: 'Student with this register number already exists' });
      }
    }

    const student = new Student({
      name,
      registerNumber: registerNumber.toUpperCase(),
      password,
      department,
      year: parseInt(year),
      hostel,
      mobile,
      email: email?.toLowerCase(),
      isFirstLogin: false, // Student set their own password during signup
    });

    await student.save();

    const token = generateToken(student._id, 'student');
    res.status(201).json({
      message: 'Signup successful!',
      token,
      student: student.toJSON(),
      isFirstLogin: false,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export default { studentLogin, adminLogin, changePassword, studentSignup };
