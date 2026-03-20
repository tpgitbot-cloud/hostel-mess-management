import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const studentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    registerNumber: {
      type: String,
      required: [true, 'Register number is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      enum: ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT'],
    },
    year: {
      type: Number,
      required: [true, 'Year is required'],
      enum: [1, 2, 3, 4],
    },
    hostel: {
      type: String,
      required: [true, 'Hostel is required'],
      enum: ['B1', 'B2', 'B3', 'G1', 'G2'],
    },
    mobile: {
      type: String,
      required: [true, 'Mobile number is required'],
      match: [/^[0-9]{10}$/, 'Invalid mobile number'],
    },
    email: {
      type: String,
      lowercase: true,
      match: [/.+@.+\..+/, 'Invalid email address'],
    },
    photo: {
      type: String,
      default: null,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      select: false,
      minlength: [6, 'Password must be at least 6 characters'],
    },
    isFirstLogin: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    faceDescriptor: {
      type: [Number],
      default: [],
      select: false,
    },
    faceRegistered: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Hash password before saving
studentSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
studentSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Hide sensitive fields
studentSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.faceDescriptor;
  return obj;
};

export default mongoose.model('Student', studentSchema);
