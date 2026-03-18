# Project Structure Overview

## Directory Layout

```
hostel-food/
├── backend/                          # Node.js + Express REST API
│   ├── models/                       # Mongoose schemas
│   │   ├── Student.js               # Student schema with auth
│   │   ├── Admin.js                 # Admin schema
│   │   ├── Meal.js                  # Meal tracking schema
│   │   ├── Egg.js                   # Egg distribution schema
│   │   └── Price.js                 # Pricing schema
│   │
│   ├── controllers/                  # Business logic layer
│   │   ├── authController.js        # Auth logic (login, signup, pwd change)
│   │   ├── scanController.js        # QR scanning logic (meals, eggs)
│   │   ├── billController.js        # Billing calculations
│   │   └── adminController.js       # Admin operations (students, reports)
│   │
│   ├── routes/                       # Route handlers
│   │   ├── auth.js                  # /api/auth endpoints
│   │   ├── scan.js                  # /api/scan endpoints
│   │   ├── bill.js                  # /api/bill endpoints
│   │   └── admin.js                 # /api/admin endpoints
│   │
│   ├── middleware/                   # Express middleware
│   │   └── auth.js                  # JWT verification & role-based access
│   │
│   ├── config/                       # Configuration files
│   │   ├── db.js                    # MongoDB connection
│   │   └── cloudinary.js            # Cloudinary image upload config
│   │
│   ├── utils/                        # Utility functions
│   │   ├── jwt.js                   # JWT token generation & verification
│   │   └── validation.js            # Input validation & time checks
│   │
│   ├── server.js                     # Main API server entry point
│   ├── package.json                  # Backend dependencies
│   ├── .env.example                  # Environment variables template
│   ├── Procfile                      # Render deployment config
│   └── ecosystem.config.js           # PM2 cluster configuration
│
├── frontend/                         # React.js + Vite SPA
│   ├── src/
│   │   ├── pages/                    # Route pages
│   │   │   ├── Home.jsx             # Landing page
│   │   │   ├── Login.jsx            # Combined student/admin login
│   │   │   ├── StudentDashboard.jsx # Student portal
│   │   │   └── AdminDashboard.jsx   # Admin portal
│   │   │
│   │   ├── components/               # Reusable React components
│   │   │   └── ProtectedRoute.jsx   # Role-based route protection
│   │   │
│   │   ├── utils/                    # Frontend utilities
│   │   │   ├── api.js              # Axios instance & API calls
│   │   │   └── auth.js             # LocalStorage auth helpers
│   │   │
│   │   ├── App.jsx                  # Main app component & routing
│   │   ├── index.jsx                # React DOM entry point
│   │   └── index.css                # Tailwind CSS imports
│   │
│   ├── public/
│   │   └── index.html               # HTML entry point
│   │
│   ├── package.json                  # Frontend dependencies
│   ├── vite.config.js               # Vite build configuration
│   ├── tailwind.config.js           # Tailwind CSS configuration
│   └── postcss.config.js            # PostCSS configuration
│
├── package.json                      # Root package.json for concurrency
├── .gitignore                        # Git ignore rules
├── README.md                         # Main documentation
├── API_DOCUMENTATION.md              # Complete API reference
├── DATABASE_SETUP.md                 # MongoDB Atlas setup guide
├── DEPLOY_RENDER.md                  # Render deployment guide
├── DEPLOY_VERCEL.md                  # Vercel deployment guide
├── TESTING_GUIDE.md                  # Testing procedures
└── PROJECT_STRUCTURE.md              # This file
```

## File Count & Organization

### Backend (25+ files)
- 1 server entry point
- 5 model files
- 4 controller files
- 4 route files
- 1 auth middleware file
- 2 config files
- 2 utility files
- Config files (package.json, .env.example, Procfile, ecosystem.config.js)

### Frontend (18+ files)
- 1 main App component
- 1 index entry point
- 4 page components
- 1 protected route component
- 3 utility files
- 1 CSS file
- 1 HTML file
- Config files (package.json, vite, tailwind, postcss)

### Documentation (6 files)
- README.md - Overview
- API_DOCUMENTATION.md - Complete API reference
- DATABASE_SETUP.md - MongoDB Atlas setup
- DEPLOY_RENDER.md - Backend deployment
- DEPLOY_VERCEL.md - Frontend deployment
- TESTING_GUIDE.md - Testing procedures

---

## Key Features by Component

### Backend Features ✅
- **Authentication**
  - JWT token generation & verification
  - Password hashing with bcrypt
  - Separate student/admin login
  - Token refresh mechanism
  
- **Meal Management**
  - QR code scanning with time validation
  - Duplicate entry prevention
  - Daily meal tracking
  - Time-based meal windows (7-9 AM, 12-2 PM, 7-9 PM)
  
- **Egg Distribution**
  - Thursday-only scanning
  - One egg per student per day
  - Separate tracking from meals
  
- **Billing System**
  - Real-time bill calculation
  - Monthly breakdown by meal type
  - Configurable meal prices
  - Price history tracking
  
- **Admin Functions**
  - Student CRUD operations
  - Bulk CSV import with validation
  - Photo upload via Cloudinary
  - Real-time Analytics (meal stats, egg stats)
  - Pricing configuration
  - Advanced search & filtering
  
- **Data Validation**
  - Input sanitization
  - Email validation
  - Mobile number validation
  - Register number uniqueness
  - Time restriction validation

### Frontend Features ✅
- **Student Portal**
  - Clean login interface
  - QR scanner with camera access
  - Real-time dashboard
  - Bill visualization
  - Profile management
  - Logout functionality
  
- **Admin Portal**
  - Student management interface
  - Bulk CSV upload
  - Search and filtering
  - Analytics dashboard
  - Pricing management
  - Real-time statistics
  
- **UI/UX**
  - Responsive Tailwind CSS design
  - Mobile-friendly layout
  - Toast notifications
  - Protected routes
  - Role-based access control
  - Clean, modern interface

### Security Features ✅
- JWT authentication
- Password hashing
- CORS protection
- Input validation
- Rate limiting ready
- Protected admin routes
- Token expiration
- Secure environment variables

---

## Tech Stack

### Backend
- **Runtime:** Node.js 18+
- **Framework:** Express.js 4.18+
- **Database:** MongoDB Atlas (Cloud)
- **Authentication:** JWT + bcryptjs
- **Image Upload:** Cloudinary
- **Parsing:** csv-parser, xlsx
- **Validation:** express-validator
- **Security:** helmet, cors
- **Logging:** morgan

### Frontend
- **Library:** React 18.2+
- **Build Tool:** Vite 5.0
- **Styling:** Tailwind CSS 3.4
- **HTTP:** Axios
- **Routing:** React Router 6.20
- **QR Scanner:** html5-qrcode
- **Notifications:** react-toastify
- **Charts:** recharts

### DevOps
- **Backend Hosting:** Render
- **Frontend Hosting:** Vercel
- **Database:** MongoDB Atlas
- **Image Storage:** Cloudinary
- **Version Control:** Git

---

## API Structure

### Base URL
- Development: `http://localhost:5000/api`
- Production: `https://your-render-url/api`

### Route Groups
1. **Authentication** - `/auth`
   - Student login
   - Admin login
   - Password change

2. **Scanning** - `/scan`
   - Meal scanning
   - Egg scanning

3. **Billing** - `/bill`
   - Student bill calculation
   - Daily statistics

4. **Admin** - `/admin`
   - Student management
   - CSV import
   - Analytics
   - Pricing control

### Authentication
All protected endpoints use:
```
Authorization: Bearer <JWT_TOKEN>
```

---

## Database Schema Summary

### Collections
1. **students** - 1000+ docs expected
   - Indexes: registerNumber (unique), isActive

2. **meals** - 10000+ docs expected
   - Indexes: studentId+date+mealType (compound, unique)

3. **eggs** - 1000+ docs expected
   - Indexes: studentId+date (compound, unique)

4. **prices** - ~10s of docs
   - Latest price queried for billing

5. **admins** - 10-100 docs
   - Role-based access control

---

## Configuration Files

### Backend (.env)
```
MONGO_URI=mongodb+srv://...
JWT_SECRET=your_secret
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
FRONTEND_URL=http://localhost:3000
PORT=5000
NODE_ENV=production
```

### Frontend (.env.local)
```
REACT_APP_API_URL=http://localhost:5000/api
```

### Deployment
- Backend: Render environment variables
- Frontend: Vercel environment variables
- Database: MongoDB Atlas connection string

---

## Development Workflow

### Setup
```bash
npm run install:all
cd backend && npm run dev  # Terminal 1
cd frontend && npm run dev # Terminal 2
```

### Building
```bash
npm run build              # Build both
npm run build:backend      # Backend only
npm run build:frontend     # Frontend only
```

### Deployment
1. Push to GitHub
2. Render auto-deploys backend
3. Vercel auto-deploys frontend

---

## Performance Considerations

### Database Optimization
- Compound indexes on (studentId, date, mealType)
- Unique constraints prevent duplicates at DB level
- Pagination for student lists (20 per page)
- Index on isActive for filtering

### API Optimization
- Minimal payload responses
- Async/await for non-blocking operations
- Request compression via helmet
- Cached database queries possible

### Frontend Optimization
- Code splitting ready
- Lazy component loading
- Vite tree-shaking
- Tailwind CSS purging
- Image optimization via Cloudinary

---

## Deployment Checklist

### Before Deploying
- [ ] All dependencies installed
- [ ] .env files created with real secrets
- [ ] Database connected & seeded
- [ ] Cloudinary account set up
- [ ] Test data exists (students, prices)
- [ ] APIs tested locally
- [ ] Frontend builds without errors

### Deploy Backend (Render)
- [ ] Connect GitHub repo
- [ ] Set environment variables
- [ ] Build command: `npm install`
- [ ] Start command: `npm start`
- [ ] Verify logs show "Connected to MongoDB"

### Deploy Frontend (Vercel)
- [ ] Connect GitHub repo
- [ ] Set REACT_APP_API_URL
- [ ] Build: `npm run build`
- [ ] Verify deployment
- [ ] Test login works

---

## Support & Maintenance

### Monitoring
- Render dashboard for backend logs
- Vercel analytics for frontend
- MongoDB Atlas monitoring
- Error tracking in logs

### Updates
- Spring (every 3 months): Dependencies
- Fall (annually): Major version upgrades
- Quarterly: Security patches

### Backups
- MongoDB Atlas automatic backups
- Code version control on GitHub
- Environment variables documented
