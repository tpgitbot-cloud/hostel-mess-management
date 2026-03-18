import mongoose from 'mongoose';

const mealSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student ID is required'],
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
      default: () => {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        return date;
      },
    },
    mealType: {
      type: String,
      enum: ['BREAKFAST', 'LUNCH', 'DINNER'],
      required: [true, 'Meal type is required'],
    },
    scanTime: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Compound index to prevent duplicate entries per student per meal per day
mealSchema.index({ studentId: 1, date: 1, mealType: 1 }, { unique: true });
mealSchema.index({ date: 1 });

export default mongoose.model('Meal', mealSchema);
