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

  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const streamRef = useRef(null);
  const faceapiRef = useRef(null);
  const animFrameRef = useRef(null);

  // ===== HOISTED HELPER FUNCTIONS (Memoized) =====

  const stopCamera = useCallback(() => {
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
  }, []);

  const startFaceDetectionLoop = useCallback(() => {
    const faceapi = faceapiRef.current;
    if (!faceapi || !videoRef.current) return;

    const detect = async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) {
        animFrameRef.current = requestAnimationFrame(detect);
        return;
      }

      try {
        const options = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4 });
        const detections = await faceapi
          .detectAllFaces(videoRef.current, options)
          .withFaceLandmarks();

        const overlay = overlayCanvasRef.current;
        if (overlay && videoRef.current) {
          const dims = faceapi.matchDimensions(overlay, videoRef.current, false);
          const resized = faceapi.resizeResults(detections, dims);
          const ctx = overlay.getContext('2d');
          ctx.clearRect(0, 0, overlay.width, overlay.height);

          if (resized.length === 1) {
            setFaceDetected(true);
            const box = resized[0].detection.box;
            ctx.strokeStyle = '#10b981'; // emerald-500
            ctx.lineWidth = 4;
            ctx.strokeRect(box.x, box.y, box.width, box.height);
            
            // Draw landmarks points
            const landmarks = resized[0].landmarks;
            ctx.fillStyle = '#10b981';
            landmarks.positions.forEach(pt => {
              ctx.beginPath();
              ctx.arc(pt.x, pt.y, 2, 0, 2 * Math.PI);
              ctx.fill();
            });
          } else {
            setFaceDetected(false);
          }
        }
      } catch (e) {}
      animFrameRef.current = requestAnimationFrame(detect);
    };
    detect();
  }, []);

  const loadFaceModels = useCallback(async () => {
    try {
      setLoadingProgress('Initializing AI Engine...');
      const faceapi = await import(
        /* @vite-ignore */
        'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/dist/face-api.esm.js'
      );
      faceapiRef.current = faceapi;
      setLoadingProgress('Neural Network: SSD MobileNet...');
      await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
      setLoadingProgress('Neural Network: Face Landmarks...');
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      setLoadingProgress('Neural Network: Recognition...');
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      setModelsLoaded(true);
      setStep('ready');
      setLoadingProgress('');
    } catch (error) {
      console.error('Model load error:', error);
      setLoadingProgress('');
      setCameraError('AI Initialization failed. Please check your connection.');
    }
  }, []);

  const startCamera = async () => {
    setCameraError('');
    setCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      setStep('capturing');
    } catch (err) {
      setCameraActive(false);
      setCameraError('Camera access denied or not found.');
    }
  };

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
      const detection = await faceapi
        .detectSingleFace(videoRef.current)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        toast.error('No face detected. Stay still.');
        return;
      }

      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.width = 120; thumbCanvas.height = 90;
      thumbCanvas.getContext('2d').drawImage(videoRef.current, 0, 0, 120, 90);
      const thumbnail = thumbCanvas.toDataURL('image/jpeg', 0.8);

      const newCapture = {
        descriptor: Array.from(detection.descriptor),
        thumbnail,
        timestamp: Date.now(),
      };

      setCaptures((prev) => {
        const updated = [...prev, newCapture];
        if (updated.length >= REQUIRED_CAPTURES) setStep('processing');
        return updated;
      });
      toast.success(`📸 Sample ${captures.length + 1} captured!`);
    } catch (error) {
      toast.error('Capture failed.');
    }
  };

  const handleSubmit = async () => {
    if (captures.length < REQUIRED_CAPTURES) return;
    setSubmitting(true);
    try {
      const avgDescriptor = new Array(128).fill(0);
      captures.forEach(c => c.descriptor.forEach((v, i) => avgDescriptor[i] += v));
      avgDescriptor.forEach((_, i) => avgDescriptor[i] /= captures.length);

      await faceAPI.registerFace(avgDescriptor);
      toast.success('🎉 Identity Registered!');
      setStep('done');
      stopCamera();
      
      const storedUser = getStoredUser();
      if (storedUser) {
        storedUser.faceRegistered = true;
        localStorage.setItem('user', JSON.stringify(storedUser));
      }
      setTimeout(() => navigate('/dashboard'), 2500);
    } catch (error) {
      toast.error('Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetCaptures = () => {
    setCaptures([]);
    setStep('capturing');
  };

  // ===== EFFECTS (Bottom) =====

  useEffect(() => {
    const storedUser = getStoredUser();
    if (!storedUser) { navigate('/login'); return; }
    setUser(storedUser);
    loadFaceModels();
    return () => stopCamera();
  }, [navigate, loadFaceModels, stopCamera]);

  useEffect(() => {
    if (step === 'capturing' && streamRef.current && videoRef.current) {
      const video = videoRef.current;
      video.srcObject = streamRef.current;
      const onPlay = () => startFaceDetectionLoop();
      video.addEventListener('playing', onPlay);
      video.play().catch(e => console.error("Video play error:", e));
      return () => video.removeEventListener('playing', onPlay);
    }
  }, [step, startFaceDetectionLoop]);

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
         <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <ToastContainer position="top-right" autoClose={3000} />
      
      <div className="max-w-4xl mx-auto w-full p-4 md:p-8 flex-grow">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/dashboard')} 
              className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white shadow-sm border border-gray-100 hover:bg-gray-50 transition-all text-xl"
            >
              ←
            </button>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Biometric Enrollment</h1>
              <p className="text-slate-500 font-medium">Register your unique face profile for secure access</p>
            </div>
          </div>
          <div className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl font-bold text-sm border border-emerald-100">
             Enrollment #{user.registerNumber}
          </div>
        </div>

        {/* Setup Progress */}
        <div className="flex justify-between items-center mb-12 max-w-2xl mx-auto px-4">
          {['Models', 'Device', 'Capture', 'Active'].map((label, i) => {
            const stepIdx = step === 'loading' ? 0 : step === 'ready' ? 1 : step === 'capturing' ? 2 : step === 'processing' ? 3 : 4;
            const icon = i < stepIdx ? '✓' : i + 1;
            return (
              <div key={label} className="flex flex-col items-center gap-2 group">
                 <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-500 ${
                   i < stepIdx ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 
                   i === stepIdx ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 scale-110' : 'bg-gray-200 text-gray-400'
                 }`}>
                   {icon}
                 </div>
                 <span className={`text-[10px] font-black uppercase tracking-widest ${i <= stepIdx ? 'text-slate-900' : 'text-slate-300'}`}>
                   {label}
                 </span>
              </div>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Interaction Area */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Loading AI State */}
            {step === 'loading' && (
              <div className="bg-white rounded-[40px] p-20 text-center shadow-xl shadow-slate-200/50 border border-slate-100 animate-in fade-in duration-700">
                <div className="relative w-24 h-24 mx-auto mb-8">
                  <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <div className="absolute inset-4 bg-blue-50 rounded-full flex items-center justify-center text-2xl">🧠</div>
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">Powering up AI</h2>
                <p className="text-slate-500 font-medium mb-1">{loadingProgress}</p>
                <div className="w-48 h-1.5 bg-slate-100 mx-auto rounded-full mt-4 overflow-hidden">
                   <div className="h-full bg-blue-600 animate-pulse w-full"></div>
                </div>
              </div>
            )}

            {/* Error State */}
            {cameraError && (
              <div className="bg-red-50 rounded-[40px] p-12 text-center border border-red-100 shadow-xl shadow-red-500/5">
                <div className="text-6xl mb-6">⚠️</div>
                <h2 className="text-xl font-black text-red-900 mb-4">{cameraError}</h2>
                <button onClick={() => window.location.reload()} className="bg-red-600 text-white px-8 py-3.5 rounded-2xl font-black hover:bg-red-700 transition-all uppercase tracking-widest text-sm shadow-lg shadow-red-600/20">
                  Reload Portal
                </button>
              </div>
            )}

            {/* Ready State */}
            {step === 'ready' && !cameraError && (
              <div className="bg-white rounded-[40px] p-10 md:p-16 shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden relative group">
                <div className="relative z-10 text-center">
                  <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[28px] flex items-center justify-center text-4xl mx-auto mb-8 shadow-inner border border-blue-100">
                    📷
                  </div>
                  <h2 className="text-3xl font-black text-slate-900 mb-4">Initialize Camera</h2>
                  <p className="text-slate-500 text-lg mb-10 max-w-md mx-auto leading-relaxed">
                    We'll need to capture {REQUIRED_CAPTURES} distinct samples of your face to build a secure biometric profile.
                  </p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10 max-w-sm mx-auto">
                     {['Bright Light', 'Face Up', 'No Mask', 'No Glasses'].map(t => (
                       <div key={t} className="bg-slate-50 p-3 rounded-2xl text-[10px] font-black uppercase tracking-tight text-slate-400 border border-slate-100">{t}</div>
                     ))}
                  </div>

                  <button onClick={startCamera} className="group relative bg-blue-600 text-white px-10 py-5 rounded-[24px] font-black text-lg hover:bg-blue-700 active:scale-95 transition-all shadow-2xl shadow-blue-600/30 overflow-hidden">
                    <span className="relative z-10">Start Enrollment Process</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-transparent opacity-0 group-hover:opacity-20 transition-opacity"></div>
                  </button>
                </div>
                <div className="absolute bottom-[-10%] right-[-5%] w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-50"></div>
              </div>
            )}

            {/* Capturing State */}
            {(step === 'capturing' || step === 'processing') && !cameraError && (
              <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-500">
                <div className="bg-white rounded-[40px] p-4 md:p-8 shadow-2xl shadow-slate-200/50 border border-slate-100">
                  
                  {/* Camera Canvas Container */}
                  <div className="relative aspect-[4/3] bg-slate-900 rounded-[32px] overflow-hidden shadow-2xl border-4 border-white ring-8 ring-slate-100 group">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover mirror-mode opacity-90" />
                    <canvas ref={overlayCanvasRef} className="absolute inset-0 w-full h-full mirror-mode" />
                    
                    {/* UI Overlays */}
                    <div className="absolute top-6 left-6 flex items-center gap-3">
                       <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md border ${
                         faceDetected ? 'bg-emerald-500/80 text-white border-emerald-400' : 'bg-red-500/80 text-white border-red-400'
                       }`}>
                         {faceDetected ? '✓ Face Tracked' : '⚠️ No Signal'}
                       </div>
                    </div>

                    {captureCountdown && (
                      <div className="absolute inset-0 flex items-center justify-center bg-blue-600/40 backdrop-blur-sm animate-pulse">
                        <span className="text-9xl font-black text-white drop-shadow-2xl">{captureCountdown}</span>
                      </div>
                    )}

                    <div className="absolute bottom-6 inset-x-6 flex flex-col items-center">
                       <div className="w-full bg-slate-900/40 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                          <div className="flex justify-between items-center mb-2">
                             <span className="text-[10px] font-black text-white uppercase tracking-tighter">Biometric Progress</span>
                             <span className="text-[10px] font-black text-emerald-400 uppercase tracking-tighter">{Math.round((captures.length / REQUIRED_CAPTURES) * 100)}% Complete</span>
                          </div>
                          <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                             <div className="h-full bg-emerald-500 transition-all duration-700" style={{ width: `${(captures.length / REQUIRED_CAPTURES) * 100}%` }}></div>
                          </div>
                       </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-8 flex flex-col items-center gap-4">
                     {step === 'capturing' ? (
                       <button 
                         onClick={captureFrame} 
                         disabled={!faceDetected || captureCountdown !== null}
                         className="group bg-slate-900 text-white px-12 py-5 rounded-[24px] font-black text-lg hover:bg-black active:scale-[0.98] transition-all shadow-2xl shadow-slate-900/20 disabled:opacity-40"
                       >
                         {captureCountdown ? `Capturing...` : `Capture Sample #${captures.length + 1}`}
                       </button>
                     ) : (
                       <div className="flex flex-col items-center gap-4 w-full">
                         <div className="bg-emerald-50 text-emerald-700 px-6 py-3 rounded-2xl text-center font-bold text-sm tracking-tight border border-emerald-100 flex items-center gap-2">
                           ✨ Quality check passed! You're ready to register.
                         </div>
                         <div className="flex gap-4 w-full">
                           <button onClick={handleSubmit} disabled={submitting} className="flex-grow bg-emerald-600 text-white py-5 rounded-[24px] font-black text-lg shadow-xl shadow-emerald-500/20 active:scale-[0.98] transition-all hover:bg-emerald-700">
                             {submitting ? '🔒 Saving Profile...' : 'Finalize Registration'}
                           </button>
                           <button onClick={resetCaptures} disabled={submitting} className="bg-slate-100 text-slate-900 px-8 py-5 rounded-[24px] font-black hover:bg-slate-200 transition-all active:scale-[0.98]">
                             🔄
                           </button>
                         </div>
                       </div>
                     )}
                  </div>
                </div>
              </div>
            )}

            {/* Final Success State */}
            {step === 'done' && (
              <div className="bg-white rounded-[40px] p-20 text-center shadow-2xl shadow-emerald-500/10 border border-emerald-100 animate-in zoom-in duration-500">
                <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-5xl mx-auto mb-8 shadow-inner bounce-in">
                  🎉
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-2">Success!</h2>
                <p className="text-slate-500 font-medium mb-10">Your face ID is active. Returning to your dashboard...</p>
                <div className="w-12 h-2 bg-emerald-500 mx-auto rounded-full animate-pulse"></div>
              </div>
            )}
          </div>

          {/* Sidebar - Captured Gallery */}
          <div className="lg:col-span-4 space-y-6">
             <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 min-h-[300px]">
                <div className="flex items-center justify-between mb-6">
                   <h3 className="font-bold text-slate-900 uppercase text-xs tracking-widest">Enrollment Gallery</h3>
                   <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-0.5 rounded-full">{captures.length}/{REQUIRED_CAPTURES}</span>
                </div>
                
                {captures.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 opacity-20 filter grayscale">
                     <span className="text-5xl mb-4">🖼️</span>
                     <p className="text-[10px] font-black uppercase tracking-widest">Empty Workspace</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {captures.map((cap, i) => (
                      <div key={i} className="group relative aspect-square bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 hover:ring-2 hover:ring-blue-500 transition-all">
                        <img src={cap.thumbnail} alt="capture" className="w-full h-full object-cover mirror-mode" />
                        <div className="absolute inset-0 bg-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                           <span className="text-white font-black drop-shadow-lg text-lg">#{i + 1}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
             </div>
             
             {/* Info Tip */}
             <div className="bg-slate-900 rounded-[32px] p-8 text-white shadow-xl shadow-slate-900/10">
                <div className="text-2xl mb-4">🛡️</div>
                <h4 className="font-bold text-sm mb-2">Privacy Encryption</h4>
                <p className="text-xs text-slate-400 leading-relaxed font-medium">
                  We collect face descriptors (mathematical representations), not actual photos. Your biometric data is encrypted and used only for mess security.
                </p>
             </div>
          </div>
        </div>
      </div>
      
      <style>{`
        .mirror-mode { transform: scaleX(-1); }
        .bounce-in { animation: bounce 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        @keyframes bounce {
          0% { transform: scale(0.3); opacity: 0; }
          60% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default FaceRegistration;
