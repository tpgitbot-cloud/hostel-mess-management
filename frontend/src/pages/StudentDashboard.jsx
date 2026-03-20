import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { scanAPI, billAPI, faceAPI, authAPI, settingsAPI } from '../utils/api';
import { getStoredUser, clearAuth } from '../utils/auth';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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
  
  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const faceVideoRef = useRef(null);
  const faceOverlayRef = useRef(null);
  const faceStreamRef = useRef(null);
  const faceapiRef = useRef(null);
  const faceAnimRef = useRef(null);

  // Face scan state
  const [faceScanMode, setFaceScanMode] = useState(false);
  const [faceModelsLoaded, setFaceModelsLoaded] = useState(false);
  const [faceModelsLoading, setFaceModelsLoading] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceScanning, setFaceScanning] = useState(false);

  // Forced Password Change State
  const [showForcedPasswordChange, setShowForcedPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const [settings, setSettings] = useState(null);

  // ===== HELPER FUNCTIONS (Hoisted & Memoized) =====

  const fetchSettings = useCallback(async () => {
    try {
      const res = await settingsAPI.getSettings();
      setSettings(res.data);
    } catch (e) {
      console.error('Settings load error:', e);
    }
  }, []);

  const checkFaceRegistration = useCallback(async () => {
    try {
      const response = await faceAPI.checkFaceStatus();
      setFaceRegistered(response.data.faceRegistered);
    } catch (error) {
      // Silently fail
    } finally {
      setCheckingFace(false);
    }
  }, []);

  const fetchBill = useCallback(async (studentId) => {
    if (!studentId) return;
    try {
      const response = await billAPI.getStudentBill(studentId);
      setBill(response.data);
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error('Failed to load bill:', error);
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
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
  }, []);

  const stopFaceCamera = useCallback(() => {
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
  }, []);

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

  const handleForcedPasswordChange = useCallback(async (e) => {
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
      
      const updatedUser = { ...user, isFirstLogin: false };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      localStorage.removeItem('isFirstLogin');
      
      setShowForcedPasswordChange(false);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update password');
    } finally {
      setChangingPassword(false);
    }
  }, [newPassword, confirmPassword, currentPassword, user]);

  const handleLogout = useCallback(() => {
    stopCamera();
    stopFaceCamera();
    clearAuth();
    navigate('/login');
  }, [navigate, stopCamera, stopFaceCamera]);

  // ===== CAMERA & SCAN LOGIC =====

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
      // Dynamic import of jsQR
      const { default: jsQR } = await import('jsqr');
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
      setCameraError('Could not access camera: ' + err.message);
    }
  };

  const loadFaceModels = async () => {
    if (faceModelsLoaded) return true;
    setFaceModelsLoading(true);
    try {
      const faceapi = await import(
        /* @vite-ignore */
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
    } catch (err) {
      toast.error('Camera error: ' + err.message);
    }
  };

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
      const descriptor = Array.from(detection.descriptor);
      const identifyRes = await faceAPI.faceScanMeal(descriptor, mealType);
      const identifiedStudent = identifyRes.data.student;
      if (identifiedStudent._id !== user._id) {
        toast.error('Face does not match your profile!');
        setFaceScanning(false);
        return;
      }
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

  // ===== EFFECT HOOKS (Bottom of component) =====

  useEffect(() => {
    fetchSettings();
    const storedUser = getStoredUser();
    if (!storedUser) {
      navigate('/login');
      return;
    }
    setUser(storedUser);
    const isFirstLogin = storedUser.isFirstLogin === true || localStorage.getItem('isFirstLogin') === 'true';
    if (isFirstLogin) {
      setShowForcedPasswordChange(true);
      setCurrentPassword((storedUser.registerNumber || '').toUpperCase());
    }
    fetchBill(storedUser._id);
    checkFaceRegistration();
  }, [navigate, fetchSettings, fetchBill, checkFaceRegistration]);

  useEffect(() => {
    if (activeTab === 'face-scan' && faceScanMode && faceStreamRef.current && faceVideoRef.current) {
      const video = faceVideoRef.current;
      video.srcObject = faceStreamRef.current;
      const onPlay = () => startFaceDetectLoop();
      video.addEventListener('playing', onPlay);
      video.play().catch(e => console.error("Face scan error:", e));
      return () => video.removeEventListener('playing', onPlay);
    }
  }, [activeTab, faceScanMode, startFaceDetectLoop]);

  useEffect(() => {
    if (activeTab === 'scan' && scannerActive && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(e => console.error("QR scan error:", e));
    }
  }, [activeTab, scannerActive]);

  useEffect(() => {
    return () => {
      stopCamera();
      stopFaceCamera();
    };
  }, [stopCamera, stopFaceCamera]);

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6 shadow-lg shadow-blue-500/20"></div>
        <div className="text-white text-2xl font-bold tracking-tight">Initializing Portal</div>
        <p className="text-slate-400 mt-2 max-w-xs">Connecting to secure mess services and verifying session records...</p>
      </div>
    );
  }

  const mealCount = bill?.mealCount || { breakfast: 0, lunch: 0, dinner: 0 };
  const totalMeals = mealCount.breakfast + mealCount.lunch + mealCount.dinner;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Forced Password Change Modal */}
      {showForcedPasswordChange && (
        <div className="fixed inset-0 z-[100] bg-gray-900/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md animate-in fade-in zoom-in duration-300 shadow-blue-500/10">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-sm">
                <span className="text-4xl text-blue-600">🔐</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Secure Your Account</h2>
              <p className="text-gray-500 mt-2 text-sm leading-relaxed">
                Welcome! As this is your first time logging in, you must set a new secure password.
              </p>
            </div>

            <form onSubmit={handleForcedPasswordChange} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                  placeholder="Min 6 characters"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                  placeholder="Repeat new password"
                  required
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 active:scale-[0.98] transition-all shadow-xl shadow-blue-600/20 disabled:opacity-50"
                >
                  {changingPassword ? '🔒 Updating Security...' : 'Save & Login'}
                </button>
              </div>
            </form>
            
            <div className="mt-8 pt-6 border-t border-gray-50 text-center">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                Account ID: {user?.registerNumber}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg sticky top-0 z-50 border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-blue-600/20">
              {settings?.siteName?.[0] || 'H'}
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-blue-500">
              {settings?.siteName || 'Hostel Mess'}
            </h1>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100"
          >
            <span>Logout</span>
            <span className="text-lg">🚪</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-4 w-full flex-grow">
        {/* Mobile Navigation Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
          {[
            { id: 'home', label: 'Dashboard', icon: '🏠' },
            { id: 'scan', label: 'Scan QR', icon: '📷' },
            { id: 'face-scan', label: 'Face Scan', icon: '🧬' },
            { id: 'profile', label: 'Profile', icon: '👤' },
          ].map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => {
                if (id !== 'scan') stopCamera();
                if (id !== 'face-scan') stopFaceCamera();
                setActiveTab(id);
              }}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm whitespace-nowrap transition-all duration-300 ${
                activeTab === id
                  ? id === 'face-scan' 
                    ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-500/20 scale-[1.05]' 
                    : 'bg-blue-600 text-white shadow-xl shadow-blue-600/20 scale-[1.05]'
                  : 'bg-white text-gray-500 hover:bg-gray-100 shadow-sm border border-gray-100'
              }`}
            >
              <span className="text-base">{icon}</span>
              {label}
            </button>
          ))}
        </div>

        {/* Home Tab */}
        {activeTab === 'home' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-3xl p-6 text-white shadow-2xl shadow-blue-500/20 relative overflow-hidden">
              <div className="relative z-10">
                <span className="text-xs font-bold uppercase tracking-widest opacity-70">Welcome Back</span>
                <h2 className="text-3xl font-black mt-1">{user.name}</h2>
                <div className="flex items-center gap-2 mt-4 text-sm font-medium bg-white/20 w-fit px-3 py-1.5 rounded-full backdrop-blur-md">
                   {user.registerNumber} • {user.department} ({user.year} Year)
                </div>
              </div>
              <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
            </div>

            {/* Face Registration Banner */}
            {!checkingFace && !faceRegistered && (
              <div className="bg-white border border-emerald-100 rounded-3xl p-6 shadow-xl shadow-emerald-500/5 hover:shadow-emerald-500/10 transition-all group flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-center md:text-left">
                  <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-emerald-100 group-hover:rotate-6 transition-transform">
                    🧬
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">Speed Up Your Meals</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Register your face to skip QR scanning and log in instantly.</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/face-registration')}
                  className="bg-emerald-600 text-white px-8 py-3.5 rounded-2xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all text-sm w-full md:w-auto"
                >
                  Start Registration
                </button>
              </div>
            )}

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-gray-200/50 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Monthly Meals</span>
                  <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center text-xl">🍽️</div>
                </div>
                <div className="text-4xl font-black text-gray-900">{totalMeals}</div>
                <div className="grid grid-cols-3 gap-1 mt-4 pt-4 border-t border-gray-50">
                   <div className="text-center">
                     <div className="text-[10px] font-bold text-gray-400 uppercase">Brk</div>
                     <div className="text-sm font-bold text-blue-600">{mealCount.breakfast}</div>
                   </div>
                   <div className="text-center">
                     <div className="text-[10px] font-bold text-gray-400 uppercase">Lun</div>
                     <div className="text-sm font-bold text-blue-600">{mealCount.lunch}</div>
                   </div>
                   <div className="text-center">
                     <div className="text-[10px] font-bold text-gray-400 uppercase">Din</div>
                     <div className="text-sm font-bold text-blue-600">{mealCount.dinner}</div>
                   </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-gray-200/50 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Usage</span>
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center text-xl">📈</div>
                </div>
                <div className="text-4xl font-black text-gray-900">{bill?.meals || 0}</div>
                <div className="text-[10px] font-bold text-gray-400 uppercase mt-4 pt-4 border-t border-gray-50 tracking-widest">Lifetime attendance</div>
              </div>

              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 bg-red-50/10 border-red-50 hover:shadow-xl hover:shadow-gray-200/50 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-xs font-bold text-red-300 uppercase tracking-widest">Monthly Due</span>
                  <div className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center text-xl">💰</div>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold text-red-600">₹</span>
                  <span className="text-4xl font-black text-red-600">{bill?.totalBill != null ? bill.totalBill.toFixed(2) : '0.00'}</span>
                </div>
                <div className="text-[10px] font-bold text-red-300 uppercase mt-4 pt-4 border-t border-red-100 tracking-widest">Auto-calculated</div>
              </div>
            </div>
          </div>
        )}

        {/* Scan Tab */}
        {activeTab === 'scan' && (
          <div className="max-w-xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white rounded-[32px] p-8 shadow-2xl shadow-gray-200/50 border border-gray-100 text-center">
              <h2 className="text-2xl font-black text-gray-900">Scan Meal QR</h2>
              <p className="text-gray-500 mt-2 text-sm">Position your camera to see the QR code clearly</p>

              {cameraError && (
                <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-bold mt-6 border border-red-100">
                   📷 {cameraError}
                </div>
              )}

              <div className="mt-8">
                {!scannerActive ? (
                  <div className="grid grid-cols-1 gap-4">
                    <button
                      onClick={startCamera}
                      className="group bg-blue-600 text-white p-6 rounded-[24px] shadow-xl shadow-blue-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                       <div className="text-4xl mb-3 group-hover:rotate-12 transition-transform">📷</div>
                       <div className="font-black text-xl">Open Camera</div>
                    </button>
                    <button
                      onClick={handleEggScan}
                      disabled={loading}
                      className="flex items-center justify-center gap-3 bg-yellow-400 text-yellow-900 p-5 rounded-[24px] font-black hover:bg-yellow-500 transition-all shadow-lg shadow-yellow-400/20 disabled:opacity-50"
                    >
                      <span className="text-2xl">🥚</span>
                      {loading ? 'Processing...' : 'Collect Thursday Egg'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="relative aspect-square max-w-[320px] mx-auto bg-black rounded-[32px] overflow-hidden shadow-2xl border-4 border-blue-600 ring-8 ring-blue-50">
                      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                      <canvas ref={canvasRef} style={{ display: 'none' }} />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-48 h-48 border-2 border-white/50 rounded-2xl relative">
                          <div className="absolute top-[-2px] left-[-2px] w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-lg"></div>
                          <div className="absolute top-[-2px] right-[-2px] w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-lg"></div>
                          <div className="absolute bottom-[-2px] left-[-2px] w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-lg"></div>
                          <div className="absolute bottom-[-2px] right-[-2px] w-6 h-6 border-b-4 border-r-4 border-white rounded-br-lg"></div>
                        </div>
                      </div>
                      <div className="absolute top-4 inset-x-0 flex justify-center">
                        <div className="bg-black/50 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border border-white/20">Active Scanner</div>
                      </div>
                    </div>
                    <button
                      onClick={stopCamera}
                      className="w-full bg-red-50 text-red-600 py-4 rounded-2xl font-black hover:bg-red-100 transition-all"
                    >
                      ✕ Close Camera
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Face Scan Tab */}
        {activeTab === 'face-scan' && (
          <div className="max-w-xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white rounded-[32px] p-8 shadow-2xl shadow-emerald-200/50 border border-emerald-100">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-black text-gray-900">Face Recognition</h2>
                <p className="text-gray-500 mt-2 text-sm">Instant authentication for your meals</p>
              </div>

              {!faceRegistered ? (
                 <div className="bg-emerald-50 p-8 rounded-[32px] text-center border border-emerald-100">
                   <div className="text-6xl mb-4">🧬</div>
                   <h3 className="text-xl font-bold text-emerald-900">Registration Required</h3>
                   <p className="text-emerald-700/70 text-sm mt-2 mb-6">Register your face template securely to use this feature.</p>
                   <button
                     onClick={() => navigate('/face-registration')}
                     className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-emerald-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                   >
                     Setup Face ID
                   </button>
                 </div>
              ) : !faceScanMode ? (
                <div className="space-y-4">
                  <button
                    onClick={startFaceScan}
                    disabled={faceModelsLoading}
                    className="w-full bg-emerald-600 text-white p-6 rounded-[24px] shadow-xl shadow-emerald-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                     <div className="text-4xl mb-3 group-hover:rotate-12 transition-transform">🧬</div>
                     <div className="font-black text-xl">{faceModelsLoading ? 'Preparing AI...' : 'Start Face Scanner'}</div>
                  </button>
                  <button
                    onClick={handleEggScan}
                    disabled={loading}
                    className="flex items-center justify-center gap-3 bg-yellow-400 text-yellow-900 p-5 rounded-[24px] font-black hover:bg-yellow-500 transition-all shadow-lg shadow-yellow-400/20 disabled:opacity-50"
                  >
                    <span className="text-2xl">🥚</span>
                    {loading ? 'Processing...' : 'Collect Thursday Egg'}
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="relative aspect-square max-w-[320px] mx-auto bg-black rounded-[32px] overflow-hidden shadow-2xl border-4 border-emerald-600 ring-8 ring-emerald-50">
                    <video ref={faceVideoRef} autoPlay playsInline muted className="w-full h-full object-cover mirror-mode" />
                    <canvas ref={faceOverlayRef} className="absolute inset-0 w-full h-full mirror-mode" />
                    <div className={`absolute top-4 inset-x-0 flex justify-center transition-all ${faceDetected ? 'opacity-100' : 'opacity-0'}`}>
                       <div className="bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg">Face Balanced</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { type: 'BREAKFAST', emoji: '🍳', label: 'Morning' },
                      { type: 'LUNCH', emoji: '🥗', label: 'Noon' },
                      { type: 'DINNER', emoji: '🍖', label: 'Night' },
                    ].map(({ type, emoji, label }) => (
                      <button
                        key={type}
                        onClick={() => handleFaceMealScan(type)}
                        disabled={!faceDetected || faceScanning}
                        className="bg-gray-50 border border-gray-100 p-4 rounded-2xl flex flex-col items-center gap-1 hover:border-emerald-200 transition-colors disabled:opacity-30"
                      >
                         <span className="text-2xl">{faceScanning ? '⏳' : emoji}</span>
                         <span className="text-[10px] font-black uppercase tracking-tight text-gray-400">{label}</span>
                         <span className="text-xs font-black text-gray-800">{type[0] + type.slice(1).toLowerCase()}</span>
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={stopFaceCamera}
                    className="w-full bg-gray-50 text-gray-400 py-4 rounded-2xl font-bold hover:text-gray-600 transition-all"
                  >
                    ✕ Close Scanner
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="max-w-xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500">
             <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100">
               <div className="text-center mb-8">
                 <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center text-4xl mx-auto border-4 border-white shadow-xl">👤</div>
                 <h2 className="text-2xl font-black text-gray-900 mt-4">{user.name}</h2>
                 <p className="text-blue-600 font-bold text-sm tracking-wide mt-1">{user.registerNumber}</p>
               </div>

               <div className="space-y-4">
                 {[
                   { label: 'Department', value: user.department },
                   { label: 'Academic Year', value: user.year + ' Year' },
                   { label: 'Mobile Contact', value: user.mobile },
                   { label: 'Email Address', value: user.email || 'Not configured', isDim: !user.email },
                 ].map((item, i) => (
                   <div key={i} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
                     <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{item.label}</span>
                     <span className={`font-black text-gray-900 ${item.isDim ? 'text-gray-300 italic' : ''}`}>{item.value}</span>
                   </div>
                 ))}
                 
                 <div className="flex justify-between items-center p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <span className="text-xs font-bold text-emerald-900/60 uppercase tracking-widest">Face Authentication</span>
                    <span className={`font-black ${faceRegistered ? 'text-emerald-600' : 'text-emerald-300'}`}>
                      {faceRegistered ? 'Active ✓' : 'Inactive'}
                    </span>
                 </div>
               </div>

               <div className="mt-8 pt-8 border-t border-gray-50">
                 <button onClick={handleLogout} className="w-full bg-red-50 text-red-600 py-4 rounded-2xl font-black hover:bg-red-100 transition-all">
                    Sign Out of Portal
                 </button>
               </div>
             </div>
          </div>
        )}
      </main>
      
      <footer className="max-w-6xl mx-auto px-4 py-8 text-center">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">Hostel Mess Management System</p>
        <p className="text-[10px] text-gray-300 tracking-widest">Build 1.2.4 • Secured with JWT & Biometrics</p>
      </footer>
      
      <style>{`
        .mirror-mode { transform: scaleX(-1); }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default StudentDashboard;
