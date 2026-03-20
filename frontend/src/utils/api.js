import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  studentLogin: (registerNumber, password) =>
    api.post('/auth/student-login', { registerNumber, password }),
  studentSignup: (formData) =>
    api.post('/auth/student-signup', formData),
  adminLogin: (email, password) =>
    api.post('/auth/admin-login', { email, password }),
  changePassword: (currentPassword, newPassword) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
};

export const scanAPI = {
  scanMeal: (mealType, studentId) =>
    api.post('/scan/meal', { mealType, studentId }),
  scanEgg: (studentId) =>
    api.post('/scan/egg', { studentId }),
};

export const billAPI = {
  getStudentBill: (studentId) =>
    api.get(`/bill/${studentId}`),
};

export const adminAPI = {
  // Student management
  addStudent: (formData) =>
    api.post('/admin/add-student', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  uploadCSV: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/admin/upload-csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getStudents: (params) =>
    api.get('/admin/students', { params }),
  updateStudent: (id, formData) =>
    api.put(`/admin/student/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deleteStudent: (id) =>
    api.delete(`/admin/student/${id}`),

  // Staff management
  addStaff: (data) =>
    api.post('/admin/add-staff', data),
  getStaff: () =>
    api.get('/admin/staff'),
  deleteStaff: (id) =>
    api.delete(`/admin/staff/${id}`),

  // Meal status
  getMealStatus: (params) =>
    api.get('/admin/meal-status', { params }),

  // Stats
  getMealStats: (params) =>
    api.get('/admin/stats/meals', { params }),
  getEggStats: (params) =>
    api.get('/admin/stats/eggs', { params }),

  // Prices
  setPrices: (breakfast, lunch, dinner) =>
    api.post('/admin/prices', { breakfast, lunch, dinner }),
  getPrices: () =>
    api.get('/admin/prices/current'),
};

export const faceAPI = {
  registerFace: (faceDescriptor) =>
    api.post('/face/register', { faceDescriptor }),
  faceLogin: (faceDescriptor) =>
    api.post('/face/login', { faceDescriptor }),
  checkFaceStatus: () =>
    api.get('/face/status'),
  faceScanMeal: (faceDescriptor, mealType) =>
    api.post('/face/scan-meal', { faceDescriptor, mealType }),
};

export default api;
