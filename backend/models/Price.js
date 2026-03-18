import mongoose from 'mongoose';

const priceSchema = new mongoose.Schema(
  {
    breakfast: {
      type: Number,
      required: [true, 'Breakfast price is required'],
      min: [0, 'Price cannot be negative'],
    },
    lunch: {
      type: Number,
      required: [true, 'Lunch price is required'],
      min: [0, 'Price cannot be negative'],
    },
    dinner: {
      type: Number,
      required: [true, 'Dinner price is required'],
      min: [0, 'Price cannot be negative'],
    },
    effectiveFrom: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Price', priceSchema);
