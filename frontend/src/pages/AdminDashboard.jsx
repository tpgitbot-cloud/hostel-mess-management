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
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Student Management</h2>
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
                  {filteredStudents.map((student) => (
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
                  ))}
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
