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

export const getMealTimeRestriction = (mealType) => {
  const restrictions = {
    BREAKFAST: { start: 7, end: 9 }, // 7 AM to 9 AM
    LUNCH: { start: 12, end: 14 }, // 12 PM to 2 PM
    DINNER: { start: 19, end: 21 }, // 7 PM to 9 PM
  };
  return restrictions[mealType];
};

export const isWithinMealTime = (mealType, date = new Date()) => {
  const restriction = getMealTimeRestriction(mealType);
  if (!restriction) return false;

  const hour = date.getHours();
  return hour >= restriction.start && hour < restriction.end;
};

export const isThursday = (date = new Date()) => {
  return date.getDay() === 4; // Thursday is 4 (0 is Sunday)
};

export default {
  validateEmail,
  validateMobileNumber,
  validateRegisterNumber,
  validatePassword,
  getMealTimeRestriction,
  isWithinMealTime,
  isThursday,
};
