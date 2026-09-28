const mongoose = require('mongoose');

const complaintTimelineSchema = new mongoose.Schema({
  complaintId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Complaint',
    required: true,
  },
  action: { type: String, required: true },
  performedBy: { type: String },
  role: { type: String, enum: ['user', 'worker', 'admin'] },
  description: { type: String },
  timestamp: { type: Date, default: Date.now },
});

const ComplaintTimeline = mongoose.model('ComplaintTimeline', complaintTimelineSchema);
module.exports = ComplaintTimeline;
