const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'userModel' },
    userModel: {
      type: String,
      required: true,
      enum: ['User', 'Worker', 'Admin'],
    },
    type: { type: String },
    title: { type: String, required: true },
    message: { type: String, required: true },
    complaintId: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint' },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;
