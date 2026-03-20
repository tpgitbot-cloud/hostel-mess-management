import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  mealTimes: {
    BREAKFAST: {
      start: { type: Number, default: 7 }, // 7 AM
      end: { type: Number, default: 9 },   // 9 AM
    },
    LUNCH: {
      start: { type: Number, default: 12 }, // 12 PM
      end: { type: Number, default: 14 },   // 2 PM
    },
    DINNER: {
      start: { type: Number, default: 19 }, // 7 PM
      end: { type: Number, default: 21 },   // 9 PM
    }
  },
  eggDay: { type: Number, default: 4 }, // 4 = Thursday
  siteName: { type: String, default: 'Hostel Mess Management' },
  contactNumber: String,
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
}, { timestamps: true });

const Settings = mongoose.model('Settings', settingsSchema);
export default Settings;
