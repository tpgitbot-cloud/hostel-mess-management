import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { scanAPI, billAPI } from '../utils/api';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { getStoredUser, clearAuth } from '../utils/auth';
import { toast, ToastContainer } from 'react-toastify';

export const StudentDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [scannerActive, setScannerActive] = useState(false);
  const [scanner, setScanner] = useState(null);

  useEffect(() => {
    const storedUser = getStoredUser();
    if (!storedUser) {
      navigate('/login');
      return;
    }
    setUser(storedUser);
    fetchBill(storedUser._id);
  }, [navigate]);

  const fetchBill = async (studentId) => {
    try {
      const response = await billAPI.getStudentBill(studentId);
      setBill(response.data);
    } catch (error) {
      toast.error('Failed to load bill');
    }
  };

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const startQRScanner = () => {
    setScannerActive(true);
    const qrScanner = new Html5QrcodeScanner('qr-reader', {
      fps: 10,
      qrbox: 250,
    });

    qrScanner.render(
      (decodedText) => {
        handleQRScan(decodedText);
        qrScanner.clear();
        setScannerActive(false);
      },
      (errorMessage) => {
        // Error handling
      }
    );
    setScanner(qrScanner);
  };

  const handleQRScan = async (qrData) => {
    try {
      // QR contains meal type: BREAKFAST, LUNCH, DINNER
      const mealType = qrData.toUpperCase();

      if (!['BREAKFAST', 'LUNCH', 'DINNER'].includes(mealType)) {
        toast.error('Invalid QR code');
        return;
      }

      setLoading(true);
      const response = await scanAPI.scanMeal(mealType, user._id);
      toast.success(`${mealType} scanned successfully!`);
      fetchBill(user._id);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Scan failed');
    } finally {
      setLoading(false);
      setScannerActive(false);
    }
  };

  const handleEggScan = async () => {
    try {
      setLoading(true);
      const response = await scanAPI.scanEgg(user._id);
      toast.success('Egg scanned successfully!');
      fetchBill(user._id);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Egg scan failed');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">Student Dashboard</h1>
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-4">
        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('home')}
            className={`px-6 py-2 rounded-lg font-semibold ${
              activeTab === 'home'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Home
          </button>
          <button
            onClick={() => setActiveTab('scan')}
            className={`px-6 py-2 rounded-lg font-semibold ${
              activeTab === 'scan'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Scan QR
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-6 py-2 rounded-lg font-semibold ${
              activeTab === 'profile'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Profile
          </button>
        </div>

        {/* Home Tab */}
        {activeTab === 'home' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-gray-600 font-semibold mb-2">Today's Meals</h3>
              <p className="text-3xl font-bold text-blue-600">
                {bill ? bill.mealCount.breakfast + bill.mealCount.lunch + bill.mealCount.dinner : 0}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-gray-600 font-semibold mb-2">Monthly Total</h3>
              <p className="text-3xl font-bold text-green-600">{bill?.meals || 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-gray-600 font-semibold mb-2">Current Bill</h3>
              <p className="text-3xl font-bold text-red-600">₹{bill?.totalBill.toFixed(2) || 0}</p>
            </div>
          </div>
        )}

        {/* Scan Tab */}
        {activeTab === 'scan' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-6">QR Code Scanner</h2>

            {!scannerActive ? (
              <div className="flex gap-4">
                <button
                  onClick={startQRScanner}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700"
                >
                  📷 Scan Meal QR
                </button>
                <button
                  onClick={handleEggScan}
                  disabled={loading}
                  className="flex-1 bg-yellow-600 text-white py-3 rounded-lg font-semibold hover:bg-yellow-700 disabled:opacity-50"
                >
                  🥚 Scan Egg (Thursday)
                </button>
              </div>
            ) : (
              <div>
                <div id="qr-reader" className="mb-4"></div>
                <button
                  onClick={() => {
                    scanner?.clear();
                    setScannerActive(false);
                  }}
                  className="w-full bg-red-600 text-white py-2 rounded-lg"
                >
                  Cancel Scan
                </button>
              </div>
            )}
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-6">Profile Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-gray-600">Name</p>
                <p className="text-lg font-semibold">{user.name}</p>
              </div>
              <div>
                <p className="text-gray-600">Register Number</p>
                <p className="text-lg font-semibold">{user.registerNumber}</p>
              </div>
              <div>
                <p className="text-gray-600">Department</p>
                <p className="text-lg font-semibold">{user.department}</p>
              </div>
              <div>
                <p className="text-gray-600">Year</p>
                <p className="text-lg font-semibold">{user.year}</p>
              </div>
              <div>
                <p className="text-gray-600">Mobile</p>
                <p className="text-lg font-semibold">{user.mobile}</p>
              </div>
              <div>
                <p className="text-gray-600">Email</p>
                <p className="text-lg font-semibold">{user.email || 'N/A'}</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default StudentDashboard;
