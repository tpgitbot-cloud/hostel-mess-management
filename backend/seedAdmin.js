import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Admin from './models/Admin.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.argv[2];
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || process.argv[3] || 'admin123';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Master Administrator';

if (!MONGO_URI) {
  console.error('MONGO_URI is not set.');
  process.exit(1);
}

if (!ADMIN_EMAIL) {
  console.error('Admin email not provided. Set ADMIN_EMAIL in env or pass as first arg.');
  process.exit(1);
}

const run = async () => {
  try {
    await mongoose.connect(MONGO_URI, { retryWrites: true, w: 'majority' });
    console.log('Connected to MongoDB');

    const existing = await Admin.findOne({ email: ADMIN_EMAIL.toLowerCase() });
    if (existing) {
      // Update existing admin to master_admin role
      existing.role = 'master_admin';
      existing.hostel = 'ALL';
      existing.isFirstLogin = false;
      await existing.save();
      console.log(`Admin ${ADMIN_EMAIL} updated to master_admin role.`);
      process.exit(0);
    }

    const admin = new Admin({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL.toLowerCase(),
      password: ADMIN_PASSWORD,
      role: 'master_admin',
      hostel: 'ALL',
      isFirstLogin: false,
    });

    await admin.save();
    console.log('Master Admin created successfully:');
    console.log(`  Email: ${ADMIN_EMAIL}`);
    console.log(`  Password: ${ADMIN_PASSWORD}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error seeding admin:', err.message || err);
    process.exit(1);
  }
};

run();
