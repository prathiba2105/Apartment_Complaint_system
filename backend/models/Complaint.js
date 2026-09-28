const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema(
  {
    complaintId: { type: String, required: true, unique: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    title: { type: String, required: [true, 'Title is required'], trim: true },
    description: { type: String, trim: true },
    category: {
      type: String,
      required: [true, 'Category is required'],
      // Categories are dynamic (managed via the Category collection).
    },
    apartment: { type: String, trim: true },
    block: { type: String, trim: true },
    floor: { type: String, trim: true },
    flat: { type: String, trim: true },
    priority: {
      type: String,
      default: 'Medium',
      enum: ['Low', 'Medium', 'High', 'Emergency'],
    },
    image: { type: String },
    images: [{ type: String }],
    attachments: [
      {
        fileName: { type: String },
        fileType: { type: String },
        fileSize: { type: Number },
        s3Key: { type: String },
      },
    ],
    preferredDate: { type: Date },
    preferredTime: { type: String },
    additionalNotes: { type: String },
    status: {
      type: String,
      default: 'PENDING',
      enum: ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED', 'CANCELLED', 'REOPENED'],
    },
    assignedWorker: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker' },
    assignedBy: { type: String, default: 'admin' },
    assignedAt: { type: Date },
    acceptedAt: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },
    closedAt: { type: Date },
    expectedDate: { type: Date },
    instructions: { type: String },
    rejectionReason: { type: String },
    workNotes: [
      {
        text: { type: String },
        image: { type: String },
        addedBy: { type: String, enum: ['worker', 'admin'] },
        addedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

const Complaint = mongoose.model('Complaint', complaintSchema);
module.exports = Complaint;
