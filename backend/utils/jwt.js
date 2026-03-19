import jwt from 'jsonwebtoken';

export const generateToken = (id, role = 'student', hostel = null) => {
  const payload = { id, role };
  if (hostel) payload.hostel = hostel;
  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
  return token;
};

export const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (error) {
    throw new Error('Invalid token');
  }
};

export default { generateToken, verifyToken };
