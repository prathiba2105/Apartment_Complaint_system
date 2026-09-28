const User = require('../models/User');
const Complaint = require('../models/Complaint');
const Notification = require('../models/Notification');
const ComplaintTimeline = require('../models/ComplaintTimeline');
const Worker = require('../models/Worker');
const bcrypt = require('bcryptjs');
const { updateWorkerAvailability } = require('./complaintHelpers');

const userController = {
  getProfile: async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ message: 'User not found' });
      res.json(user);
    } catch (error) {
      next(error);
    }
  },

  updateProfile: async (req, res, next) => {
    try {
      const { name, phone, apartment, block, floor, flat } = req.body;
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ message: 'User not found' });
      if (name) user.name = name;
      if (phone !== undefined) user.phone = phone;
      if (apartment !== undefined) user.apartment = apartment;
      if (block !== undefined) user.block = block;
      if (floor !== undefined) user.floor = floor;
      if (flat !== undefined) user.flat = flat;
      await user.save();
      res.json({ message: 'Profile updated successfully', user });
    } catch (error) {
      next(error);
    }
  },

  changePassword: async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = await User.findById(req.user.id).select('+password');
      if (!user) return res.status(404).json({ message: 'User not found' });
      if (!(await user.matchPassword(currentPassword))) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters' });
      }
      user.password = newPassword;
      await user.save();
      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      next(error);
    }
  },

  getDashboard: async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id);
      const complaints = await Complaint.find({ userId: req.user.id })
        .populate('assignedWorker', 'name category')
        .sort({ createdAt: -1 });
      const stats = {
        total: complaints.length,
        inProgress: complaints.filter((c) => c.status === 'IN_PROGRESS').length,
        completed: complaints.filter((c) => c.status === 'COMPLETED').length,
        pending: complaints.filter((c) => c.status === 'PENDING').length,
      };
      res.json({ user, stats, recent: complaints.slice(0, 5) });
    } catch (error) {
      next(error);
    }
  },

  getComplaints: async (req, res, next) => {
    try {
      const complaints = await Complaint.find({ userId: req.user.id })
        .populate('assignedWorker', 'name category')
        .sort({ createdAt: -1 });
      res.json(complaints);
    } catch (error) {
      next(error);
    }
  },

  getComplaintById: async (req, res, next) => {
    try {
      const complaint = await Complaint.findOne({
        _id: req.params.id,
        userId: req.user.id,
      }).populate('assignedWorker', 'name category phone');
      if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
      res.json(complaint);
    } catch (error) {
      next(error);
    }
  },

  confirmCompletion: async (req, res, next) => {
    try {
      const complaint = await Complaint.findOne({
        _id: req.params.id,
        userId: req.user.id,
      });
      if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
      if (complaint.status !== 'COMPLETED') {
        return res.status(400).json({ message: 'Only completed complaints can be confirmed' });
      }
      complaint.status = 'CLOSED';
      complaint.closedAt = new Date();
      await complaint.save();

      if (complaint.assignedWorker) {
        const worker = await Worker.findById(complaint.assignedWorker);
        if (worker && worker.currentTaskCount > 0) {
          worker.currentTaskCount -= 1;
          await worker.save();
          await updateWorkerAvailability(worker._id);
        }
      }

      await ComplaintTimeline.create({
        complaintId: complaint._id,
        action: 'Complaint Closed',
        performedBy: req.user.name || 'User',
        role: 'user',
        description: 'User confirmed work completion and closed the complaint.',
      });

      await Notification.create({
        userId: complaint.assignedWorker,
        userModel: 'Worker',
        type: 'complaint_closed',
        title: 'Complaint Closed',
        message: `Complaint "${complaint.title}" has been closed by the resident.`,
        complaintId: complaint._id,
      });
      if (req.app && req.app.get('io')) {
        req.app.get('io').to('admin').emit('complaintStatusUpdated', {
          complaintId: complaint._id,
          status: 'CLOSED',
        });
        if (complaint.assignedWorker) {
          req.app.get('io').to(`worker_${complaint.assignedWorker}`).emit('complaintStatusUpdated', {
            complaintId: complaint._id,
            status: 'CLOSED',
          });
        }
      }
      res.json({ message: 'Complaint closed. Thank you!', complaint });
    } catch (error) {
      next(error);
    }
  },

  reopenComplaint: async (req, res, next) => {
    try {
      const complaint = await Complaint.findOne({
        _id: req.params.id,
        userId: req.user.id,
      });
      if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
      if (complaint.status !== 'CLOSED' && complaint.status !== 'COMPLETED') {
        return res.status(400).json({ message: 'Only closed/completed complaints can be reopened' });
      }
      complaint.status = 'REOPENED';
      await complaint.save();

      await ComplaintTimeline.create({
        complaintId: complaint._id,
        action: 'Complaint Reopened',
        performedBy: req.user.name || 'User',
        role: 'user',
        description: 'User reopened the complaint as the issue was not resolved.',
      });

      await Notification.create({
        userId: '000000000000000000000000',
        userModel: 'Admin',
        type: 'reopened',
        title: 'Complaint Reopened',
        message: `Complaint "${complaint.title}" was reopened by the resident.`,
        complaintId: complaint._id,
      });
      if (req.app && req.app.get('io')) {
        req.app.get('io').to('admin').emit('complaintStatusUpdated', {
          complaintId: complaint._id,
          status: 'REOPENED',
        });
      }
      res.json({ message: 'Complaint reopened', complaint });
    } catch (error) {
      next(error);
    }
  },

  getNotifications: async (req, res, next) => {
    try {
      const notifications = await Notification.find({
        userId: req.user.id,
        userModel: 'User',
      }).sort({ createdAt: -1 });
      const unread = notifications.filter((n) => !n.isRead).length;
      res.json({ notifications, unread });
    } catch (error) {
      next(error);
    }
  },

  markNotificationRead: async (req, res, next) => {
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: req.params.id, userId: req.user.id },
        { isRead: true },
        { new: true }
      );
      if (!notification) return res.status(404).json({ message: 'Notification not found' });
      res.json({ message: 'Notification marked as read', notification });
    } catch (error) {
      next(error);
    }
  },

  markAllNotificationsRead: async (req, res, next) => {
    try {
      await Notification.updateMany(
        { userId: req.user.id, userModel: 'User', isRead: false },
        { isRead: true }
      );
      res.json({ message: 'All notifications marked as read' });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = userController;
