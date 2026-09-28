const mongoose = require('mongoose');

const loginActivitySchema = new mongoose.Schema(
  {
    userId: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    role: { type: String, enum: ['USER', 'WORKER', 'ADMIN'] },
    success: { type: Boolean, default: true },
    ip: { type: String, trim: true },
    userAgent: { type: String, trim: true },
  },
  { timestamps: true }
);

loginActivitySchema.index({ role: 1, createdAt: -1 });

const LoginActivity = mongoose.model('LoginActivity', loginActivitySchema);

module.exports = LoginActivity;
