import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI, faceAPI } from '../utils/api';
import { saveUser } from '../utils/auth';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights';

export const Login = () => {
  const [loginMode, setLoginMode] = useState('student'); // student, admin, face
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

  // Face login state
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [faceScanning, setFaceScanning] = useState(false);

  const videoRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const streamRef = useRef(null);
  const faceapiRef = useRef(null);
  const animFrameRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

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
      localStorage.setItem('isFirstLogin', response.data.isFirstLogin ? 'true' : 'false');
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
      localStorage.setItem('isFirstLogin', response.data.isFirstLogin ? 'true' : 'false');
      toast.success('Admin login successful!');
      setTimeout(() => navigate('/admin/dashboard'), 1000);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // ===== FACE LOGIN LOGIC =====

  const loadModels = async () => {
    if (modelsLoaded) return true;
    setModelsLoading(true);

    try {
      const faceapi = await import(
        /* webpackIgnore: true */
        'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/dist/face-api.esm.js'
      );
      faceapiRef.current = faceapi;

      await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);

      setModelsLoaded(true);
      setModelsLoading(false);
      return true;
    } catch (error) {
      console.error('Failed to load models:', error);
      setModelsLoading(false);
      setCameraError('Failed to load face detection models. Check your internet connection.');
      return false;
    }
  };

  const stopCamera = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setFaceDetected(false);
  };

  const startFaceLogin = async () => {
    setCameraError('');
    const loaded = await loadModels();
    if (!loaded) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
      startDetectionLoop();
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setCameraError('Camera permission denied. Please allow camera access.');
      } else if (err.name === 'NotFoundError') {
        setCameraError('No camera found.');
      } else {
        setCameraError('Camera error: ' + err.message);
      }
    }
  };

  const startDetectionLoop = useCallback(() => {
    const faceapi = faceapiRef.current;
    if (!faceapi || !videoRef.current) return;

    const detect = async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) {
        animFrameRef.current = requestAnimationFrame(detect);
        return;
      }

      try {
        const detections = await faceapi
          .detectAllFaces(videoRef.current)
          .withFaceLandmarks();

        const overlay = overlayCanvasRef.current;
        if (overlay && videoRef.current) {
          const dims = faceapi.matchDimensions(overlay, videoRef.current, true);
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
      } catch (e) {
        // Ignore
      }

      animFrameRef.current = requestAnimationFrame(detect);
    };
    detect();
  }, []);

  const handleFaceScan = async () => {
    const faceapi = faceapiRef.current;
    if (!faceapi || !videoRef.current) return;

    setFaceScanning(true);

    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        toast.error('No face detected. Please face the camera directly.');
        setFaceScanning(false);
        return;
      }

      const descriptor = Array.from(detection.descriptor);
      const response = await faceAPI.faceLogin(descriptor);

      saveUser(response.data.student, response.data.token);
      localStorage.setItem('isFirstLogin', response.data.isFirstLogin ? 'true' : 'false');

      stopCamera();
      const confidence = response.data.matchConfidence || 0;
      toast.success(`🎉 Face login successful! (${confidence}% confidence)`);
      setTimeout(() => navigate('/dashboard'), 1000);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Face login failed');
    } finally {
      setFaceScanning(false);
    }
  };

  const switchMode = (mode) => {
    if (mode !== 'face') stopCamera();
    setLoginMode(mode);
    setCameraError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center p-4">
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-2xl p-8">
          <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
            🏫 TPGIT Hostel Mess
          </h1>

          {/* Login Mode Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => switchMode('student')}
              className={`flex-1 py-2 rounded-lg font-semibold transition text-sm ${
                loginMode === 'student'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              🎓 Student
            </button>
            <button
              onClick={() => switchMode('admin')}
              className={`flex-1 py-2 rounded-lg font-semibold transition text-sm ${
                loginMode === 'admin'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              🔐 Admin
            </button>
            <button
              onClick={() => switchMode('face')}
              className={`flex-1 py-2 rounded-lg font-semibold transition text-sm ${
                loginMode === 'face'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              🧬 Face
            </button>
          </div>

          {/* Student Login */}
          {loginMode === 'student' && (
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
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600">
                  Don't have an account?{' '}
                  <Link to="/signup" className="text-blue-600 font-bold hover:underline">
                    Sign Up
                  </Link>
                </p>
              </div>
            </form>
          )}

          {/* Admin Login */}
          {loginMode === 'admin' && (
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

          {/* Face Login */}
          {loginMode === 'face' && (
            <div className="face-login-section">
              {cameraError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <p className="text-red-700 text-sm font-semibold">❌ {cameraError}</p>
                </div>
              )}

              {!cameraActive ? (
                <div className="text-center">
                  <div className="text-6xl mb-4">🧬</div>
                  <h3 className="text-lg font-bold text-gray-800 mb-2">Face Login</h3>
                  <p className="text-gray-500 text-sm mb-6">
                    Use your registered face to login instantly. Make sure you've registered your face from the Student Dashboard first.
                  </p>
                  <button
                    onClick={startFaceLogin}
                    disabled={modelsLoading}
                    className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50 transition"
                  >
                    {modelsLoading ? '⏳ Loading models...' : '🎥 Open Camera'}
                  </button>
                </div>
              ) : (
                <div>
                  {/* Camera Feed */}
                  <div className="face-login-camera-wrapper">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="face-login-video"
                    />
                    <canvas ref={overlayCanvasRef} className="face-login-overlay" />
                    <div className={`face-login-indicator ${faceDetected ? 'detected' : ''}`}>
                      {faceDetected ? '✅ Face Detected' : '⚠️ Looking for face...'}
                    </div>
                  </div>

                  {/* Scan & Cancel */}
                  <div className="mt-4 space-y-2">
                    <button
                      onClick={handleFaceScan}
                      disabled={!faceDetected || faceScanning}
                      className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50 transition"
                    >
                      {faceScanning ? '⏳ Scanning...' : '🔍 Scan & Login'}
                    </button>
                    <button
                      onClick={stopCamera}
                      className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300 transition"
                    >
                      ✕ Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
