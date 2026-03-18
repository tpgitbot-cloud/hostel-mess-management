# Smart Hostel Mess Management System

A production-ready fullstack web application for managing hostel mess operations with meal tracking, QR code scanning, billing, and admin controls.

## 🏗️ Architecture

```
hostel-mess-management/
├── backend/              # Node.js + Express API
│   ├── models/          # Mongoose schemas
│   ├── controllers/      # Business logic
│   ├── routes/          # API endpoints
│   ├── middleware/      # Auth & validation
│   ├── config/          # DB & Cloudinary config
│   ├── utils/           # Helper functions
│   ├── server.js        # Main server file
│   └── package.json
├── frontend/            # React.js + Vite
│   ├── src/
│   │   ├── pages/       # Route components
│   │   ├── components/  # Reusable components
│   │   ├── utils/       # API & auth utilities
│   │   ├── App.jsx
│   │   └── index.jsx
│   ├── public/
│   ├── vite.config.js
│   └── package.json
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- npm v9+
- MongoDB Atlas account
- Cloudinary account (for image uploads)

### Installation

1. **Clone and setup:**
```bash
cd hostel-mess-management
npm run install:all
```

2. **Backend Setup:**
```bash
cd backend
cp .env.example .env
# Edit .env with your MongoDB Atlas URI and Cloudinary keys
npm run dev
```

3. **Frontend Setup (New Terminal):**
```bash
cd frontend
npm run dev
```

Access the app at `http://localhost:3000`

## 🔐 Environment Variables

### Backend (.env)
```
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/hostel_mess
JWT_SECRET=your_secret_key_change_in_production
JWT_EXPIRE=7d
PORT=5000
NODE_ENV=production

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

FRONTEND_URL=http://localhost:3000
```

### Frontend (.env.local)
```
REACT_APP_API_URL=http://localhost:5000/api
```

## 📱 Features

### Student Portal
- ✅ Login with register number & password
- ✅ QR code scanning for meals (Breakfast/Lunch/Dinner)
- ✅ Time-based meal restrictions
- ✅ Egg distribution (Thursday only)
- ✅ Real-time bill calculation
- ✅ Dashboard with meal stats
- ✅ Change password

### Admin Portal
- ✅ Admin login
- ✅ Student management (add, edit, delete)
- ✅ Bulk CSV import with duplicate prevention
- ✅ Real-time analytics (meal counts, egg distribution)
- ✅ Pricing configuration
- ✅ Student photo upload via Cloudinary
- ✅ Advanced search & filtering

### Security
- ✅ JWT-based authentication
- ✅ Password hashing with bcrypt
- ✅ Role-based access control
- ✅ CORS protection
- ✅ Input validation
- ✅ Protected routes

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/student-login` - Student login
- `POST /api/auth/admin-login` - Admin login
- `POST /api/auth/change-password` - Change password (protected)

### Meal Scanning
- `POST /api/scan/meal` - Scan meal QR (protected)
- `POST /api/scan/egg` - Scan egg QR (protected)

### Billing
- `GET /api/bill/:studentId` - Get monthly bill (protected)
- `GET /api/bill/daily/count` - Get daily meal count

### Admin
- `POST /api/admin/add-student` - Add student
- `POST /api/admin/upload-csv` - Bulk import CSV
- `GET /api/admin/students` - List students with filters
- `PUT /api/admin/student/:id` - Update student
- `DELETE /api/admin/student/:id` - Delete student
- `GET /api/admin/stats/meals` - Meal statistics
- `GET /api/admin/stats/eggs` - Egg distribution stats
- `POST /api/admin/prices` - Set meal prices
- `GET /api/admin/prices/current` - Get current prices

## 📊 Database Schema

### Students Collection
```javascript
{
  name: String,
  registerNumber: String (unique),
  department: String,
  year: Number (1-4),
  mobile: String,
  email: String,
  photo: String (Cloudinary URL),
  password: String (hashed),
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Meals Collection
```javascript
{
  studentId: ObjectId (ref: Student),
  date: Date,
  mealType: String (BREAKFAST|LUNCH|DINNER),
  scanTime: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Eggs Collection
```javascript
{
  studentId: ObjectId (ref: Student),
  date: Date,
  scanTime: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Prices Collection
```javascript
{
  breakfast: Number,
  lunch: Number,
  dinner: Number,
  effectiveFrom: Date,
  updatedAt: Date
}
```

## ⏰ Meal Time Restrictions

- **Breakfast:** 7:00 AM - 9:00 AM
- **Lunch:** 12:00 PM - 2:00 PM
- **Dinner:** 7:00 PM - 9:00 PM

## 📦 QR Code Format

QR codes should contain meal type:
- `BREAKFAST`
- `LUNCH`
- `DINNER`

For eggs, use a standard QR scan (system validates day and time).

## 🌐 Deployment

### Frontend (Vercel)

1. Push code to GitHub
2. Connect repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy automatically on push

**Environment Variables for Vercel:**
```
REACT_APP_API_URL=https://your-backend-domain.com/api
```

### Backend (Render)

1. Push code to GitHub
2. Create new Web Service on Render
3. Connect GitHub repository
4. Set environment variables
5. Deploy

**Build Command:**
```bash
npm install
```

**Start Command:**
```bash
npm start
```

**Environment Variables for Render:**
```
MONGO_URI=your_mongodb_atlas_uri
JWT_SECRET=your_secret_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
FRONTEND_URL=https://your-frontend-domain.vercel.app
NODE_ENV=production
PORT=5000
```

## 🛠️ Development

### Run both services
```bash
npm run dev
```

### Run backend only
```bash
npm run dev:backend
```

### Run frontend only
```bash
npm run dev:frontend
```

### Build for production
```bash
npm run build
```

## 📝 CSV Import Format

For bulk student import, use CSV with headers:
```csv
name,registerNumber,department,year,mobile,email,password
John Doe,CSE001,CSE,1,9876543210,john@example.com,password123
Jane Smith,ECE002,ECE,2,9876543211,jane@example.com,password123
```

## 🐛 Troubleshooting

### MongoDB Connection Error
- Verify MongoDB Atlas URI in `.env`
- Check IP whitelist in MongoDB Atlas
- Ensure database name is correct

### QR Scanner Not Working
- Enable camera permissions in browser
- Use HTTPS or localhost
- Check browser console for errors

### CORS Errors
- Verify `FRONTEND_URL` in backend `.env`
- Check browser console for actual error
- Ensure frontend and backend URLs are correct

### Token Expiration
- Tokens expire after 7 days by default
- User will be redirected to login
- Update JWT_EXPIRE in `.env` to change

## 📞 Admin Credentials (Create Manually)

Before first login, create an admin user in MongoDB:

```javascript
// In MongoDB, insert:
db.admins.insertOne({
  name: "Admin",
  email: "admin@hostel.com",
  password: "hashedPassword", // Use bcryptjs to hash
  role: "admin",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
})
```

Or use the API after setting up:
```bash
POST /api/admin/create-admin (requires authentication)
```

## 🔒 Security Best Practices

1. ✅ Change all default secrets in production
2. ✅ Use strong passwords
3. ✅ Enable HTTPS only
4. ✅ Regularly update dependencies
5. ✅ Keep MongoDB credentials secure
6. ✅ Monitor error logs
7. ✅ Use environment variables for all secrets
8. ✅ Enable MongoDB IP whitelist

## 📊 Monitoring

Monitor your deployment:
- Render Dashboard for backend logs
- Vercel Analytics for frontend
- MongoDB Atlas Monitoring
- Error tracking in browser console

## 📄 License

MIT License - Use freely for your hostel

## 🤝 Contributing

Contributions welcome! Please follow the existing code structure and add tests for new features.

## 📧 Support

For issues or questions, check the respective platform's documentation:
- [Render Docs](https://render.com/docs)
- [Vercel Docs](https://vercel.com/docs)
- [MongoDB Atlas Docs](https://docs.atlas.mongodb.com/)
- [Express Docs](https://expressjs.com/)
- [React Docs](https://react.dev/)

---

**Built with ❤️ for efficient hostel mess management**
