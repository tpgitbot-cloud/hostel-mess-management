import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../utils/api';
import { saveUser } from '../utils/auth';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export const Login = () => {
  const [isStudent, setIsStudent] = useState(true);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [studentForm, setStudentForm] = useState({
    registerNumber: '',
    password: '',
  });

  const [adminForm, setAdminForm] = useState({
    email: '',
    password: '',
  });

  const handleStudentChange = (e) => {
    setStudentForm({ ...studentForm, [e.target.name]: e.target.value });
  };

  const handleAdminChange = (e) => {
    setAdminForm({ ...adminForm, [e.target.name]: e.target.value });
  };

  const handleStudentLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authAPI.studentLogin(
        studentForm.registerNumber,
        studentForm.password
      );
      saveUser(response.data.student, response.data.token);
      toast.success('Login successful!');
      setTimeout(() => navigate('/dashboard'), 1000);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authAPI.adminLogin(adminForm.email, adminForm.password);
      saveUser(response.data.admin, response.data.token);
      toast.success('Admin login successful!');
      setTimeout(() => navigate('/admin/dashboard'), 1000);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center p-4">
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-2xl p-8">
          <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
            🏫 Hostel Mess Management
          </h1>

          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setIsStudent(true)}
              className={`flex-1 py-2 rounded-lg font-semibold transition ${
                isStudent
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Student
            </button>
            <button
              onClick={() => setIsStudent(false)}
              className={`flex-1 py-2 rounded-lg font-semibold transition ${
                !isStudent
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Admin
            </button>
          </div>

          {isStudent ? (
            <form onSubmit={handleStudentLogin}>
              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-2">
                  Register Number
                </label>
                <input
                  type="text"
                  name="registerNumber"
                  value={studentForm.registerNumber}
                  onChange={handleStudentChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="e.g., CSE001"
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-gray-700 font-semibold mb-2">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={studentForm.password}
                  onChange={handleStudentChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="Enter password"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {loading ? 'Logging in...' : 'Student Login'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleAdminLogin}>
              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={adminForm.email}
                  onChange={handleAdminChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="admin@hostel.com"
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-gray-700 font-semibold mb-2">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={adminForm.password}
                  onChange={handleAdminChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="Enter password"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {loading ? 'Logging in...' : 'Admin Login'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
