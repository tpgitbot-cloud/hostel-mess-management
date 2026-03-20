# Testing Guide

## Quick Test Server

Start both backend and frontend:
```bash
npm run dev
```

This runs:
- Backend on http://localhost:5000
- Frontend on http://localhost:3000

---

## Test Credentials

### Student (Initial Login)
```
Register Number: CSE001
Initial Password: CSE001 (Same as Register Number)
Note: You will be forced to change this on first login.
```

### Admin (Create in MongoDB First)
```
Email: admin@hostel.com
Password: adminpass123
```

---

## Manual Testing Flow

### 1. Student Signup & Face Registration
- [ ] Navigate to `/signup`
- [ ] Fill all fields (Name, Reg No: CSE002, Dept, Year, Hostel, Mobile, Password)
- [ ] Click "Sign Up & Continue"
- [ ] Should redirect to `/face-registration`
- [ ] Grant camera permissions
- [ ] Click "Capture Face" 5 times (follow on-screen prompts)
- [ ] Verify 5 thumbnails appear
- [ ] Click "Register Face"
- [ ] Should show "Face Registered!" and redirect to `/dashboard`

### 2. Student Dashboard
- [ ] Verify student info displays (name, register number, department, year, mobile)
- [ ] Check "Today's Meals" count (should be 0 initially)
- [ ] Check "Monthly Total" meals
- [ ] Check "Current Bill" (calculated from meal prices)
- [ ] **Check Face Badge**: Should show "Face Registered: ✅" (if registered)

### 3. Face Login
- [ ] Logout and go to `/login`
- [ ] Click "Face" tab
- [ ] Camera should open automatically
- [ ] Align face in the green box
- [ ] Click "Scan & Login"
- [ ] Should identify student and log in successfully

### 4. Student Face Scan (Self)
- [ ] In Student Dashboard, click "🧬 Face Scan" tab
- [ ] Camera should open
- [ ] Click "Scan & Identify"
- [ ] Once identified, click any meal button (BREAKFAST/LUNCH/DINNER)
- [ ] Meal should be marked successfully

### 5. Staff Face Scanner (Admin)
- [ ] Login as Admin/Staff
- [ ] Click "🧬 Face Scanner" tab
- [ ] Click "Start Camera Scanner"
- [ ] Point camera at a student
- [ ] Click "🔍 Scan & Identify"
- [ ] Verify student name/reg no appears in the results
- [ ] Click "LUNCH" or "Mark Egg"
- [ ] Verify success toast and attendance marked

### 3. Scanning Meals
- [ ] Click "Scan QR" tab
- [ ] Click "Scan Meal QR" button
- [ ] Camera should request permissions
- [ ] Point camera at text starting with "BREAKFAST"
- [ ] Should see success toast
- [ ] Bill should update
- [ ] Meals count increases

### 4. QR Code Testing
Generate test QR codes containing:
- `BREAKFAST` → Student should scan during 7-9 AM
- `LUNCH` → Student should scan during 12-2 PM
- `DINNER` → Student should scan during 7-9 PM

**Test Time Restrictions:**
- Scan outside meal time → Should show error "can only be scanned between X-Y time"

**Test Duplicate Prevention:**
- Scan same meal twice in same day → Should show "Meal already scanned for today"

### 5. Egg Scanning
- [ ] Click "Scan Egg" button
- [ ] Only works on Thursday
- [ ] Maximum 1 egg per student per day
- [ ] Test non-Thursday → Should show "Eggs are only distributed on Thursday"

### 6. Admin Login
- [ ] Click "Admin" tab
- [ ] Enter email: admin@hostel.com
- [ ] Enter password: adminpass123
- [ ] Click "Admin Login"
- [ ] Should redirect to `/admin/dashboard`

### 7. Admin Dashboard
- [ ] View total students
- [ ] View today's meal count
- [ ] View eggs distributed
- [ ] Verify meal breakdown (breakfast, lunch, dinner)

### 8. Student Management
- [ ] Click "Students" tab
- [ ] **Check Face Column**: Should show "✅ Registered" for registered students
- [ ] Click "Upload CSV" and select CSV file
- [ ] Verify students are imported
- [ ] Search for student by name/register number
- [ ] Click "Delete" on a student
- [ ] Verify student is removed

### 9. Reports
- [ ] Click "Reports" tab
- [ ] View meal statistics
- [ ] View egg distribution count
- [ ] Verify numbers match actual scans

### 10. Settings
- [ ] Click "Settings" tab
- [ ] View current meal prices
- [ ] Verify prices display correctly

### 11. Logout
- [ ] Click "Logout" button
- [ ] Should redirect to login page

---

## API Testing with Postman

### 1. Import API
Create requests for each endpoint (see API_DOCUMENTATION.md)

### 2. Test Sequence
1. **Student Login**
   ```
   POST /auth/student-login
   {"registerNumber": "CSE001", "password": "password123"}
   ```
   Copy token from response

2. **Scan Meal** (use token)
   ```
   POST /scan/meal
   Authorization: Bearer {TOKEN}
   {"mealType": "BREAKFAST", "studentId": "{STUDENT_ID}"}
   ```

3. **Get Bill**
   ```
   GET /bill/{STUDENT_ID}
   Authorization: Bearer {TOKEN}
   ```

4. **Admin Login**
   ```
   POST /auth/admin-login
   {"email": "admin@hostel.com", "password": "adminpass123"}
   ```
   Copy admin token

5. **Get Students** (admin)
   ```
   GET /admin/students
   Authorization: Bearer {ADMIN_TOKEN}
   ```

---

## Edge Cases to Test

### Authentication
- [ ] Login with invalid register number
- [ ] Login with wrong password
- [ ] Access protected route without token
- [ ] Access protected route with expired token
- [ ] Access admin route as student

### Meal Scanning
- [ ] Scan outside meal time windows
- [ ] Scan duplicate meal on same day
- [ ] Scan meal with invalid student ID
- [ ] Scan meal for inactive student

### Egg Scanning
- [ ] Scan egg on non-Thursday
- [ ] Scan egg twice on same day
- [ ] Scan egg with disabled student account

### CSV Upload
- [ ] Upload with missing required fields
- [ ] Upload with duplicate register numbers
- [ ] Upload invalid CSV format
- [ ] Upload with special characters in names

### Admin Operations
- [ ] Delete non-existent student
- [ ] Update student with invalid data
- [ ] Set negative prices
- [ ] Access as non-admin user

---

## Performance Testing

### Load Testing
1. Generate 1000 dummy students
2. Simulate 100 concurrent meal scans
3. Check response time (should be < 500ms)

### Database Performance
1. Create indexes properly
2. Query 1 million meal records
3. Verify response time
4. Monitor MongoDB CPU usage

---

## Browser Testing

### Supported Browsers
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile browsers

### Mobile Testing
- [ ] Test on iPhone (Safari)
- [ ] Test on Android (Chrome)
- [ ] Test camera permissions
- [ ] Test responsive design

---

## Accessibility Testing

### WCAG 2.1 Level AA
- [ ] Keyboard navigation (Tab through all elements)
- [ ] Color contrast ratio (min 4.5:1 for text)
- [ ] Form labels associated correctly
- [ ] Error messages clear and accessible
- [ ] Touch targets (min 44x44px on mobile)

---

## Security Testing

### Input Validation
- [ ] SQL injection attempts blocked
- [ ] XSS attempts blocked
- [ ] CSRF protection working
- [ ] File upload validation

### Authentication
- [ ] Passwords stored as hashes (never plaintext)
- [ ] Tokens expire properly
- [ ] Refresh token mechanism (if implemented)
- [ ] Logout clears all tokens

### Data Protection
- [ ] Sensitive fields not exposed in API
- [ ] HTTPS enforced in production
- [ ] CORS properly configured
- [ ] Rate limiting in place

---

## Deployment Testing

### Before Deploying to Render
1. [ ] Test all APIs locally
2. [ ] Test with production environment variables
3. [ ] Verify MongoDB URI is correct
4. [ ] Test file uploads with Cloudinary
5. [ ] Check error logging

### Before Deploying to Vercel
1. [ ] Build succeeds (`npm run build`)
2. [ ] No console errors in production
3. [ ] API endpoint URL updated in .env
4. [ ] All routes work (login, dashboard, logout)

### Post-Deployment Checklist
1. [ ] Can access frontend URL
2. [ ] Can login with test credentials
3. [ ] Can scan meals
4. [ ] Admin functionality works
5. [ ] No CORS errors
6. [ ] No 404s for assets
7. [ ] Images load properly
8. [ ] Performance acceptable (< 3s load time)

---

## Common Test Issues

### "Cannot GET /api/auth/student-login"
- Backend not running
- API URL incorrect in frontend
- Backend server crashed

### "Token is invalid"
- Token expired (7 days)
- Backend JWT_SECRET changed
- Token tampered with

### "CORS Error"
- Backend CORS not configured for frontend URL
- Frontend URL not in CORS whitelist
- preflight request failing

### "MongoDB Connection Failed"
- MongoDB Atlas URI incorrect
- Database user doesn't have enough permissions
- IP not whitelisted in MongoDB Atlas
- Network connection issues

### "Camera Permission Denied"
- User denied camera access
- Browser doesn't support getUserMedia
- Running on HTTP instead of HTTPS (some browsers)
- Check browser console for specific error

---

## Test Coverage Goals

| Component | Target | Current |
|-----------|--------|---------|
| Backend APIs | 80% | TBD |
| Frontend Components | 70% | TBD |
| Database Models | 90% | TBD |
| Authentication | 100% | TBD |
| Meal Scanning | 95% | TBD |

---

## Continuous Testing

After deployment, test weekly:
1. Login functionality
2. Meal scanning
3. Billing calculation
4. Admin operations
5. Data persistence
6. Performance metrics
7. Error logging

Use monitoring tools:
- Sentry for error tracking
- DataDog for performance monitoring
- LogRocket for session replay
