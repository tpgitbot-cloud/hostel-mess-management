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

export const getMealTimeRestriction = (mealType, settings) => {
  if (settings && settings.mealTimes && settings.mealTimes[mealType]) {
    return settings.mealTimes[mealType];
  }
  const defaultRestrictions = {
    BREAKFAST: { start: 7, end: 9 },
    LUNCH: { start: 12, end: 14 },
    DINNER: { start: 19, end: 21 },
  };
  return defaultRestrictions[mealType];
};

export const isWithinMealTime = (mealType, settings, date = new Date()) => {
  const restriction = getMealTimeRestriction(mealType, settings);
  if (!restriction) return false;

  const istDate = getISTDate(date);
  const hour = istDate.getHours();
  return hour >= restriction.start && hour < restriction.end;
};

export const isThursday = (settings, date = new Date()) => {
  const istDate = getISTDate(date);
  const eggDay = (settings && settings.eggDay !== undefined) ? settings.eggDay : 4;
  return istDate.getDay() === eggDay;
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
