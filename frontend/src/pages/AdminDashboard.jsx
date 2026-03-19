import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../utils/api';
import { clearAuth, getStoredUser } from '../utils/auth';
import { toast, ToastContainer } from 'react-toastify';

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [students, setStudents] = useState([]);
  const [mealStats, setMealStats] = useState(null);
  const [eggStats, setEggStats] = useState(null);
  const [prices, setPrices] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [newStudent, setNewStudent] = useState({
    name: '',
    registerNumber: '',
    department: 'CSE',
    year: '1',
    mobile: '',
    email: '',
    password: '',
    photo: null,
  });

  useEffect(() => {
    const storedUser = getStoredUser();
    if (!storedUser) {
      navigate('/login');
      return;
    }
    setUser(storedUser);
    loadDashboardData();
  }, [navigate]);

  const loadDashboardData = async () => {
    try {
      const [studentRes, mealRes, eggRes, priceRes] = await Promise.all([
        adminAPI.getStudents({ limit: 100 }),
        adminAPI.getMealStats(),
        adminAPI.getEggStats(),
        adminAPI.getPrices(),
      ]);
      setStudents(studentRes.data.students);
      setMealStats(mealRes.data);
      setEggStats(eggRes.data);
      setPrices(priceRes.data);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    }
  };

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const handleDeleteStudent = async (id) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        await adminAPI.deleteStudent(id);
        toast.success('Student deleted successfully');
        loadDashboardData();
      } catch (error) {
        toast.error('Failed to delete student');
      }
    }
  };

  const handleUploadCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    try {
      await adminAPI.uploadCSV(file);
      toast.success('CSV uploaded successfully');
      loadDashboardData();
    } catch (error) {
      toast.error('Failed to upload CSV');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();

    if (!newStudent.name || !newStudent.registerNumber || !newStudent.mobile || !newStudent.password) {
      toast.error('Please fill all required fields');
      return;
    }

    if (newStudent.mobile.length !== 10 || !/^\d{10}$/.test(newStudent.mobile)) {
      toast.error('Mobile number must be exactly 10 digits');
      return;
    }

    if (newStudent.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setAddLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', newStudent.name.trim());
      formData.append('registerNumber', newStudent.registerNumber.trim().toUpperCase());
      formData.append('department', newStudent.department);
      formData.append('year', newStudent.year);
      formData.append('mobile', newStudent.mobile.trim());
      formData.append('password', newStudent.password);
      if (newStudent.email) {
        formData.append('email', newStudent.email.trim().toLowerCase());
      }
      if (newStudent.photo) {
        formData.append('photo', newStudent.photo);
      }

      await adminAPI.addStudent(formData);
      toast.success('Student added successfully!');
      setNewStudent({
        name: '',
        registerNumber: '',
        department: 'CSE',
        year: '1',
        mobile: '',
        email: '',
        password: '',
        photo: null,
      });
      setShowAddForm(false);
      loadDashboardData();
    } catch (error) {
      const msg = error.response?.data?.error || error.response?.data?.message || 'Failed to add student';
      toast.error(msg);
    } finally {
      setAddLoading(false);
    }
  };

  const handleSetPrices = async (breakfast, lunch, dinner) => {
    try {
      await adminAPI.setPrices(breakfast, lunch, dinner);
      toast.success('Prices updated successfully');
      loadDashboardData();
    } catch (error) {
      toast.error('Failed to update prices');
    }
  };

  if (!user) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.registerNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">Admin Dashboard</h1>
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4">
        {/* Tabs */}
        <div className="flex gap-4 mb-6 overflow-x-auto">
          {['dashboard', 'students', 'reports', 'settings'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-lg font-semibold whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-gray-600 font-semibold mb-2">Total Students</h3>
              <p className="text-3xl font-bold text-blue-600">{students.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-gray-600 font-semibold mb-2">Today's Meals</h3>
              <p className="text-3xl font-bold text-green-600">
                {mealStats?.stats?.total || 0}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-gray-600 font-semibold mb-2">Eggs Distributed</h3>
              <p className="text-3xl font-bold text-yellow-600">
                {eggStats?.eggCount || 0}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-gray-600 font-semibold mb-2">Meal Breakdown</h3>
              <div className="text-sm">
                <p>🍳 Breakfast: {mealStats?.stats?.breakfast || 0}</p>
                <p>🥗 Lunch: {mealStats?.stats?.lunch || 0}</p>
                <p>🍖 Dinner: {mealStats?.stats?.dinner || 0}</p>
              </div>
            </div>
          </div>
        )}

        {/* Students Tab */}
        {activeTab === 'students' && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
              <h2 className="text-2xl font-bold">Student Management</h2>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className={`px-4 py-2 rounded-lg font-semibold ${
                    showAddForm
                      ? 'bg-gray-500 text-white hover:bg-gray-600'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {showAddForm ? '✕ Cancel' : '➕ Add Student'}
                </button>
                <label className="cursor-pointer bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                  📤 Upload CSV
                  <input
                    type="file"
                    accept=".csv,.xlsx"
                    onChange={handleUploadCSV}
                    className="hidden"
                    disabled={loading}
                  />
                </label>
              </div>
            </div>

            {/* Add Student Form */}
            {showAddForm && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-bold text-blue-800 mb-4">📝 Add New Student</h3>
                <form onSubmit={handleAddStudent}>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Name */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newStudent.name}
                        onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                        placeholder="e.g. John Doe"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>

                    {/* Register Number */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Register Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newStudent.registerNumber}
                        onChange={(e) => setNewStudent({ ...newStudent, registerNumber: e.target.value })}
                        placeholder="e.g. 2021CSE001"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                        required
                      />
                    </div>

                    {/* Department */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Department <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={newStudent.department}
                        onChange={(e) => setNewStudent({ ...newStudent, department: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        required
                      >
                        <option value="CSE">CSE</option>
                        <option value="ECE">ECE</option>
                        <option value="EEE">EEE</option>
                        <option value="MECH">MECH</option>
                        <option value="CIVIL">CIVIL</option>
                        <option value="IT">IT</option>
                      </select>
                    </div>

                    {/* Year */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Year <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={newStudent.year}
                        onChange={(e) => setNewStudent({ ...newStudent, year: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        required
                      >
                        <option value="1">1st Year</option>
                        <option value="2">2nd Year</option>
                        <option value="3">3rd Year</option>
                        <option value="4">4th Year</option>
                      </select>
                    </div>

                    {/* Mobile */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Mobile Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={newStudent.mobile}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setNewStudent({ ...newStudent, mobile: val });
                        }}
                        placeholder="e.g. 9876543210"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        maxLength={10}
                        required
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Email <span className="text-gray-400">(optional)</span>
                      </label>
                      <input
                        type="email"
                        value={newStudent.email}
                        onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                        placeholder="e.g. john@email.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    {/* Password */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Password <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        value={newStudent.password}
                        onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })}
                        placeholder="Min 6 characters"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        minLength={6}
                        required
                      />
                    </div>

                    {/* Photo */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Photo <span className="text-gray-400">(optional)</span>
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setNewStudent({ ...newStudent, photo: e.target.files[0] || null })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-blue-100 file:text-blue-700 file:font-semibold hover:file:bg-blue-200"
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="mt-5 flex gap-3">
                    <button
                      type="submit"
                      disabled={addLoading}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {addLoading ? '⏳ Adding...' : '✅ Add Student'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-semibold hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            <input
              type="text"
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
            />

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-left">Register Number</th>
                    <th className="px-4 py-2 text-left">Department</th>
                    <th className="px-4 py-2 text-left">Year</th>
                    <th className="px-4 py-2 text-left">Mobile</th>
                    <th className="px-4 py-2 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                        No students found. Click "➕ Add Student" to add one.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student) => (
                      <tr key={student._id} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-2">{student.name}</td>
                        <td className="px-4 py-2">{student.registerNumber}</td>
                        <td className="px-4 py-2">{student.department}</td>
                        <td className="px-4 py-2">{student.year}</td>
                        <td className="px-4 py-2">{student.mobile}</td>
                        <td className="px-4 py-2 text-center">
                          <button
                            onClick={() => handleDeleteStudent(student._id)}
                            className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Meal Statistics</h2>
              <div className="space-y-2">
                <p>
                  <span className="font-semibold">Breakfast:</span> {mealStats?.stats?.breakfast}
                </p>
                <p>
                  <span className="font-semibold">Lunch:</span> {mealStats?.stats?.lunch}
                </p>
                <p>
                  <span className="font-semibold">Dinner:</span> {mealStats?.stats?.dinner}
                </p>
                <p className="text-lg font-bold pt-2">Total: {mealStats?.stats?.total}</p>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Egg Distribution</h2>
              <div className="space-y-2">
                <p className="text-3xl font-bold text-yellow-600">
                  {eggStats?.eggCount || 0}
                </p>
                <p className="text-gray-600">Eggs distributed this week</p>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-6">Meal Pricing</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {prices && (
                <>
                  <div>
                    <label className="block text-gray-600 font-semibold mb-2">
                      Breakfast Price (₹)
                    </label>
                    <p className="text-2xl font-bold text-blue-600">{prices.breakfast}</p>
                  </div>
                  <div>
                    <label className="block text-gray-600 font-semibold mb-2">
                      Lunch Price (₹)
                    </label>
                    <p className="text-2xl font-bold text-green-600">{prices.lunch}</p>
                  </div>
                  <div>
                    <label className="block text-gray-600 font-semibold mb-2">
                      Dinner Price (₹)
                    </label>
                    <p className="text-2xl font-bold text-red-600">{prices.dinner}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
