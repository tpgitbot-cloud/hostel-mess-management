import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../utils/api';
import { saveUser } from '../utils/auth';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export const ActivateAccount = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    registerNumber: '',
    mobile: '',
  });

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value.toUpperCase().trim(),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.registerNumber || !formData.mobile) {
      toast.error('All fields are required');
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.activateAccount(formData.registerNumber, formData.mobile);
      // Update student object with isFirstLogin info
      const student = {
        ...response.data.student,
        isFirstLogin: response.data.isFirstLogin
      };
      saveUser(student, response.data.token);
      
      // Also store as a separate flag for backward compatibility
      localStorage.setItem('isFirstLogin', 'true');

      toast.success('Account activated! Welcome to the mess portal.');
      
      // Move to dashboard where they will be forced to change password
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Activation failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8 overflow-hidden relative">
          {/* Header Decoration */}
          <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>
          
          <div className="text-center mb-8">
            <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">🚀</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-800">Activate Account</h1>
            <p className="text-gray-500 mt-2">Verify your student records to start using the portal</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Register Number</label>
              <input
                type="text"
                name="registerNumber"
                value={formData.registerNumber}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none transition uppercase"
                placeholder="Ex: CSE001"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">Mobile Number</label>
              <input
                type="tel"
                name="mobile"
                value={formData.mobile}
                onChange={(e) => setFormData({...formData, mobile: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none transition"
                placeholder="Enter registered mobile"
                maxLength={10}
                required
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transform hover:-translate-y-1 transition-all shadow-lg disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify & Activate Account'}
              </button>
            </div>

            <div className="text-center pt-2">
              <p className="text-gray-600">
                Facing issues?{' '}
                <Link to="/login" className="text-blue-600 font-bold hover:underline">
                  Back to Login
                </Link>
              </p>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100">
            <p className="text-xs text-center text-gray-400 leading-relaxed">
              Note: Only students pre-registered by the admin can activate their accounts. If your registration is pending, please contact the Hostel office.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivateAccount;
