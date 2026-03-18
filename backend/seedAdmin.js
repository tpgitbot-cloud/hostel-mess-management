import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Admin from './models/Admin.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.argv[2];
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || process.argv[3] || 'admin123';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Administrator';

if (!MONGO_URI) {
  console.error('MONGO_URI is not set. Copy .env.example to .env and configure it.');
  process.exit(1);
}

if (!ADMIN_EMAIL) {
  console.error('Admin email not provided. Set ADMIN_EMAIL in env or pass as first arg.');
  console.error('Example: node seedAdmin.js admin@hostel.com StrongP@ssw0rd');
  process.exit(1);
}

const run = async () => {
  try {
    await mongoose.connect(MONGO_URI, { retryWrites: true, w: 'majority' });
    console.log('Connected to MongoDB');

    const existing = await Admin.findOne({ email: ADMIN_EMAIL.toLowerCase() });
    if (existing) {
      console.log(`Admin with email ${ADMIN_EMAIL} already exists. Exiting.`);
      process.exit(0);
    }

    const admin = new Admin({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL.toLowerCase(),
      password: ADMIN_PASSWORD,
      role: 'admin',
    });

    await admin.save();
    console.log('Admin user created successfully:');
    console.log(`  Email: ${ADMIN_EMAIL}`);
    console.log(`  Password: ${ADMIN_PASSWORD}`);
    console.log('Please change the password after first login.');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error seeding admin:', err.message || err);
    process.exit(1);
  }
};

run();
