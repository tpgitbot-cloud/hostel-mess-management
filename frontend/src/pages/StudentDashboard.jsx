import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { scanAPI, billAPI } from '../utils/api';
import { getStoredUser, clearAuth } from '../utils/auth';
import { toast, ToastContainer } from 'react-toastify';

export const StudentDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [scannerActive, setScannerActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);

  useEffect(() => {
    const storedUser = getStoredUser();
    if (!storedUser) {
      navigate('/login');
      return;
    }
    setUser(storedUser);
    fetchBill(storedUser._id);
  }, [navigate]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const fetchBill = async (studentId) => {
    try {
      const response = await billAPI.getStudentBill(studentId);
      setBill(response.data);
    } catch (error) {
      // Don't show error if prices aren't configured yet
      if (error.response?.status !== 404) {
        console.error('Failed to load bill:', error);
      }
    }
  };

  const handleLogout = () => {
    stopCamera();
    clearAuth();
    navigate('/login');
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setScannerActive(false);
    setCameraError('');
  };

  const startCamera = async () => {
    setCameraError('');
    setScannerActive(true);

    try {
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // Dynamic import of jsQR for QR reading from camera frames
      const { default: jsQR } = await import('jsqr');

      // Start scanning frames
      scanIntervalRef.current = setInterval(() => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
          handleQRScan(code.data);
          stopCamera();
        }
      }, 300);
    } catch (err) {
      console.error('Camera error:', err);
      setScannerActive(false);
      if (err.name === 'NotAllowedError') {
        setCameraError('Camera permission denied. Please allow camera access in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        setCameraError('No camera found on this device.');
      } else {
        setCameraError('Could not access camera: ' + err.message);
      }
    }
  };

  const handleQRScan = async (qrData) => {
    try {
      const mealType = (qrData || '').toUpperCase().trim();

      if (!['BREAKFAST', 'LUNCH', 'DINNER'].includes(mealType)) {
        toast.error('Invalid QR code. Only BREAKFAST, LUNCH, or DINNER QR codes are valid.');
        return;
      }

      setLoading(true);
      await scanAPI.scanMeal(mealType, user._id);
      toast.success(`✅ ${mealType} scanned successfully!`);
      fetchBill(user._id);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Scan failed');
    } finally {
      setLoading(false);
    }
  };

  const handleEggScan = async () => {
    try {
      setLoading(true);
      await scanAPI.scanEgg(user._id);
      toast.success('🥚 Egg collected successfully!');
      fetchBill(user._id);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Egg scan failed');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>Loading...</div>;
  }

  const mealCount = bill?.mealCount || { breakfast: 0, lunch: 0, dinner: 0 };
  const totalMeals = mealCount.breakfast + mealCount.lunch + mealCount.dinner;

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
          {[
            { id: 'home', label: '🏠 Home' },
            { id: 'scan', label: '📷 Scan QR' },
            { id: 'profile', label: '👤 Profile' },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => {
                if (id !== 'scan') stopCamera();
                setActiveTab(id);
              }}
              className={`px-6 py-2 rounded-lg font-semibold ${
                activeTab === id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Home Tab */}
        {activeTab === 'home' && (
          <div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-blue-800">
                👋 Welcome, <strong>{user.name}</strong>! ({user.registerNumber})
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-gray-600 font-semibold mb-2">This Month's Meals</h3>
                <p className="text-3xl font-bold text-blue-600">{totalMeals}</p>
                <div className="text-sm text-gray-500 mt-2">
                  <p>🍳 Breakfast: {mealCount.breakfast}</p>
                  <p>🥗 Lunch: {mealCount.lunch}</p>
                  <p>🍖 Dinner: {mealCount.dinner}</p>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-gray-600 font-semibold mb-2">Total Meals</h3>
                <p className="text-3xl font-bold text-green-600">{bill?.meals || 0}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-gray-600 font-semibold mb-2">Current Bill</h3>
                <p className="text-3xl font-bold text-red-600">
                  ₹{bill?.totalBill != null ? bill.totalBill.toFixed(2) : '0.00'}
                </p>
                {bill?.prices && (
                  <div className="text-xs text-gray-500 mt-2">
                    <p>Breakfast: ₹{bill.prices.breakfast} | Lunch: ₹{bill.prices.lunch} | Dinner: ₹{bill.prices.dinner}</p>
                  </div>
                )}
              </div>
            </div>

            {!bill && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-700 text-sm">
                  ℹ️ Bill information will show up once the admin configures meal prices and you start scanning meals.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Scan Tab */}
        {activeTab === 'scan' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">📷 Meal Scanner</h2>
            <p className="text-gray-600 mb-6">
              Point your camera at the QR code posted in the mess hall to mark your meal attendance.
            </p>

            {cameraError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-700 font-semibold">❌ {cameraError}</p>
                <p className="text-red-600 text-sm mt-1">
                  Tip: Make sure you're using HTTPS and have granted camera permissions.
                </p>
              </div>
            )}

            {!scannerActive ? (
              <div className="space-y-4">
                <button
                  onClick={startCamera}
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold hover:bg-blue-700 text-lg disabled:opacity-50"
                >
                  📷 Open Camera & Scan Meal QR
                </button>
                <button
                  onClick={handleEggScan}
                  disabled={loading}
                  className="w-full bg-yellow-500 text-white py-4 rounded-lg font-semibold hover:bg-yellow-600 text-lg disabled:opacity-50"
                >
                  {loading ? '⏳ Processing...' : '🥚 Collect Egg (Thursday Only)'}
                </button>
              </div>
            ) : (
              <div>
                <div className="relative bg-black rounded-lg overflow-hidden mb-4" style={{ maxWidth: 640, margin: '0 auto' }}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ width: '100%', display: 'block' }}
                  />
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                  {/* Scan overlay */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: 200,
                      height: 200,
                      border: '3px solid #22c55e',
                      borderRadius: 12,
                      boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)',
                    }}
                  />
                </div>
                <p className="text-center text-gray-600 mb-4 animate-pulse">
                  🔍 Scanning... Point the camera at the QR code
                </p>
                <button
                  onClick={stopCamera}
                  className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700"
                >
                  ✕ Cancel Scan
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
