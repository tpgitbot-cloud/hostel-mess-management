import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../utils/api';
import { saveUser } from '../utils/auth';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const DEPARTMENTS = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT'];
const YEARS = [1, 2, 3, 4];
const HOSTELS = ['B1', 'B2', 'B3', 'G1', 'G2'];

export const Signup = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    registerNumber: '',
    password: '',
    confirmPassword: '',
    department: 'CSE',
    year: 1,
    hostel: 'B1',
    mobile: '',
    email: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'year' ? parseInt(value) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (!/^\d{10}$/.test(formData.mobile)) {
      toast.error('Invalid mobile number (10 digits required)');
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.studentSignup(formData);
      saveUser(response.data.student, response.data.token);
      localStorage.setItem('isFirstLogin', 'false');

      toast.success('Signup successful! Next: Face Registration.');
      // Direct move to face registration after signup
      setTimeout(() => navigate('/face-registration'), 1500);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center p-4">
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800">🎓 Student Signup</h1>
            <p className="text-gray-500 mt-2">Create your account to start tracking your mess meals</p>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-gray-700 font-semibold mb-2">Full Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                placeholder="Ex: Gokul S"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">Register Number *</label>
              <input
                type="text"
                name="registerNumber"
                value={formData.registerNumber}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none uppercase"
                placeholder="Ex: CSE001"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">Mobile Number *</label>
              <input
                type="tel"
                name="mobile"
                value={formData.mobile}
                onChange={handleChange}
                maxLength={10}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                placeholder="10 digit number"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">Department *</label>
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                required
              >
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">Year *</label>
              <select
                name="year"
                value={formData.year}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                required
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y} Year</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">Hostel *</label>
              <select
                name="hostel"
                value={formData.hostel}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                required
              >
                {HOSTELS.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                placeholder="Ex: gokul@example.com"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">Password *</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                placeholder="Min 6 characters"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">Confirm Password *</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                placeholder="Confirm password"
                required
              />
            </div>

            <div className="md:col-span-2 mt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {loading ? 'Creating Account...' : '🚀 Sign Up & Continue'}
              </button>
            </div>

            <div className="md:col-span-2 text-center mt-4">
              <p className="text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="text-blue-600 font-bold hover:underline">
                  Login here
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Signup;
