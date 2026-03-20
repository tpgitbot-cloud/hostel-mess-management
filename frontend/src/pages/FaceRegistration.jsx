import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { faceAPI } from '../utils/api';
import { getStoredUser } from '../utils/auth';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const REQUIRED_CAPTURES = 5;
const MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights';

export const FaceRegistration = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [step, setStep] = useState('loading'); // loading, ready, capturing, processing, done
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState('');
  const [captures, setCaptures] = useState([]);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [captureCountdown, setCaptureCountdown] = useState(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const streamRef = useRef(null);
  const faceapiRef = useRef(null);
  const animFrameRef = useRef(null);

  useEffect(() => {
    const storedUser = getStoredUser();
    if (!storedUser) {
      navigate('/login');
      return;
    }
    setUser(storedUser);
    loadFaceModels();

    return () => {
      stopCamera();
    };
  }, [navigate]);

  const loadFaceModels = async () => {
    try {
      setLoadingProgress('Loading face detection models...');

      // Dynamic import of face-api.js
      const faceapi = await import(
        /* webpackIgnore: true */
        'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/dist/face-api.esm.js'
      );
      faceapiRef.current = faceapi;

      setLoadingProgress('Loading SSD MobileNet model...');
      await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);

      setLoadingProgress('Loading Face Landmark model...');
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);

      setLoadingProgress('Loading Face Recognition model...');
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);

      setModelsLoaded(true);
      setStep('ready');
      setLoadingProgress('');
    } catch (error) {
      console.error('Failed to load face models:', error);
      setLoadingProgress('');
      setCameraError('Failed to load face detection models. Please check your internet connection and reload.');
    }
  };

  const startCamera = async () => {
    setCameraError('');
    setCameraActive(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setStep('capturing');
      startFaceDetectionLoop();
    } catch (err) {
      setCameraActive(false);
      if (err.name === 'NotAllowedError') {
        setCameraError('Camera permission denied. Please allow camera access.');
      } else if (err.name === 'NotFoundError') {
        setCameraError('No camera found on this device.');
      } else {
        setCameraError('Could not access camera: ' + err.message);
      }
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

  const startFaceDetectionLoop = useCallback(() => {
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
            // Draw face box with green color
            const box = resized[0].detection.box;
            ctx.strokeStyle = '#22c55e';
            ctx.lineWidth = 3;
            ctx.strokeRect(box.x, box.y, box.width, box.height);

            // Draw landmark points
            const landmarks = resized[0].landmarks;
            const points = landmarks.positions;
            ctx.fillStyle = '#22c55e';
            for (const pt of points) {
              ctx.beginPath();
              ctx.arc(pt.x, pt.y, 2, 0, 2 * Math.PI);
              ctx.fill();
            }
          } else {
            setFaceDetected(false);
            if (resized.length > 1) {
              // Multiple faces
              ctx.fillStyle = '#ef4444';
              ctx.font = '16px sans-serif';
              ctx.fillText('Multiple faces detected - only 1 face allowed', 10, 30);
            }
          }
        }
      } catch (e) {
        // Silently ignore detection errors
      }

      animFrameRef.current = requestAnimationFrame(detect);
    };

    detect();
  }, []);

  const captureFrame = async () => {
    const faceapi = faceapiRef.current;
    if (!faceapi || !videoRef.current) return;

    setCaptureCountdown(3);
    await new Promise((r) => setTimeout(r, 1000));
    setCaptureCountdown(2);
    await new Promise((r) => setTimeout(r, 1000));
    setCaptureCountdown(1);
    await new Promise((r) => setTimeout(r, 1000));
    setCaptureCountdown(null);

    try {
      // Get face descriptor
      const detection = await faceapi
        .detectSingleFace(videoRef.current)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        toast.error('No face detected. Please face the camera directly.');
        return;
      }

      // Capture a thumbnail
      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.width = 120;
      thumbCanvas.height = 90;
      const thumbCtx = thumbCanvas.getContext('2d');
      thumbCtx.drawImage(videoRef.current, 0, 0, 120, 90);
      const thumbnail = thumbCanvas.toDataURL('image/jpeg', 0.7);

      const newCapture = {
        descriptor: Array.from(detection.descriptor),
        thumbnail,
        timestamp: Date.now(),
      };

      setCaptures((prev) => {
        const updated = [...prev, newCapture];
        if (updated.length >= REQUIRED_CAPTURES) {
          setStep('processing');
        }
        return updated;
      });

      toast.success(`📸 Capture ${captures.length + 1}/${REQUIRED_CAPTURES} saved!`);
    } catch (error) {
      toast.error('Face capture failed. Please try again.');
      console.error('Capture error:', error);
    }
  };

  const handleSubmit = async () => {
    if (captures.length < REQUIRED_CAPTURES) {
      toast.error(`Please capture at least ${REQUIRED_CAPTURES} face samples.`);
      return;
    }

    setSubmitting(true);

    try {
      // Average all descriptors for better accuracy
      const avgDescriptor = new Array(128).fill(0);
      for (const capture of captures) {
        for (let i = 0; i < 128; i++) {
          avgDescriptor[i] += capture.descriptor[i];
        }
      }
      for (let i = 0; i < 128; i++) {
        avgDescriptor[i] /= captures.length;
      }

      await faceAPI.registerFace(avgDescriptor);
      toast.success('🎉 Face registered successfully!');
      setStep('done');
      stopCamera();

      // Update the stored user info
      const storedUser = getStoredUser();
      if (storedUser) {
        storedUser.faceRegistered = true;
        localStorage.setItem('user', JSON.stringify(storedUser));
      }

      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Face registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  const resetCaptures = () => {
    setCaptures([]);
    setStep('capturing');
  };

  if (!user) {
    return (
      <div className="face-page-wrapper">
        <div className="face-loading-screen">Loading...</div>
      </div>
    );
  }

  return (
    <div className="face-page-wrapper">
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="face-reg-container">
        {/* Header */}
        <div className="face-reg-header">
          <button onClick={() => navigate('/dashboard')} className="face-back-btn">
            ← Back
          </button>
          <h1 className="face-reg-title">🧬 Face Registration</h1>
          <p className="face-reg-subtitle">
            Register your face for quick scan-based login & meal tracking
          </p>
        </div>

        {/* Progress Steps */}
        <div className="face-steps">
          {['Load Models', 'Open Camera', 'Capture Faces', 'Register'].map((label, i) => {
            const stepIdx =
              step === 'loading' ? 0 :
              step === 'ready' ? 1 :
              step === 'capturing' ? 2 :
              step === 'processing' ? 3 :
              step === 'done' ? 4 : 0;

            return (
              <div
                key={label}
                className={`face-step ${i < stepIdx ? 'completed' : ''} ${i === stepIdx ? 'active' : ''}`}
              >
                <div className="face-step-circle">
                  {i < stepIdx ? '✓' : i + 1}
                </div>
                <span className="face-step-label">{label}</span>
              </div>
            );
          })}
        </div>

        {/* Loading Models */}
        {step === 'loading' && (
          <div className="face-card face-card-center">
            <div className="face-spinner"></div>
            <p className="face-loading-text">{loadingProgress}</p>
            <p className="face-hint">This may take a moment on first load...</p>
          </div>
        )}

        {/* Camera Error */}
        {cameraError && (
          <div className="face-error-card">
            <p className="face-error-icon">❌</p>
            <p className="face-error-text">{cameraError}</p>
            <button onClick={() => { setCameraError(''); startCamera(); }} className="face-btn face-btn-primary">
              Try Again
            </button>
          </div>
        )}

        {/* Ready to Start */}
        {step === 'ready' && !cameraError && (
          <div className="face-card face-card-center">
            <div className="face-ready-icon">📷</div>
            <h2 className="face-card-title">Camera Ready</h2>
            <p className="face-card-desc">
              We'll capture {REQUIRED_CAPTURES} face samples to create your face profile.
              Make sure you're in a well-lit area and facing the camera directly.
            </p>
            <div className="face-tips">
              <div className="face-tip">💡 Good lighting</div>
              <div className="face-tip">😐 Face the camera</div>
              <div className="face-tip">🚫 No sunglasses</div>
              <div className="face-tip">👤 One person only</div>
            </div>
            <button onClick={startCamera} className="face-btn face-btn-primary face-btn-lg">
              🎥 Start Camera
            </button>
          </div>
        )}

        {/* Capturing */}
        {(step === 'capturing' || step === 'processing') && !cameraError && (
          <div className="face-capture-area">
            {/* Camera View */}
            <div className="face-camera-wrapper">
              <div className="face-camera-container">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="face-camera-video"
                />
                <canvas ref={overlayCanvasRef} className="face-camera-overlay" />

                {/* Countdown */}
                {captureCountdown && (
                  <div className="face-countdown">
                    <span>{captureCountdown}</span>
                  </div>
                )}

                {/* Face Status Indicator */}
                <div className={`face-status-indicator ${faceDetected ? 'detected' : 'not-detected'}`}>
                  {faceDetected ? '✅ Face Detected' : '⚠️ No Face Detected'}
                </div>
              </div>

              {/* Capture Progress */}
              <div className="face-capture-progress">
                <div className="face-progress-bar">
                  <div
                    className="face-progress-fill"
                    style={{ width: `${(captures.length / REQUIRED_CAPTURES) * 100}%` }}
                  ></div>
                </div>
                <p className="face-progress-text">
                  {captures.length} / {REQUIRED_CAPTURES} captures
                </p>
              </div>

              {/* Capture Button */}
              {step === 'capturing' && (
                <div className="face-capture-actions">
                  <button
                    onClick={captureFrame}
                    disabled={!faceDetected || captureCountdown !== null}
                    className="face-btn face-btn-capture"
                  >
                    {captureCountdown
                      ? `📸 Capturing in ${captureCountdown}...`
                      : `📸 Capture Face (${captures.length + 1}/${REQUIRED_CAPTURES})`
                    }
                  </button>
                  <button onClick={() => { stopCamera(); setStep('ready'); setCaptures([]); }} className="face-btn face-btn-cancel">
                    ✕ Cancel
                  </button>
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {captures.length > 0 && (
              <div className="face-thumbnails">
                <h3 className="face-thumbnails-title">Captured Samples</h3>
                <div className="face-thumbnails-grid">
                  {captures.map((cap, i) => (
                    <div key={i} className="face-thumbnail">
                      <img src={cap.thumbnail} alt={`Capture ${i + 1}`} />
                      <span className="face-thumbnail-label">#{i + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submit */}
            {step === 'processing' && (
              <div className="face-submit-area">
                <div className="face-success-msg">
                  <p>✅ All {REQUIRED_CAPTURES} captures collected!</p>
                  <p className="face-hint">Review the captures above and submit to register your face.</p>
                </div>
                <div className="face-submit-actions">
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="face-btn face-btn-primary face-btn-lg"
                  >
                    {submitting ? '⏳ Registering...' : '🧬 Register Face'}
                  </button>
                  <button onClick={resetCaptures} disabled={submitting} className="face-btn face-btn-secondary">
                    🔄 Retake All
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Done */}
        {step === 'done' && (
          <div className="face-card face-card-center face-done-card">
            <div className="face-done-icon">🎉</div>
            <h2 className="face-card-title">Face Registered!</h2>
            <p className="face-card-desc">
              Your face has been registered successfully. You can now use face-based login and meal scanning.
            </p>
            <p className="face-hint">Redirecting to dashboard...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FaceRegistration;
