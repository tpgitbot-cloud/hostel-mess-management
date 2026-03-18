# Database Setup Guide

## MongoDB Atlas Setup

### Step 1: Create Account
1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up with email or Google
3. Verify email address

### Step 2: Create Project
1. Click "Create a Project"
2. Name it "Hostel Mess Management"
3. Click "Create Project"

### Step 3: Create Cluster
1. Click "Create a Deployment"
2. Choose "M0 Free Tier" (adequate for testing/small deployment)
3. Select provider (AWS, Google Cloud, Azure)
4. Choose region closest to you
5. Skip optional settings
6. Click "Create Deployment"

### Step 4: Create Database User
1. In Atlas dashboard, click "Security" → "Database Access"
2. Click "Add New Database User"
3. Authentication Method: "Password"
4. Username: `hostel_admin`
5. Password: Generate strong password
6. Database User Privileges: "Read and write to any database"
7. Click "Add User"

### Step 5: Allow Network Access
1. Click "Network Access" in left sidebar
2. Click "Add IP Address"
3. Choose "Allow access from anywhere" (0.0.0.0/0)
   - **For testing only. For production, add specific IPs**
4. Click "Confirm"

### Step 6: Get Connection String
1. Go to Databases
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Select "Node.js" and version "4.1 or later"
5. Copy connection string
6. Paste into `.env` as `MONGO_URI`

Replace `<password>` and `<username>` in the string:
```
MONGO_URI=mongodb+srv://hostel_admin:YOUR_PASSWORD@cluster0.xxx.mongodb.net/hostel_mess?retryWrites=true&w=majority
```

## Cloudinary Setup

### Step 1: Create Account
1. Go to https://cloudinary.com
2. Sign up with email or social
3. Verify email

### Step 2: Get Credentials
1. Dashboard shows your:
   - **Cloud Name**
   - **API Key**
   - **API Secret**
2. Copy these to `.env`:
```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Step 3: Configure Upload Settings (Optional)
1. Settings → Upload
2. Configure upload presets for restrictions
3. Add signed uploads for security

## Initial Data Setup

After backend is running, create initial data:

### Create Admin User (via MongoDB Compass or Shell)
```javascript
db.admins.insertOne({
  name: "System Administrator",
  email: "admin@hostel.com",
  password: "$2a$10$...", // Hash using bcrypt
  role: "admin",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
})
```

### Create Initial Prices
```bash
POST /api/admin/prices
{
  "breakfast": 50,
  "lunch": 70,
  "dinner": 60
}
```

### Add Sample Students (CSV)
Create a CSV file:
```csv
name,registerNumber,department,year,mobile,email,password
Rahul Kumar,CSE001,CSE,1,9876543210,rahul@example.com,password123
Priya Singh,CSE002,CSE,1,9876543211,priya@example.com,password123
Amit Patel,ECE001,ECE,2,9876543212,amit@example.com,password123
```

Upload via Admin Dashboard or API:
```bash
POST /api/admin/upload-csv
(multipart/form-data with file)
```

## Backup & Restore

### Backup Data
```bash
# Using MongoDB tools
mongodump --uri "mongodb+srv://user:pass@cluster.xxx.mongodb.net/hostel_mess"
```

### Restore Data
```bash
# Using MongoDB tools
mongorestore --uri "mongodb+srv://user:pass@cluster.xxx.mongodb.net" [dump-path]
```

## Monitoring

### MongoDB Atlas Dashboard
- **Metrics:** CPU, Memory, Network usage
- **Alerts:** Get notified of issues
- **Logs:** View database logs
- **Billing:** Monitor usage

### Best Practices
1. ✅ Regular backups
2. ✅ Monitor database size
3. ✅ Index frequently queried fields
4. ✅ Use connection pooling
5. ✅ Monitor slow queries
6. ✅ Keep software updated
7. ✅ Secure credentials
8. ✅ Use VPC for production

## Indexes Explanation

Created automatically:
- `Students.registerNumber` (unique)
- `Meal.studentId, Meal.date, Meal.mealType` (prevents duplicates)
- `Egg.studentId, Egg.date` (prevents duplicates)

## Growth Planning

### When to Upgrade
- Free tier (M0): ~16GB storage, no backup
- M2/M5: ~2GB storage, automated backup
- Production: Pay-as-you-go, auto-scaling

### Scaling Strategy
- Start with M0 for testing
- Move to M2 for small deployment (100-500 students)
- M5+ for larger deployments
- Sharding for very large deployments

## Troubleshooting

### Connection Timeout
- Check IP whitelist allows your connection
- Verify credentials are correct
- Check database user exists
- Try connecting via MongoDB Compass

### Authentication Failed
- Verify username and password in connection string
- Check special characters are URL-encoded
- Ensure database user exists in your cluster

### Quota Exceeded
- Upgrade to paid tier
- Check storage usage
- Consider data retention policies
- Archive old data
