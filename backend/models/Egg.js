import mongoose from 'mongoose';

const eggSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student ID is required'],
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
    },
    scanTime: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Compound index to ensure only one egg per student per week
eggSchema.index({ studentId: 1, date: 1 }, { unique: true });

export default mongoose.model('Egg', eggSchema);
