const mongoose = require('mongoose');

/**
 * Application-wide settings. Stored as a single document keyed by 'global'.
 */
const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'global', unique: true },
    adminProfile: {
      name: { type: String, default: 'Admin' },
      email: { type: String, default: 'admin@apartmentcare.com' },
      phone: { type: String, default: '' },
    },
    notification: {
      newComplaint: { type: Boolean, default: true },
      emergencyAlert: { type: Boolean, default: true },
      workerReject: { type: Boolean, default: true },
      overdue: { type: Boolean, default: true },
    },
    complaint: {
      defaultPriority: { type: String, default: 'Medium' },
      autoAssign: { type: Boolean, default: false },
      allowMultipleImages: { type: Boolean, default: true },
    },
    worker: {
      strictAvailability: { type: Boolean, default: true },
    },
    app: {
      name: { type: String, default: 'Apartment Care' },
      supportEmail: { type: String, default: '' },
      supportPhone: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

const Settings = mongoose.model('Settings', settingsSchema);
module.exports = Settings;
