export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateMobileNumber = (mobile) => {
  const mobileRegex = /^[0-9]{10}$/;
  return mobileRegex.test(mobile);
};

export const validateRegisterNumber = (registerNumber) => {
  return registerNumber && registerNumber.length > 0;
};

export const validatePassword = (password) => {
  return password && password.length >= 6;
};

// Convert any date to IST (UTC+5:30)
export const getISTDate = (date = new Date()) => {
  const istOffset = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in ms
  const utcTime = date.getTime() + date.getTimezoneOffset() * 60 * 1000;
  return new Date(utcTime + istOffset);
};

export const getMealTimeRestriction = (mealType) => {
  const restrictions = {
    BREAKFAST: { start: 7, end: 9 }, // 7 AM to 9 AM IST
    LUNCH: { start: 12, end: 14 }, // 12 PM to 2 PM IST
    DINNER: { start: 19, end: 21 }, // 7 PM to 9 PM IST
  };
  return restrictions[mealType];
};

export const isWithinMealTime = (mealType, date = new Date()) => {
  const restriction = getMealTimeRestriction(mealType);
  if (!restriction) return false;

  // Use IST time, not server's UTC time
  const istDate = getISTDate(date);
  const hour = istDate.getHours();
  return hour >= restriction.start && hour < restriction.end;
};

export const isThursday = (date = new Date()) => {
  // Use IST time for Thursday check
  const istDate = getISTDate(date);
  return istDate.getDay() === 4; // Thursday is 4 (0 is Sunday)
};

export default {
  validateEmail,
  validateMobileNumber,
  validateRegisterNumber,
  validatePassword,
  getISTDate,
  getMealTimeRestriction,
  isWithinMealTime,
  isThursday,
};
