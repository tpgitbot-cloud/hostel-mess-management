# API Documentation

## Base URL
- Development: `http://localhost:5000/api`
- Production: `https://your-render-backend-url/api`

## Authentication
All protected endpoints require Bearer token in Authorization header:
```
Authorization: Bearer <JWT_TOKEN>
```

---

## Auth Endpoints

### Student Login
```
POST /auth/student-login
Content-Type: application/json

{
  "registerNumber": "CSE001",
  "password": "password123"
}

Response 200:
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "student": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "registerNumber": "CSE001",
    "department": "CSE",
    "year": 1,
    "mobile": "9876543210",
    "email": "john@example.com",
    "photo": "https://cloudinary-url.com/...",
    "isActive": true
  }
}

Response 401:
{
  "error": "Invalid credentials"
}
```

### Admin Login
```
POST /auth/admin-login
Content-Type: application/json

{
  "email": "admin@hostel.com",
  "password": "adminpass123"
}

Response 200:
{
  "message": "Admin login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "admin": {
    "_id": "507f1f77bcf86cd799439012",
    "name": "Administrator",
    "email": "admin@hostel.com",
    "role": "admin",
    "isActive": true
  }
}
```

### Change Password
```
POST /auth/change-password
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>

{
  "currentPassword": "oldpass123",
  "newPassword": "newpass123"
}

Response 200:
{
  "message": "Password changed successfully"
}

Response 401:
{
  "error": "Current password is incorrect"
}
```

---

## Scan Endpoints (Protected)

### Scan Meal
```
POST /scan/meal
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>

{
  "mealType": "BREAKFAST",
  "studentId": "507f1f77bcf86cd799439011"
}

Response 201:
{
  "message": "BREAKFAST scanned successfully",
  "meal": {
    "_id": "507f1f77bcf86cd799439013",
    "studentId": "507f1f77bcf86cd799439011",
    "date": "2026-03-18T00:00:00.000Z",
    "mealType": "BREAKFAST",
    "scanTime": "2026-03-18T08:30:00.000Z",
    "createdAt": "2026-03-18T08:30:00.000Z",
    "updatedAt": "2026-03-18T08:30:00.000Z"
  }
}

Response 400:
{
  "error": "BREAKFAST can only be scanned between 7-9 AM"
}

Response 409:
{
  "error": "Meal already scanned for today"
}
```

### Scan Egg
```
POST /scan/egg
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>

{
  "studentId": "507f1f77bcf86cd799439011"
}

Response 201:
{
  "message": "Egg scanned successfully",
  "egg": {
    "_id": "507f1f77bcf86cd799439014",
    "studentId": "507f1f77bcf86cd799439011",
    "date": "2026-03-20T00:00:00.000Z",
    "scanTime": "2026-03-20T12:00:00.000Z",
    "createdAt": "2026-03-20T12:00:00.000Z",
    "updatedAt": "2026-03-20T12:00:00.000Z"
  }
}

Response 400:
{
  "error": "Eggs are only distributed on Thursday"
}

Response 409:
{
  "error": "Egg already scanned today"
}
```

---

## Bill Endpoints

### Get Student Bill
```
GET /bill/:studentId
Authorization: Bearer <JWT_TOKEN>

Response 200:
{
  "studentId": "507f1f77bcf86cd799439011",
  "studentName": "John Doe",
  "month": "March 2026",
  "mealCount": {
    "breakfast": 8,
    "lunch": 10,
    "dinner": 9
  },
  "prices": {
    "breakfast": 50,
    "lunch": 70,
    "dinner": 60
  },
  "totalBill": 1750,
  "meals": 27
}

Response 404:
{
  "error": "Student not found"
}
```

### Get Daily Meal Count
```
GET /bill/daily/count?date=2026-03-18

Response 200:
{
  "date": "2026-03-18T00:00:00.000Z",
  "breakfast": 45,
  "lunch": 52,
  "dinner": 48,
  "total": 145
}
```

---

## Admin Endpoints (Protected - Admin Only)

### Add Student
```
POST /admin/add-student
Content-Type: multipart/form-data
Authorization: Bearer <JWT_TOKEN>

Form Data:
- name: "John Doe"
- registerNumber: "CSE001"
- department: "CSE"
- year: 1
- mobile: "9876543210"
- email: "john@example.com"
- password: "password123"
- photo: (file)

Response 201:
{
  "message": "Student added successfully",
  "student": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "registerNumber": "CSE001",
    "department": "CSE",
    "year": 1,
    "mobile": "9876543210",
    "email": "john@example.com",
    "photo": "https://cloudinary-url.com/...",
    "isActive": true
  }
}

Response 409:
{
  "error": "Student with this register number already exists"
}
```

### Upload Students CSV
```
POST /admin/upload-csv
Content-Type: multipart/form-data
Authorization: Bearer <JWT_TOKEN>

Form Data:
- file: (CSV file)

CSV Format:
name,registerNumber,department,year,mobile,email,password
John Doe,CSE001,CSE,1,9876543210,john@example.com,password123

Response 200:
{
  "message": "45 students imported successfully",
  "successCount": 45,
  "errors": [
    {
      "row": {"name": "Jane Smith", ...},
      "error": "Duplicate register number"
    }
  ]
}
```

### Get Students
```
GET /admin/students?search=CSE&department=CSE&year=1&page=1&limit=20
Authorization: Bearer <JWT_TOKEN>

Response 200:
{
  "students": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "registerNumber": "CSE001",
      "department": "CSE",
      "year": 1,
      "mobile": "9876543210",
      "email": "john@example.com",
      "photo": "https://cloudinary-url.com/...",
      "isActive": true
    }
  ],
  "total": 120,
  "page": 1,
  "pages": 6
}
```

### Update Student
```
PUT /admin/student/:id
Content-Type: multipart/form-data
Authorization: Bearer <JWT_TOKEN>

Form Data:
- name: "Jane Doe"
- department: "CSE"
- year: 2
- mobile: "9876543211"
- email: "jane@example.com"
- photo: (file - optional)

Response 200:
{
  "message": "Student updated successfully",
  "student": { ... }
}
```

### Delete Student
```
DELETE /admin/student/:id
Authorization: Bearer <JWT_TOKEN>

Response 200:
{
  "message": "Student deleted successfully"
}
```

### Get Meal Stats
```
GET /admin/stats/meals?startDate=2026-03-01&endDate=2026-03-31
Authorization: Bearer <JWT_TOKEN>

Response 200:
{
  "period": {
    "start": "2026-03-01T00:00:00.000Z",
    "end": "2026-03-31T23:59:59.999Z"
  },
  "stats": {
    "breakfast": 240,
    "lunch": 310,
    "dinner": 280,
    "total": 830
  }
}
```

### Get Egg Stats
```
GET /admin/stats/eggs?startDate=2026-03-01&endDate=2026-03-31
Authorization: Bearer <JWT_TOKEN>

Response 200:
{
  "period": {
    "start": "2026-03-01T00:00:00.000Z",
    "end": "2026-03-31T23:59:59.999Z"
  },
  "eggCount": 152,
  "eggs": [
    {
      "_id": "507f1f77bcf86cd799439015",
      "studentId": "507f1f77bcf86cd799439011",
      "date": "2026-03-20T00:00:00.000Z",
      "scanTime": "2026-03-20T12:00:00.000Z"
    }
  ]
}
```

### Set Meal Prices
```
POST /admin/prices
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>

{
  "breakfast": 50,
  "lunch": 70,
  "dinner": 60
}

Response 201:
{
  "message": "Prices set successfully",
  "price": {
    "_id": "507f1f77bcf86cd799439016",
    "breakfast": 50,
    "lunch": 70,
    "dinner": 60,
    "effectiveFrom": "2026-03-18T10:30:00.000Z",
    "updatedAt": "2026-03-18T10:30:00.000Z"
  }
}
```

### Get Current Prices
```
GET /admin/prices/current
Authorization: Bearer <JWT_TOKEN>

Response 200:
{
  "_id": "507f1f77bcf86cd799439016",
  "breakfast": 50,
  "lunch": 70,
  "dinner": 60,
  "effectiveFrom": "2026-03-18T10:30:00.000Z",
  "updatedAt": "2026-03-18T10:30:00.000Z"
}

Response 404:
{
  "error": "Prices not configured"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Description of what went wrong"
}
```

### 401 Unauthorized
```json
{
  "error": "Invalid or expired token"
}
```

### 403 Forbidden
```json
{
  "error": "Admin access required"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 409 Conflict
```json
{
  "error": "Duplicate entry or conflicting data"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error message"
}
```

---

## Testing with cURL

### Login
```bash
curl -X POST http://localhost:5000/api/auth/student-login \
  -H "Content-Type: application/json" \
  -d '{
    "registerNumber": "CSE001",
    "password": "password123"
  }'
```

### Scan Meal (with token)
```bash
curl -X POST http://localhost:5000/api/scan/meal \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "mealType": "BREAKFAST",
    "studentId": "507f1f77bcf86cd799439011"
  }'
```

### Get Bill
```bash
curl -X GET http://localhost:5000/api/bill/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Upload CSV
```bash
curl -X POST http://localhost:5000/api/admin/upload-csv \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "file=@students.csv"
```

---

## Rate Limiting

Currently no rate limiting implemented. For production:
- Implement express-rate-limit
- Set limits per IP/user
- Adjust thresholds based on usage

## Pagination

Platforms using pagination support these query parameters:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

Example:
```
GET /admin/students?page=2&limit=50
```
