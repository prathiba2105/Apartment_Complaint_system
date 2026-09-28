const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema(
  {
    complaintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Complaint',
      required: true,
      unique: true,
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker', required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    feedback: { type: String, trim: true },
    onTime: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Rating = mongoose.model('Rating', ratingSchema);
module.exports = Rating;
