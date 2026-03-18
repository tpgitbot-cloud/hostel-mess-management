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

    const student = await Student.findOne({ registerNumber }).select('+password');
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

    const admin = await Admin.findOne({ email }).select('+password');
    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isPasswordMatch = await admin.matchPassword(password);
    if (!isPasswordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(admin._id, 'admin');
    res.status(200).json({
      message: 'Admin login successful',
      token,
      admin: admin.toJSON(),
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

    const student = await Student.findById(req.user.id).select('+password');
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const isPasswordMatch = await student.matchPassword(currentPassword);
    if (!isPasswordMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    student.password = newPassword;
    await student.save();

    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export default { studentLogin, adminLogin, changePassword };
