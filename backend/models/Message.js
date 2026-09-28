const mongoose = require('mongoose');

/**
 * Complaint-specific chat message between a resident and the assigned worker.
 * Only the complaint owner (User) and the assigned worker (Worker) may post.
 * Admin can view (and optionally post notes) for monitoring.
 */
const messageSchema = new mongoose.Schema(
  {
    complaintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Complaint',
      required: true,
      index: true,
    },
    senderId: { type: mongoose.Schema.Types.ObjectId, required: true },
    senderModel: { type: String, enum: ['User', 'Worker', 'Admin'], required: true },
    senderName: { type: String, required: true },
    text: { type: String, required: [true, 'Message text is required'] },
    image: { type: String },
    kind: {
      type: String,
      enum: ['text', 'eta', 'arrival', 'delay'],
      default: 'text',
    },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;
