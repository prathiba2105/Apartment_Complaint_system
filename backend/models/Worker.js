const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const workerSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Worker name is required'], trim: true },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    phone: { type: String, trim: true },
    category: {
      type: String,
      required: [true, 'Category is required'],
      // Specialization; kept flexible so worker types can match complaint categories
      // and the broader worker-type list (Plumber, Electrician, ...).
    },
    workerType: { type: String, trim: true },
    skills: [{ type: String }],
    assignedArea: { type: String, trim: true },
    photo: { type: String },
    experience: { type: Number, default: 0 },
    address: { type: String, trim: true },
    role: { type: String, default: 'WORKER', enum: ['WORKER'] },
    availabilityStatus: {
      type: String,
      default: 'AVAILABLE',
      enum: ['AVAILABLE', 'BUSY', 'OFFLINE'],
    },
    workStatus: {
      type: String,
      default: 'IDLE',
      enum: ['IDLE', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED'],
    },
    currentTaskCount: { type: Number, default: 0 },
    completedTaskCount: { type: Number, default: 0 },
    rejectedTaskCount: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    ratingSum: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    onTimeCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

workerSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

workerSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const Worker = mongoose.model('Worker', workerSchema);
module.exports = Worker;
