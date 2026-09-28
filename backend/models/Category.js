const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true },
    icon: { type: String, default: '🏷️' },
    assignedWorkerType: { type: String, trim: true },
    priorityDefault: {
      type: String,
      default: 'Medium',
      enum: ['Low', 'Medium', 'High', 'Emergency'],
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Category = mongoose.model('Category', categorySchema);
module.exports = Category;
