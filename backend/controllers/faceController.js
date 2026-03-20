import Student from '../models/Student.js';
import { generateToken } from '../utils/jwt.js';

/**
 * Calculate Euclidean distance between two face descriptors
 */
const euclideanDistance = (desc1, desc2) => {
  if (desc1.length !== desc2.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < desc1.length; i++) {
    sum += (desc1[i] - desc2[i]) ** 2;
  }
  return Math.sqrt(sum);
};

// Threshold for face match (lower = stricter)
const FACE_MATCH_THRESHOLD = 0.6;

/**
 * Register face descriptor for a student
 * Called after first login when student captures their face
 */
export const registerFace = async (req, res) => {
  try {
    const { faceDescriptor } = req.body;
    const studentId = req.user?.id;

    if (!studentId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!faceDescriptor || !Array.isArray(faceDescriptor) || faceDescriptor.length !== 128) {
      return res.status(400).json({
        error: 'Invalid face descriptor. Must be an array of 128 numbers.',
      });
    }

    // Validate all values are numbers
    if (!faceDescriptor.every((v) => typeof v === 'number' && !isNaN(v))) {
      return res.status(400).json({ error: 'Face descriptor must contain only valid numbers' });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (!student.isActive) {
      return res.status(403).json({ error: 'Account is inactive' });
    }

    // Store the face descriptor
    student.faceDescriptor = faceDescriptor;
    student.faceRegistered = true;
    await student.save();

    res.status(200).json({
      message: 'Face registered successfully! You can now use face login.',
      faceRegistered: true,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Login using face recognition
 * Compares submitted descriptor against all stored descriptors
 */
export const faceLogin = async (req, res) => {
  try {
    const { faceDescriptor } = req.body;

    if (!faceDescriptor || !Array.isArray(faceDescriptor) || faceDescriptor.length !== 128) {
      return res.status(400).json({
        error: 'Invalid face descriptor. Must be an array of 128 numbers.',
      });
    }

    // Find all students with registered faces
    const students = await Student.find({
      faceRegistered: true,
      isActive: true,
    }).select('+faceDescriptor');

    if (students.length === 0) {
      return res.status(404).json({ error: 'No face registrations found. Please login with password first and register your face.' });
    }

    // Find the best match
    let bestMatch = null;
    let bestDistance = Infinity;

    for (const student of students) {
      if (!student.faceDescriptor || student.faceDescriptor.length !== 128) continue;

      const distance = euclideanDistance(faceDescriptor, student.faceDescriptor);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestMatch = student;
      }
    }

    if (!bestMatch || bestDistance > FACE_MATCH_THRESHOLD) {
      return res.status(401).json({
        error: 'Face not recognized. Please try again or login with password.',
        distance: bestDistance,
      });
    }

    // Generate JWT token
    const token = generateToken(bestMatch._id, 'student');

    res.status(200).json({
      message: 'Face login successful!',
      token,
      student: bestMatch.toJSON(),
      isFirstLogin: bestMatch.isFirstLogin,
      matchConfidence: Math.max(0, Math.round((1 - bestDistance / FACE_MATCH_THRESHOLD) * 100)),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Scan meal using face (for staff/admin scanning students)
 * Identifies student by face, then marks their meal
 */
export const faceScanMeal = async (req, res) => {
  try {
    const { faceDescriptor, mealType } = req.body;

    if (!mealType || !['BREAKFAST', 'LUNCH', 'DINNER'].includes(mealType)) {
      return res.status(400).json({ error: 'Valid meal type is required (BREAKFAST, LUNCH, DINNER)' });
    }

    if (!faceDescriptor || !Array.isArray(faceDescriptor) || faceDescriptor.length !== 128) {
      return res.status(400).json({ error: 'Invalid face descriptor' });
    }

    // Find matching student
    const students = await Student.find({
      faceRegistered: true,
      isActive: true,
    }).select('+faceDescriptor');

    let bestMatch = null;
    let bestDistance = Infinity;

    for (const student of students) {
      if (!student.faceDescriptor || student.faceDescriptor.length !== 128) continue;
      const distance = euclideanDistance(faceDescriptor, student.faceDescriptor);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestMatch = student;
      }
    }

    if (!bestMatch || bestDistance > FACE_MATCH_THRESHOLD) {
      return res.status(401).json({ error: 'Face not recognized' });
    }

    res.status(200).json({
      message: 'Student identified successfully',
      student: bestMatch.toJSON(),
      matchConfidence: Math.max(0, Math.round((1 - bestDistance / FACE_MATCH_THRESHOLD) * 100)),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Check if a student has face registered
 */
export const checkFaceStatus = async (req, res) => {
  try {
    const studentId = req.user?.id;
    if (!studentId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.status(200).json({
      faceRegistered: student.faceRegistered || false,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export default { registerFace, faceLogin, faceScanMeal, checkFaceStatus };
