import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { scanAPI, billAPI, faceAPI, authAPI } from '../utils/api';
import { getStoredUser, clearAuth } from '../utils/auth';
import { toast, ToastContainer } from 'react-toastify';

const MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights';

export const StudentDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [scannerActive, setScannerActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [faceRegistered, setFaceRegistered] = useState(false);
  const [checkingFace, setCheckingFace] = useState(true);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);

  // Face scan state
  const [faceScanMode, setFaceScanMode] = useState(false);
  const [faceModelsLoaded, setFaceModelsLoaded] = useState(false);
  const [faceModelsLoading, setFaceModelsLoading] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceScanning, setFaceScanning] = useState(false);
  const faceVideoRef = useRef(null);
  const faceOverlayRef = useRef(null);
  const faceStreamRef = useRef(null);
  const faceapiRef = useRef(null);
  const faceAnimRef = useRef(null);

  // Forced Password Change State
  const [showForcedPasswordChange, setShowForcedPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const [settings, setSettings] = useState(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { settingsAPI } = await import('../utils/api');
        const res = await settingsAPI.getSettings();
        setSettings(res.data);
      } catch (e) {}
    };
    fetchSettings();

    const storedUser = getStoredUser();
    if (!storedUser) {
      navigate('/login');
      return;
    }
    setUser(storedUser);
    
    // Trigger forced password change if it's the first login
    if (storedUser.isFirstLogin) {
      setShowForcedPasswordChange(true);
      setCurrentPassword(storedUser.registerNumber); // They just logged in with this
    }

    fetchBill(storedUser._id);
    checkFaceRegistration();
  }, [navigate]);

  const handleForcedPasswordChange = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (newPassword === currentPassword) {
      toast.error('New password cannot be the same as the current one');
      return;
    }

    setChangingPassword(true);
    try {
      await authAPI.changePassword(currentPassword, newPassword);
      toast.success('Password updated! You can now access your dashboard.');
      
      // Update stored user
      const updatedUser = { ...user, isFirstLogin: false };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      setShowForcedPasswordChange(false);
      
      // If they haven't registered their face yet, maybe prompt them too?
      // For now, just continue to dashboard.
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update password');
    } finally {
      setChangingPassword(false);
    }
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      stopFaceCamera();
    };
  }, []);

  // Safe stream attachment for face scan
  useEffect(() => {
    if (activeTab === 'face-scan' && faceScanMode && faceStreamRef.current && faceVideoRef.current) {
      const video = faceVideoRef.current;
      video.srcObject = faceStreamRef.current;
      
      const onPlay = () => {
        console.log('Face scan video playing, starting loop');
        startFaceDetectLoop();
      };
      
      video.addEventListener('playing', onPlay);
      video.play().catch(e => console.error("Face scan play error:", e));
      
      return () => {
        video.removeEventListener('playing', onPlay);
      };
    }
  }, [activeTab, faceScanMode, startFaceDetectLoop]);

  const checkFaceRegistration = async () => {
    try {
      const response = await faceAPI.checkFaceStatus();
      setFaceRegistered(response.data.faceRegistered);
    } catch (error) {
      // Silently fail
    } finally {
      setCheckingFace(false);
    }
  };

  const fetchBill = async (studentId) => {
    try {
      const response = await billAPI.getStudentBill(studentId);
      setBill(response.data);
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error('Failed to load bill:', error);
      }
    }
  };

  const handleLogout = () => {
    stopCamera();
    stopFaceCamera();
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

  // ===== FACE SCAN FOR MEALS =====

  const stopFaceCamera = () => {
    if (faceAnimRef.current) {
      cancelAnimationFrame(faceAnimRef.current);
      faceAnimRef.current = null;
    }
    if (faceStreamRef.current) {
      faceStreamRef.current.getTracks().forEach((t) => t.stop());
      faceStreamRef.current = null;
    }
    setFaceScanMode(false);
    setFaceDetected(false);
  };

  const loadFaceModels = async () => {
    if (faceModelsLoaded) return true;
    setFaceModelsLoading(true);
    try {
      const faceapi = await import(
        /* webpackIgnore: true */
        'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/dist/face-api.esm.js'
      );
      faceapiRef.current = faceapi;
      await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      setFaceModelsLoaded(true);
      setFaceModelsLoading(false);
      return true;
    } catch (err) {
      setFaceModelsLoading(false);
      toast.error('Failed to load face models');
      return false;
    }
  };

  const startFaceScan = async () => {
    stopCamera();
    const loaded = await loadFaceModels();
    if (!loaded) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      faceStreamRef.current = stream;
      setFaceScanMode(true);
      // Stream will be attached in useEffect
    } catch (err) {
      toast.error('Camera error: ' + err.message);
    }
  };

  const startFaceDetectLoop = useCallback(() => {
    const faceapi = faceapiRef.current;
    if (!faceapi) return;

    const detect = async () => {
      if (!faceVideoRef.current || faceVideoRef.current.readyState < 2) {
        faceAnimRef.current = requestAnimationFrame(detect);
        return;
      }
      try {
        const detections = await faceapi.detectAllFaces(faceVideoRef.current).withFaceLandmarks();
        const overlay = faceOverlayRef.current;
        if (overlay && faceVideoRef.current) {
          // matchDimensions(..., false) because we use CSS mirror
          const dims = faceapi.matchDimensions(overlay, faceVideoRef.current, false);
          const resized = faceapi.resizeResults(detections, dims);
          const ctx = overlay.getContext('2d');
          ctx.clearRect(0, 0, overlay.width, overlay.height);
          if (resized.length === 1) {
            setFaceDetected(true);
            const box = resized[0].detection.box;
            ctx.strokeStyle = '#22c55e';
            ctx.lineWidth = 3;
            ctx.strokeRect(box.x, box.y, box.width, box.height);
          } else {
            setFaceDetected(false);
          }
        }
      } catch (e) {}
      faceAnimRef.current = requestAnimationFrame(detect);
    };
    detect();
  }, []);

  const handleFaceMealScan = async (mealType) => {
    const faceapi = faceapiRef.current;
    if (!faceapi || !faceVideoRef.current) return;

    setFaceScanning(true);
    try {
      const detection = await faceapi
        .detectSingleFace(faceVideoRef.current)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        toast.error('No face detected. Please face the camera.');
        setFaceScanning(false);
        return;
      }

      // Use the face scan to verify identity, then mark the meal
      const descriptor = Array.from(detection.descriptor);
      const identifyRes = await faceAPI.faceScanMeal(descriptor, mealType);
      const identifiedStudent = identifyRes.data.student;

      // Verify it's the same student
      if (identifiedStudent._id !== user._id) {
        toast.error('Face does not match your profile!');
        setFaceScanning(false);
        return;
      }

      // Mark the meal
      await scanAPI.scanMeal(mealType, user._id);
      toast.success(`✅ ${mealType} scanned via face recognition!`);
      fetchBill(user._id);
      stopFaceCamera();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Face scan failed');
    } finally {
      setFaceScanning(false);
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

      {/* Forced Password Change Modal */}
      {showForcedPasswordChange && (
        <div className="fixed inset-0 z-[100] bg-gray-900/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md animate-fade-in shadow-blue-500/20">
            <div className="text-center mb-6">
              <div className="text-5xl mb-4">🔐</div>
              <h2 className="text-2xl font-bold text-gray-800">Secure Your Account</h2>
              <p className="text-gray-500 mt-2 text-sm">
                This is your first login. For security reasons, you must change your default password.
              </p>
            </div>

            <form onSubmit={handleForcedPasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Min 6 characters"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Retype password"
                  required
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {changingPassword ? 'Updating Password...' : 'Save & Continue'}
                </button>
              </div>
            </form>

            <p className="text-[10px] text-center text-gray-400 mt-6 uppercase tracking-widest font-bold">
              Default Password Hint: {user?.registerNumber}
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">
            🎓 {settings?.siteName || 'Hostel Mess'}
          </h1>
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
        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { id: 'home', label: '🏠 Home' },
            { id: 'scan', label: '📷 Scan QR' },
            { id: 'face-scan', label: '🧬 Face Scan' },
            { id: 'profile', label: '👤 Profile' },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => {
                if (id !== 'scan') stopCamera();
                if (id !== 'face-scan') stopFaceCamera();
                setActiveTab(id);
              }}
              className={`px-5 py-2 rounded-lg font-semibold text-sm ${
                activeTab === id
                  ? id === 'face-scan' ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'
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

            {/* Face Registration Banner */}
            {!checkingFace && !faceRegistered && (
              <div className="face-register-banner">
                <div className="face-register-banner-content">
                  <div className="face-register-banner-icon">🧬</div>
                  <div>
                    <h3 className="face-register-banner-title">Register Your Face</h3>
                    <p className="face-register-banner-desc">
                      Enable face-based login & meal scanning for faster access
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/face-registration')}
                  className="face-register-banner-btn"
                >
                  Register Now →
                </button>
              </div>
            )}

            {!checkingFace && faceRegistered && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4 flex items-center gap-2">
                <span className="text-xl">✅</span>
                <p className="text-emerald-700 text-sm font-medium">
                  Face registered! You can use face login and face-based meal scanning.
                </p>
              </div>
            )}

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

        {/* Face Scan Tab */}
        {activeTab === 'face-scan' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">🧬 Face Meal Scanner</h2>

            {!faceRegistered ? (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">🧬</div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">Face Not Registered</h3>
                <p className="text-gray-500 mb-6">
                  You need to register your face before using face-based meal scanning.
                </p>
                <button
                  onClick={() => navigate('/face-registration')}
                  className="bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-700"
                >
                  🧬 Register Face
                </button>
              </div>
            ) : !faceScanMode ? (
              <div className="space-y-4">
                <p className="text-gray-600 mb-4">
                  Use your face to quickly scan and verify your meal attendance.
                </p>
                <button
                  onClick={startFaceScan}
                  disabled={faceModelsLoading}
                  className="w-full bg-emerald-600 text-white py-4 rounded-lg font-semibold hover:bg-emerald-700 text-lg disabled:opacity-50"
                >
                  {faceModelsLoading ? '⏳ Loading models...' : '🎥 Open Face Scanner'}
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
                {/* Camera */}
                <div className="face-login-camera-wrapper mb-4">
                  <video ref={faceVideoRef} autoPlay playsInline muted className="face-login-video" />
                  <canvas ref={faceOverlayRef} className="face-login-overlay" />
                  <div className={`face-login-indicator ${faceDetected ? 'detected' : ''}`}>
                    {faceDetected ? '✅ Face Detected' : '⚠️ Looking for face...'}
                  </div>
                </div>

                {/* Meal Buttons */}
                <p className="text-gray-600 text-center mb-4">Select your meal to scan:</p>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { type: 'BREAKFAST', emoji: '🍳', color: 'bg-orange-500 hover:bg-orange-600' },
                    { type: 'LUNCH', emoji: '🥗', color: 'bg-green-500 hover:bg-green-600' },
                    { type: 'DINNER', emoji: '🍖', color: 'bg-purple-500 hover:bg-purple-600' },
                  ].map(({ type, emoji, color }) => (
                    <button
                      key={type}
                      onClick={() => handleFaceMealScan(type)}
                      disabled={!faceDetected || faceScanning}
                      className={`${color} text-white py-4 rounded-lg font-semibold text-sm disabled:opacity-50 transition`}
                    >
                      {faceScanning ? '⏳' : emoji}<br />{type}
                    </button>
                  ))}
                </div>

                <button
                  onClick={stopFaceCamera}
                  className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300"
                >
                  ✕ Close Scanner
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
              <div>
                <p className="text-gray-600">Face Registration</p>
                <p className={`text-lg font-semibold ${faceRegistered ? 'text-emerald-600' : 'text-gray-400'}`}>
                  {checkingFace ? 'Checking...' : faceRegistered ? '✅ Registered' : '❌ Not Registered'}
                </p>
              </div>
            </div>

            {!checkingFace && !faceRegistered && (
              <div className="mt-6 pt-4 border-t">
                <button
                  onClick={() => navigate('/face-registration')}
                  className="bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-700"
                >
                  🧬 Register Face
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default StudentDashboard;
