import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI, authAPI } from '../utils/api';
import { clearAuth, getStoredUser, getUserRole } from '../utils/auth';
import { toast, ToastContainer } from 'react-toastify';
import { QRCodeSVG } from 'qrcode.react';

const HOSTELS = ['B1', 'B2', 'B3', 'G1', 'G2'];
const DEPARTMENTS = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT'];
const YEARS = [1, 2, 3, 4];

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

  // Add Student
  const [showAddForm, setShowAddForm] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [newStudent, setNewStudent] = useState({
    name: '', registerNumber: '', department: 'CSE', year: '1',
    hostel: '', mobile: '', email: '', photo: null,
  });

  // Edit Student
  const [editingStudent, setEditingStudent] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '', department: 'CSE', year: '1', hostel: '', mobile: '', email: '', photo: null,
  });
  const [editLoading, setEditLoading] = useState(false);

  // Prices
  const [priceForm, setPriceForm] = useState({ breakfast: '', lunch: '', dinner: '' });
  const [priceLoading, setPriceLoading] = useState(false);

  // Staff Management
  const [staffList, setStaffList] = useState([]);
  const [newStaff, setNewStaff] = useState({ name: '', email: '', hostel: 'B1' });
  const [staffPassword, setStaffPassword] = useState('');
  const [staffLoading, setStaffLoading] = useState(false);

  // Meal Status
  const [mealStatus, setMealStatus] = useState(null);
  const [statusFilters, setStatusFilters] = useState({ department: '', hostel: '', year: '', mealFilter: 'all' });
  const [statusSort, setStatusSort] = useState({ field: 'name', dir: 'asc' });
  const [statusLoading, setStatusLoading] = useState(false);

  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', newPass: '', confirm: '' });

  // Face Scanner State
  const [faceModelsLoaded, setFaceModelsLoaded] = useState(false);
  const [faceModelsLoading, setFaceModelsLoading] = useState(false);
  const [faceScannerActive, setFaceScannerActive] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceScanning, setFaceScanning] = useState(false);
  const [identifiedStudent, setIdentifiedStudent] = useState(null);
  const [scanMessage, setScanMessage] = useState('');

  const faceVideoRef = React.useRef(null);
  const faceOverlayRef = React.useRef(null);
  const faceStreamRef = React.useRef(null);
  const faceapiRef = React.useRef(null);
  const faceAnimRef = React.useRef(null);

  const isMasterAdmin = user?.role === 'master_admin';

  useEffect(() => {
    const storedUser = getStoredUser();
    if (!storedUser) { navigate('/login'); return; }
    setUser(storedUser);

    // Set default hostel for student form
    if (storedUser.hostel && storedUser.hostel !== 'ALL') {
      setNewStudent(prev => ({ ...prev, hostel: storedUser.hostel }));
    }

    // Check first login
    const isFirst = localStorage.getItem('isFirstLogin');
    if (isFirst === 'true') {
      setShowPasswordChange(true);
    }

    loadDashboardData();
  }, [navigate]);

  const loadDashboardData = async () => {
    try {
      const results = await Promise.allSettled([
        adminAPI.getStudents({ limit: 500 }),
        adminAPI.getMealStats(),
        adminAPI.getEggStats(),
        adminAPI.getPrices(),
      ]);
      if (results[0].status === 'fulfilled') setStudents(results[0].value.data.students || []);
      if (results[1].status === 'fulfilled') setMealStats(results[1].value.data);
      if (results[2].status === 'fulfilled') setEggStats(results[2].value.data);
      if (results[3].status === 'fulfilled') {
        const p = results[3].value.data;
        setPrices(p);
        setPriceForm({ breakfast: p.breakfast?.toString() || '', lunch: p.lunch?.toString() || '', dinner: p.dinner?.toString() || '' });
      }
    } catch (e) { console.error(e); }
  };

  const handleLogout = () => { clearAuth(); navigate('/login'); };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPass !== passwordForm.confirm) {
      toast.error('Passwords do not match'); return;
    }
    if (passwordForm.newPass.length < 6) {
      toast.error('Password must be at least 6 characters'); return;
    }
    try {
      await authAPI.changePassword(passwordForm.current, passwordForm.newPass);
      toast.success('Password changed successfully!');
      localStorage.setItem('isFirstLogin', 'false');
      setShowPasswordChange(false);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to change password');
    }
  };

  useEffect(() => {
    return () => {
      stopFaceScanner();
    };
  }, []);

  const loadFaceModels = async () => {
    if (faceModelsLoaded) return true;
    setFaceModelsLoading(true);
    try {
      const faceapi = await import(
        /* webpackIgnore: true */
        'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/dist/face-api.esm.js'
      );
      faceapiRef.current = faceapi;
      const MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights';
      await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      setFaceModelsLoaded(true);
      setFaceModelsLoading(false);
      return true;
    } catch (error) {
      console.error('Failed to load face models:', error);
      setFaceModelsLoading(false);
      toast.error('Failed to load face detection models');
      return false;
    }
  };

  const stopFaceScanner = () => {
    if (faceAnimRef.current) cancelAnimationFrame(faceAnimRef.current);
    if (faceStreamRef.current) {
      faceStreamRef.current.getTracks().forEach((t) => t.stop());
      faceStreamRef.current = null;
    }
    setFaceScannerActive(false);
    setIdentifiedStudent(null);
    setScanMessage('');
  };

  const startFaceScanner = async () => {
    const loaded = await loadFaceModels();
    if (!loaded) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      faceStreamRef.current = stream;
      if (faceVideoRef.current) {
        faceVideoRef.current.srcObject = stream;
        await faceVideoRef.current.play();
      }
      setFaceScannerActive(true);
      startFaceDetectionLoop();
    } catch (err) {
      toast.error('Camera error: ' + err.message);
    }
  };

  const startFaceDetectionLoop = () => {
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
          const dims = faceapi.matchDimensions(overlay, faceVideoRef.current, true);
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
  };

  const handleAdminFaceScan = async () => {
    const faceapi = faceapiRef.current;
    if (!faceapi || !faceVideoRef.current) return;

    setFaceScanning(true);
    setScanMessage('Scanning face...');
    try {
      const detection = await faceapi
        .detectSingleFace(faceVideoRef.current)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        toast.error('No face detected');
        setFaceScanning(false);
        setScanMessage('');
        return;
      }

      const descriptor = Array.from(detection.descriptor);
      const res = await import('../utils/api').then(m => m.faceAPI.faceScanMeal(descriptor, 'BREAKFAST')); // use dummy mealType for identification
      setIdentifiedStudent(res.data.student);
      setScanMessage(`Identified: ${res.data.student.name} (${res.data.matchConfidence}% confidence)`);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Identification failed');
      setScanMessage('');
    } finally {
      setFaceScanning(false);
    }
  };

  const markMealForStudent = async (mealType) => {
    if (!identifiedStudent) return;
    try {
      await import('../utils/api').then(m => m.scanAPI.scanMeal(mealType, identifiedStudent._id));
      toast.success(`${mealType} marked for ${identifiedStudent.name}`);
      setScanMessage(`✅ ${mealType} Marked!`);
      // Optional: keep identified student visible for a moment
    } catch (error) {
      toast.error(error.response?.data?.error || 'Marking meal failed');
    }
  };

  const markEggForStudent = async () => {
    if (!identifiedStudent) return;
    try {
      await import('../utils/api').then(m => m.scanAPI.scanEgg(identifiedStudent._id));
      toast.success(`Egg marked for ${identifiedStudent.name}`);
      setScanMessage(`✅ Egg Marked!`);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Marking egg failed');
    }
  };

  // Student CRUD and other methods continue...
  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!newStudent.name || !newStudent.registerNumber || !newStudent.mobile || !newStudent.hostel) {
      toast.error('Please fill all required fields'); return;
    }
    if (!/^\d{10}$/.test(newStudent.mobile)) {
      toast.error('Mobile number must be 10 digits'); return;
    }
    setAddLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', newStudent.name.trim());
      formData.append('registerNumber', newStudent.registerNumber.trim().toUpperCase());
      formData.append('department', newStudent.department);
      formData.append('year', newStudent.year);
      formData.append('hostel', newStudent.hostel);
      formData.append('mobile', newStudent.mobile.trim());
      if (newStudent.email) formData.append('email', newStudent.email.trim().toLowerCase());
      if (newStudent.photo) formData.append('photo', newStudent.photo);

      const res = await adminAPI.addStudent(formData);
      toast.success('Student added! They can login using their Register Number as the initial password.');
      setNewStudent({ name: '', registerNumber: '', department: 'CSE', year: '1',
        hostel: user?.hostel !== 'ALL' ? user.hostel : '', mobile: '', email: '', photo: null });
      loadDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to add student');
    } finally { setAddLoading(false); }
  };

  const handleDeleteStudent = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this student? This action cannot be undone.')) return;
    try { await adminAPI.deleteStudent(id); toast.success('Student permanently deleted'); loadDashboardData(); }
    catch { toast.error('Failed to delete'); }
  };

  // ===== Edit Student =====
  const handleEditClick = (student) => {
    setEditingStudent(student);
    setEditForm({
      name: student.name || '',
      department: student.department || 'CSE',
      year: String(student.year) || '1',
      hostel: student.hostel || '',
      mobile: student.mobile || '',
      email: student.email || '',
      photo: null,
    });
  };

  const handleEditStudent = async (e) => {
    e.preventDefault();
    if (!editingStudent) return;
    setEditLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', editForm.name.trim());
      formData.append('department', editForm.department);
      formData.append('year', editForm.year);
      formData.append('hostel', editForm.hostel);
      formData.append('mobile', editForm.mobile.trim());
      if (editForm.email) formData.append('email', editForm.email.trim().toLowerCase());
      if (editForm.photo) formData.append('photo', editForm.photo);

      await adminAPI.updateStudent(editingStudent._id, formData);
      toast.success('Student updated successfully!');
      setEditingStudent(null);
      loadDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update student');
    } finally { setEditLoading(false); }
  };

  const handleUploadCSV = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setLoading(true);
    try {
      const res = await adminAPI.uploadCSV(file);
      toast.success(`${res.data.successCount} students imported! Initial password is their Register Number.`);
      loadDashboardData();
    } catch { toast.error('CSV upload failed'); }
    finally { setLoading(false); e.target.value = ''; }
  };

  // ===== Staff Management =====
  const loadStaff = async () => {
    try { const res = await adminAPI.getStaff(); setStaffList(res.data.staff || []); }
    catch { toast.error('Failed to load staff'); }
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    if (!newStaff.name || !newStaff.email || !newStaff.hostel) {
      toast.error('Fill all fields'); return;
    }
    setStaffLoading(true);
    try {
      const res = await adminAPI.addStaff(newStaff);
      setStaffPassword(res.data.generatedPassword);
      toast.success('Staff added! Note the password below.');
      setNewStaff({ name: '', email: '', hostel: 'B1' });
      loadStaff();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to add staff');
    } finally { setStaffLoading(false); }
  };

  const handleDeleteStaff = async (id) => {
    if (!window.confirm('Are you sure you want to permanently remove this staff member? This action cannot be undone.')) return;
    try { await adminAPI.deleteStaff(id); toast.success('Staff permanently removed'); loadStaff(); }
    catch { toast.error('Failed to remove staff'); }
  };

  // ===== Meal Status =====
  const loadMealStatus = async () => {
    setStatusLoading(true);
    try {
      const params = {};
      if (statusFilters.department) params.department = statusFilters.department;
      if (statusFilters.hostel) params.hostel = statusFilters.hostel;
      if (statusFilters.year) params.year = statusFilters.year;
      const res = await adminAPI.getMealStatus(params);
      setMealStatus(res.data);
    } catch { toast.error('Failed to load meal status'); }
    finally { setStatusLoading(false); }
  };

  // ===== Prices =====
  const handleSetPrices = async (e) => {
    e.preventDefault();
    setPriceLoading(true);
    try {
      await adminAPI.setPrices(parseFloat(priceForm.breakfast), parseFloat(priceForm.lunch), parseFloat(priceForm.dinner));
      toast.success('Prices saved!'); loadDashboardData();
    } catch { toast.error('Failed to save prices'); }
    finally { setPriceLoading(false); }
  };

  const handlePrintQR = (mealType) => {
    const el = document.getElementById(`qr-${mealType}`);
    if (!el) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>QR - ${mealType}</title></head>
      <body style="text-align:center;font-family:Arial;padding:40px;">
      <h1 style="color:#2563eb;">🏫 TPGIT Hostel Mess</h1>
      <h2>${mealType}</h2>${new XMLSerializer().serializeToString(el)}
      <p style="color:#999;margin-top:20px;">Scan with phone camera</p>
      <script>window.onload=function(){window.print();}<\/script></body></html>`);
    w.document.close();
  };

  if (!user) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>;

  // Filter & sort students
  const filteredStudents = students.filter(s =>
    ((s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
     (s.registerNumber || '').toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Sort meal status students
  const sortedMealStudents = (mealStatus?.students || [])
    .filter(s => {
      if (statusFilters.mealFilter === 'ate_breakfast') return s.breakfast;
      if (statusFilters.mealFilter === 'not_breakfast') return !s.breakfast;
      if (statusFilters.mealFilter === 'ate_lunch') return s.lunch;
      if (statusFilters.mealFilter === 'not_lunch') return !s.lunch;
      if (statusFilters.mealFilter === 'ate_dinner') return s.dinner;
      if (statusFilters.mealFilter === 'not_dinner') return !s.dinner;
      return true;
    })
    .sort((a, b) => {
      const dir = statusSort.dir === 'asc' ? 1 : -1;
      if (statusSort.field === 'name') return dir * a.name.localeCompare(b.name);
      if (statusSort.field === 'department') return dir * a.department.localeCompare(b.department);
      if (statusSort.field === 'hostel') return dir * a.hostel.localeCompare(b.hostel);
      if (statusSort.field === 'totalMeals') return dir * (a.totalMeals - b.totalMeals);
      return 0;
    });

  const tabs = ['dashboard', 'students', 'meal-status', 'qr-codes', 'reports', 'face-scanner', 'settings'];
  if (isMasterAdmin) tabs.splice(tabs.length - 1, 0, 'staff');

  return (
    <div className="min-h-screen bg-gray-100">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Password Change Modal */}
      {showPasswordChange && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="bg-white rounded-xl p-8 shadow-xl" style={{ maxWidth: 400, width: '90%' }}>
            <h2 className="text-xl font-bold mb-4 text-blue-600">🔐 Change Your Password</h2>
            <p className="text-sm text-gray-600 mb-4">You must change your password on first login.</p>
            <form onSubmit={handleChangePassword}>
              <input type="password" placeholder="Current Password" value={passwordForm.current}
                onChange={e => setPasswordForm({ ...passwordForm, current: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg mb-3" required />
              <input type="password" placeholder="New Password (min 6 chars)" value={passwordForm.newPass}
                onChange={e => setPasswordForm({ ...passwordForm, newPass: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg mb-3" required minLength={6} />
              <input type="password" placeholder="Confirm New Password" value={passwordForm.confirm}
                onChange={e => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg mb-4" required />
              <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700">
                Update Password
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {editingStudent && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="bg-white rounded-xl p-8 shadow-xl" style={{ maxWidth: 550, width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-blue-600">✏️ Edit Student</h2>
              <button onClick={() => setEditingStudent(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <p className="text-sm text-gray-500 mb-4">Reg No: <span className="font-mono font-bold">{editingStudent.registerNumber}</span></p>
            <form onSubmit={handleEditStudent}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold mb-1">Full Name *</label>
                  <input type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Hostel *</label>
                  <select value={editForm.hostel} onChange={e => setEditForm({ ...editForm, hostel: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-white" required
                    disabled={user?.hostel && user.hostel !== 'ALL'}>
                    <option value="">Select Hostel</option>
                    {HOSTELS.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Department *</label>
                  <select value={editForm.department} onChange={e => setEditForm({ ...editForm, department: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-white" required>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Year *</label>
                  <select value={editForm.year} onChange={e => setEditForm({ ...editForm, year: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-white" required>
                    {YEARS.map(y => <option key={y} value={y}>{y} Year</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Mobile *</label>
                  <input type="tel" value={editForm.mobile} maxLength={10}
                    onChange={e => setEditForm({ ...editForm, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    className="w-full px-3 py-2 border rounded-lg" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Email</label>
                  <input type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-1">Photo (optional, upload new to replace)</label>
                  <input type="file" accept="image/*" onChange={e => setEditForm({ ...editForm, photo: e.target.files[0] || null })}
                    className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
              </div>
              <div className="mt-5 flex gap-3">
                <button type="submit" disabled={editLoading}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50">
                  {editLoading ? '⏳ Saving...' : '💾 Save Changes'}
                </button>
                <button type="button" onClick={() => setEditingStudent(null)}
                  className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-semibold hover:bg-gray-400">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-blue-600">🏫 TPGIT Hostel Mess</h1>
            <p className="text-xs text-gray-500">
              {user.name} • {isMasterAdmin ? '👑 Master Admin' : `📋 Staff (${user.hostel})`}
            </p>
          </div>
          <button onClick={handleLogout} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm">
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map(tab => (
            <button key={tab} onClick={() => {
              if (activeTab === 'face-scanner') stopFaceScanner();
              setActiveTab(tab);
              if (tab === 'staff') loadStaff();
              if (tab === 'meal-status') loadMealStatus();
            }}
              className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap text-sm ${
                activeTab === tab ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {tab === 'meal-status' ? '📊 Meal Status' : 
               tab === 'qr-codes' ? '📱 QR Codes' :
               tab === 'face-scanner' ? '🧬 Face Scanner' :
               tab === 'staff' ? '👥 Staff' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* ========== DASHBOARD ========== */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-5">
              <h3 className="text-gray-600 font-semibold mb-1 text-sm">Total Students</h3>
              <p className="text-3xl font-bold text-blue-600">{students.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-5">
              <h3 className="text-gray-600 font-semibold mb-1 text-sm">Today's Meals</h3>
              <p className="text-3xl font-bold text-green-600">{mealStats?.stats?.total || 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-5">
              <h3 className="text-gray-600 font-semibold mb-1 text-sm">Eggs</h3>
              <p className="text-3xl font-bold text-yellow-600">{eggStats?.eggCount || 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-5">
              <h3 className="text-gray-600 font-semibold mb-1 text-sm">Meal Breakdown</h3>
              <div className="text-sm mt-1">
                <p>🍳 {mealStats?.stats?.breakfast || 0}</p>
                <p>🥗 {mealStats?.stats?.lunch || 0}</p>
                <p>🍖 {mealStats?.stats?.dinner || 0}</p>
              </div>
            </div>
          </div>
        )}

        {/* ========== STUDENTS ========== */}
        {activeTab === 'students' && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex flex-wrap justify-between items-center mb-4 gap-3">
              <h2 className="text-xl font-bold">Student Management</h2>
              <div className="flex gap-2">
                <button onClick={() => { setShowAddForm(!showAddForm); setGeneratedPassword(''); }}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm ${showAddForm ? 'bg-gray-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                  {showAddForm ? '✕ Cancel' : '➕ Add Student'}
                </button>
                <label className="cursor-pointer bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-semibold">
                  📤 CSV Import
                  <input type="file" accept=".csv,.xlsx" onChange={handleUploadCSV} className="hidden" disabled={loading} />
                </label>
              </div>
            </div>

            {showAddForm && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 mb-5">
                <h3 className="font-bold text-blue-800 mb-3">📝 Add New Student</h3>
                <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3 mb-4">
                  <p className="font-bold text-yellow-800">ℹ️ Initial Login Information:</p>
                  <p className="text-sm text-yellow-700 mt-1">Students can login using their **Register Number** as both ID and Initial Password. They will be forced to change it on first login.</p>
                </div>
                <form onSubmit={handleAddStudent}>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-semibold mb-1">Full Name *</label>
                      <input type="text" value={newStudent.name} onChange={e => setNewStudent({ ...newStudent, name: e.target.value })}
                        placeholder="John Doe" className="w-full px-3 py-2 border rounded-lg" required />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">Register Number *</label>
                      <input type="text" value={newStudent.registerNumber} onChange={e => setNewStudent({ ...newStudent, registerNumber: e.target.value })}
                        placeholder="2021CSE001" className="w-full px-3 py-2 border rounded-lg uppercase" required />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">Hostel *</label>
                      <select value={newStudent.hostel} onChange={e => setNewStudent({ ...newStudent, hostel: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg bg-white" required
                        disabled={user?.hostel && user.hostel !== 'ALL'}>
                        <option value="">Select Hostel</option>
                        {HOSTELS.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">Department *</label>
                      <select value={newStudent.department} onChange={e => setNewStudent({ ...newStudent, department: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg bg-white" required>
                        {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">Year *</label>
                      <select value={newStudent.year} onChange={e => setNewStudent({ ...newStudent, year: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg bg-white" required>
                        {YEARS.map(y => <option key={y} value={y}>{y} Year</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">Mobile *</label>
                      <input type="tel" value={newStudent.mobile} maxLength={10}
                        onChange={e => setNewStudent({ ...newStudent, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                        placeholder="9876543210" className="w-full px-3 py-2 border rounded-lg" required />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">Email (optional)</label>
                      <input type="email" value={newStudent.email} onChange={e => setNewStudent({ ...newStudent, email: e.target.value })}
                        placeholder="john@email.com" className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">Photo (optional)</label>
                      <input type="file" accept="image/*" onChange={e => setNewStudent({ ...newStudent, photo: e.target.files[0] || null })}
                        className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                  </div>
                  <p className="text-sm text-blue-700 mt-3">🔐 Password will be auto-generated. No need to enter manually.</p>
                  <div className="mt-4 flex gap-3">
                    <button type="submit" disabled={addLoading}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50">
                      {addLoading ? '⏳ Adding...' : '✅ Add Student'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <input type="text" placeholder="🔍 Search by name or register number..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg mb-4" />

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">Reg No</th>
                    <th className="px-3 py-2 text-left">Hostel</th>
                    <th className="px-3 py-2 text-left">Dept</th>
                    <th className="px-3 py-2 text-left">Year</th>
                    <th className="px-3 py-2 text-left">Mobile</th>
                    <th className="px-3 py-2 text-center">Face</th>
                    <th className="px-3 py-2 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length === 0 ? (
                    <tr><td colSpan="8" className="px-4 py-6 text-center text-gray-500">No students found.</td></tr>
                  ) : filteredStudents.map(s => (
                    <tr key={s._id} className="border-t hover:bg-gray-50">
                      <td className="px-3 py-2">{s.name}</td>
                      <td className="px-3 py-2 font-mono">{s.registerNumber}</td>
                      <td className="px-3 py-2"><span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded font-bold">{s.hostel}</span></td>
                      <td className="px-3 py-2">{s.department}</td>
                      <td className="px-3 py-2">{s.year}</td>
                      <td className="px-3 py-2">{s.mobile}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${s.faceRegistered ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {s.faceRegistered ? '✅ Registered' : '❌ Not Set'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex gap-1 justify-center">
                          <button onClick={() => handleEditClick(s)} className="bg-yellow-500 text-white px-2 py-1 rounded text-xs hover:bg-yellow-600">✏️ Edit</button>
                          <button onClick={() => handleDeleteStudent(s._id)} className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700">🗑️ Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========== MEAL STATUS ========== */}
        {activeTab === 'meal-status' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">📊 Today's Meal Status — Who Ate & Who Didn't</h2>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-4">
              {isMasterAdmin && (
                <select value={statusFilters.hostel} onChange={e => setStatusFilters({ ...statusFilters, hostel: e.target.value })}
                  className="px-3 py-2 border rounded-lg bg-white text-sm">
                  <option value="">All Hostels</option>
                  {HOSTELS.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              )}
              <select value={statusFilters.department} onChange={e => setStatusFilters({ ...statusFilters, department: e.target.value })}
                className="px-3 py-2 border rounded-lg bg-white text-sm">
                <option value="">All Departments</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select value={statusFilters.year} onChange={e => setStatusFilters({ ...statusFilters, year: e.target.value })}
                className="px-3 py-2 border rounded-lg bg-white text-sm">
                <option value="">All Years</option>
                {YEARS.map(y => <option key={y} value={y}>{y} Year</option>)}
              </select>
              <select value={statusFilters.mealFilter} onChange={e => setStatusFilters({ ...statusFilters, mealFilter: e.target.value })}
                className="px-3 py-2 border rounded-lg bg-white text-sm font-semibold">
                <option value="all">All Students</option>
                <option value="ate_breakfast">✅ Ate Breakfast</option>
                <option value="not_breakfast">❌ Didn't Eat Breakfast</option>
                <option value="ate_lunch">✅ Ate Lunch</option>
                <option value="not_lunch">❌ Didn't Eat Lunch</option>
                <option value="ate_dinner">✅ Ate Dinner</option>
                <option value="not_dinner">❌ Didn't Eat Dinner</option>
              </select>
              <button onClick={loadMealStatus} disabled={statusLoading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                {statusLoading ? '⏳...' : '🔄 Refresh'}
              </button>
            </div>

            {/* Summary Cards */}
            {mealStatus?.summary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-sm text-gray-600">Total Students</p>
                  <p className="text-2xl font-bold text-blue-600">{mealStatus.summary.total}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-sm text-gray-600">🍳 Breakfast</p>
                  <p className="text-lg font-bold text-green-600">{mealStatus.summary.breakfast.ate} ✅</p>
                  <p className="text-sm text-red-500">{mealStatus.summary.breakfast.notAte} ❌</p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-3 text-center">
                  <p className="text-sm text-gray-600">🥗 Lunch</p>
                  <p className="text-lg font-bold text-green-600">{mealStatus.summary.lunch.ate} ✅</p>
                  <p className="text-sm text-red-500">{mealStatus.summary.lunch.notAte} ❌</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 text-center">
                  <p className="text-sm text-gray-600">🍖 Dinner</p>
                  <p className="text-lg font-bold text-green-600">{mealStatus.summary.dinner.ate} ✅</p>
                  <p className="text-sm text-red-500">{mealStatus.summary.dinner.notAte} ❌</p>
                </div>
              </div>
            )}

            {/* Sort buttons */}
            <div className="flex gap-2 mb-3 text-xs">
              <span className="text-gray-500 pt-1">Sort by:</span>
              {[['name', 'Name'], ['department', 'Dept'], ['hostel', 'Hostel'], ['totalMeals', 'Meals']].map(([f, l]) => (
                <button key={f} onClick={() => setStatusSort({ field: f, dir: statusSort.field === f && statusSort.dir === 'asc' ? 'desc' : 'asc' })}
                  className={`px-2 py-1 rounded ${statusSort.field === f ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                  {l} {statusSort.field === f ? (statusSort.dir === 'asc' ? '↑' : '↓') : ''}
                </button>
              ))}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">Reg No</th>
                    <th className="px-3 py-2 text-left">Hostel</th>
                    <th className="px-3 py-2 text-left">Dept</th>
                    <th className="px-3 py-2 text-center">🍳 Breakfast</th>
                    <th className="px-3 py-2 text-center">🥗 Lunch</th>
                    <th className="px-3 py-2 text-center">🍖 Dinner</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedMealStudents.length === 0 ? (
                    <tr><td colSpan="7" className="px-4 py-6 text-center text-gray-500">
                      {statusLoading ? 'Loading...' : 'No data. Click 🔄 Refresh to load.'}
                    </td></tr>
                  ) : sortedMealStudents.map(s => (
                    <tr key={s._id} className="border-t hover:bg-gray-50">
                      <td className="px-3 py-2 font-semibold">{s.name}</td>
                      <td className="px-3 py-2 font-mono text-xs">{s.registerNumber}</td>
                      <td className="px-3 py-2"><span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded font-bold">{s.hostel}</span></td>
                      <td className="px-3 py-2">{s.department}</td>
                      <td className="px-3 py-2 text-center text-lg">{s.breakfast ? '✅' : '❌'}</td>
                      <td className="px-3 py-2 text-center text-lg">{s.lunch ? '✅' : '❌'}</td>
                      <td className="px-3 py-2 text-center text-lg">{s.dinner ? '✅' : '❌'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-gray-500 mt-2">Showing {sortedMealStudents.length} students</p>
            </div>
          </div>
        )}

        {/* ========== QR CODES ========== */}
        {activeTab === 'qr-codes' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-2">📱 QR Codes for Meal Scanning</h2>
            <p className="text-gray-600 mb-5 text-sm">Print & paste in mess. Students scan with their phone camera.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[{ type: 'BREAKFAST', emoji: '🍳', color: '#f59e0b', time: '7-9 AM' },
                { type: 'LUNCH', emoji: '🥗', color: '#22c55e', time: '12-2 PM' },
                { type: 'DINNER', emoji: '🍖', color: '#6366f1', time: '7-9 PM' }
              ].map(({ type, emoji, color, time }) => (
                <div key={type} className="border-2 rounded-xl p-5 text-center" style={{ borderColor: color }}>
                  <h3 className="text-lg font-bold" style={{ color }}>{emoji} {type}</h3>
                  <p className="text-xs text-gray-500 mb-4">{time} IST</p>
                  <div className="flex justify-center mb-4">
                    <QRCodeSVG id={`qr-${type}`} value={type} size={180} fgColor={color} level="H" includeMargin />
                  </div>
                  <button onClick={() => handlePrintQR(type)}
                    className="bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-blue-700 w-full text-sm">
                    🖨️ Print
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========== REPORTS ========== */}
        {activeTab === 'reports' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Meal Statistics</h2>
              <div className="space-y-2">
                <p><span className="font-semibold">Breakfast:</span> {mealStats?.stats?.breakfast || 0}</p>
                <p><span className="font-semibold">Lunch:</span> {mealStats?.stats?.lunch || 0}</p>
                <p><span className="font-semibold">Dinner:</span> {mealStats?.stats?.dinner || 0}</p>
                <p className="text-lg font-bold pt-2">Total: {mealStats?.stats?.total || 0}</p>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Egg Distribution</h2>
              <p className="text-3xl font-bold text-yellow-600">{eggStats?.eggCount || 0}</p>
              <p className="text-gray-600">This month</p>
            </div>
          </div>
        )}

        {/* ========== FACE SCANNER ========== */}
        {activeTab === 'face-scanner' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">🧬 Face Recognition Scanner</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
                  {!faceScannerActive ? (
                    <div className="text-center p-8">
                      <div className="text-5xl mb-4">📷</div>
                      <button onClick={startFaceScanner} disabled={faceModelsLoading}
                        className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 transition disabled:opacity-50">
                        {faceModelsLoading ? '⌛ Loading Models...' : 'Start Camera Scanner'}
                      </button>
                    </div>
                  ) : (
                    <>
                      <video ref={faceVideoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
                      <canvas ref={faceOverlayRef} className="absolute top-0 left-0 w-full h-full scale-x-[-1]" />
                      <div className={`absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-1 rounded-full text-sm font-bold text-white ${faceDetected ? 'bg-green-600' : 'bg-red-600'}`}>
                        {faceDetected ? '🟢 FACE DETECTED' : '🔴 NO FACE'}
                      </div>
                    </>
                  )}
                </div>
                {faceScannerActive && (
                  <div className="flex gap-3">
                    <button onClick={handleAdminFaceScan} disabled={!faceDetected || faceScanning}
                      className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition disabled:opacity-50">
                      {faceScanning ? '⌛ Identifying...' : '🔍 Scan & Identify'}
                    </button>
                    <button onClick={stopFaceScanner} className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-bold hover:bg-gray-300">
                      Stop
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 rounded-xl p-6 border-2 border-dashed border-gray-200">
                <h3 className="text-lg font-bold text-gray-700 mb-4">Result & Actions</h3>
                {identifiedStudent ? (
                  <div className="animate-fade-in">
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-green-200 mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-3xl">👨‍🎓</div>
                        <div>
                          <p className="text-xl font-bold text-blue-600">{identifiedStudent.name}</p>
                          <p className="text-sm text-gray-500">{identifiedStudent.registerNumber} • {identifiedStudent.hostel}</p>
                        </div>
                      </div>
                    </div>

                    <p className="font-bold text-gray-700 mb-2">Mark Attendance For:</p>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {[
                        { type: 'BREAKFAST', label: '🍳 Breakfast' },
                        { type: 'LUNCH', label: '🥗 Lunch' },
                        { type: 'DINNER', label: '🍖 Dinner' },
                      ].map(m => (
                        <button key={m.type} onClick={() => markMealForStudent(m.type)}
                          className="bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 text-sm">
                          {m.label}
                        </button>
                      ))}
                      <button onClick={markEggForStudent}
                        className="bg-yellow-500 text-white py-3 rounded-lg font-bold hover:bg-yellow-600 text-sm">
                        🥚 Mark Egg
                      </button>
                    </div>
                    
                    <button onClick={() => setIdentifiedStudent(null)} className="w-full text-blue-600 font-semibold text-sm hover:underline">
                      Clear Result
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <p className="text-4xl mb-2">🔭</p>
                    <p>No student identified yet.</p>
                    <p className="text-xs">Scan a student's face to mark their meal.</p>
                  </div>
                )}
                {scanMessage && <p className="mt-4 text-center font-bold text-blue-600 animate-pulse">{scanMessage}</p>}
              </div>
            </div>
          </div>
        )}

        {/* ========== STAFF (Master Admin Only) ========== */}
        {activeTab === 'staff' && isMasterAdmin && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">👥 Staff Management</h2>

            {staffPassword && (
              <div className="bg-green-100 border border-green-300 rounded-lg p-4 mb-4">
                <p className="font-bold text-green-800">✅ Staff Created! Auto-Generated Password:</p>
                <p className="text-2xl font-mono font-bold text-green-900 mt-1">{staffPassword}</p>
                <p className="text-xs text-green-700">Share this with the staff member. They'll change it on first login.</p>
              </div>
            )}

            <form onSubmit={handleAddStaff} className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-bold text-blue-800 mb-3">➕ Add New Staff</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input type="text" placeholder="Staff Name" value={newStaff.name}
                  onChange={e => setNewStaff({ ...newStaff, name: e.target.value })}
                  className="px-3 py-2 border rounded-lg" required />
                <input type="email" placeholder="Email" value={newStaff.email}
                  onChange={e => setNewStaff({ ...newStaff, email: e.target.value })}
                  className="px-3 py-2 border rounded-lg" required />
                <select value={newStaff.hostel} onChange={e => setNewStaff({ ...newStaff, hostel: e.target.value })}
                  className="px-3 py-2 border rounded-lg bg-white" required>
                  {HOSTELS.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <button type="submit" disabled={staffLoading}
                className="mt-3 bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 text-sm">
                {staffLoading ? '⏳...' : '✅ Add Staff'}
              </button>
            </form>

            <table className="w-full text-sm">
              <thead className="bg-gray-200">
                <tr>
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2 text-left">Hostel</th>
                  <th className="px-4 py-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {staffList.length === 0 ? (
                  <tr><td colSpan="4" className="px-4 py-6 text-center text-gray-500">No staff members yet.</td></tr>
                ) : staffList.map(s => (
                  <tr key={s._id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2 font-semibold">{s.name}</td>
                    <td className="px-4 py-2">{s.email}</td>
                    <td className="px-4 py-2"><span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded font-bold">{s.hostel}</span></td>
                    <td className="px-4 py-2 text-center">
                      <button onClick={() => handleDeleteStaff(s._id)} className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700">Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ========== SETTINGS ========== */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">⚙️ Meal Pricing</h2>
            {!prices || prices._default ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-yellow-800 font-semibold text-sm">⚠️ No prices set. Configure below!</p>
              </div>
            ) : null}
            <form onSubmit={handleSetPrices}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">🍳 Breakfast (₹)</label>
                  <input type="number" min="0" step="0.5" value={priceForm.breakfast}
                    onChange={e => setPriceForm({ ...priceForm, breakfast: e.target.value })}
                    className="w-full px-4 py-3 border rounded-lg text-xl font-bold text-blue-600" required />
                </div>
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">🥗 Lunch (₹)</label>
                  <input type="number" min="0" step="0.5" value={priceForm.lunch}
                    onChange={e => setPriceForm({ ...priceForm, lunch: e.target.value })}
                    className="w-full px-4 py-3 border rounded-lg text-xl font-bold text-green-600" required />
                </div>
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">🍖 Dinner (₹)</label>
                  <input type="number" min="0" step="0.5" value={priceForm.dinner}
                    onChange={e => setPriceForm({ ...priceForm, dinner: e.target.value })}
                    className="w-full px-4 py-3 border rounded-lg text-xl font-bold text-red-600" required />
                </div>
              </div>
              <button type="submit" disabled={priceLoading}
                className="mt-4 bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50">
                {priceLoading ? '⏳...' : '💾 Save Prices'}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
