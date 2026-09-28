const Complaint = require('../models/Complaint');
const Worker = require('../models/Worker');
const Notification = require('../models/Notification');
const ComplaintTimeline = require('../models/ComplaintTimeline');
const {
  updateWorkerAvailability,
  emitToRoom,
} = require('./complaintHelpers');

const workerController = {
  getDashboard: async (req, res, next) => {
    try {
      const worker = await Worker.findById(req.user.id);
      if (!worker) return res.status(404).json({ message: 'Worker not found' });
      const complaints = await Complaint.find({
        assignedWorker: req.user.id,
      }).populate('userId', 'name flat block apartment');
      const stats = {
        assigned: complaints.filter((c) => c.status === 'ASSIGNED').length,
        inProgress: complaints.filter((c) => c.status === 'IN_PROGRESS').length,
        completed: complaints.filter((c) => c.status === 'COMPLETED').length,
        fresh: complaints.filter(
          (c) => c.status === 'ASSIGNED' && !c.acceptedAt
        ).length,
      };
      res.json({ worker, stats, complaints });
    } catch (error) {
      next(error);
    }
  },

  getComplaints: async (req, res, next) => {
    try {
      const complaints = await Complaint.find({
        assignedWorker: req.user.id,
      }).populate('userId', 'name flat block apartment');
      res.json(complaints);
    } catch (error) {
      next(error);
    }
  },

  getComplaintById: async (req, res, next) => {
    try {
      const complaint = await Complaint.findOne({
        _id: req.params.id,
        assignedWorker: req.user.id,
      }).populate('userId', 'name phone flat block apartment');
      if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
      res.json(complaint);
    } catch (error) {
      next(error);
    }
  },

  updateStatus: async (req, res, next) => {
    try {
      const { availabilityStatus } = req.body;
      const worker = await Worker.findById(req.user.id);
      if (!worker) return res.status(404).json({ message: 'Worker not found' });
      if (availabilityStatus) {
        worker.availabilityStatus = availabilityStatus;
      }
      await worker.save();
      emitToRoom(req, `admin`, 'workerStatusUpdated', {
        workerId: worker._id,
        availabilityStatus: worker.availabilityStatus,
        workStatus: worker.workStatus,
        currentTaskCount: worker.currentTaskCount,
      });
      res.json({ message: 'Status updated', worker });
    } catch (error) {
      next(error);
    }
  },

  acceptComplaint: async (req, res, next) => {
    try {
      const complaint = await Complaint.findOne({
        _id: req.params.id,
        assignedWorker: req.user.id,
      });
      if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
      if (complaint.status !== 'ASSIGNED') {
        return res.status(400).json({ message: 'Complaint is not in ASSIGNED status' });
      }
      complaint.status = 'IN_PROGRESS';
      complaint.acceptedAt = new Date();
      await complaint.save();

      const worker = await Worker.findById(req.user.id);
      worker.workStatus = 'IN_PROGRESS';
      await worker.save();

      await ComplaintTimeline.create({
        complaintId: complaint._id,
        action: 'Worker Accepted',
        performedBy: worker.name,
        role: 'worker',
        description: `${worker.name} accepted the complaint`,
      });

      // Notify the user
      await Notification.create({
        userId: complaint.userId,
        userModel: 'User',
        type: 'work_started',
        title: 'Work Started',
        message: `Worker ${worker.name} has started working on your complaint "${complaint.title}".`,
        complaintId: complaint._id,
      });
      emitToRoom(req, `user_${complaint.userId}`, 'complaintStatusUpdated', {
        complaintId: complaint._id,
        status: 'IN_PROGRESS',
      });

      res.json({ message: 'Complaint accepted and work started', complaint });
    } catch (error) {
      next(error);
    }
  },

  startComplaint: async (req, res, next) => {
    try {
      const complaint = await Complaint.findOne({
        _id: req.params.id,
        assignedWorker: req.user.id,
      });
      if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
      if (['COMPLETED', 'CANCELLED'].includes(complaint.status)) {
        return res.status(400).json({ message: `Complaint is already ${complaint.status}` });
      }
      complaint.status = 'IN_PROGRESS';
      complaint.startedAt = complaint.startedAt || new Date();
      await complaint.save();

      const worker = await Worker.findById(req.user.id);
      worker.workStatus = 'IN_PROGRESS';
      await worker.save();

      await ComplaintTimeline.create({
        complaintId: complaint._id,
        action: 'Work Started',
        performedBy: worker.name,
        role: 'worker',
        description: `${worker.name} started work on the complaint`,
      });

      await Notification.create({
        userId: complaint.userId,
        userModel: 'User',
        type: 'work_started',
        title: 'Work Started',
        message: `Worker ${worker.name} has started work on your complaint "${complaint.title}".`,
        complaintId: complaint._id,
      });
      emitToRoom(req, `user_${complaint.userId}`, 'complaintStatusUpdated', {
        complaintId: complaint._id,
        status: 'IN_PROGRESS',
      });

      res.json({ message: 'Work started', complaint });
    } catch (error) {
      next(error);
    }
  },

  completeComplaint: async (req, res, next) => {
    try {
      const complaint = await Complaint.findOne({
        _id: req.params.id,
        assignedWorker: req.user.id,
      });
      if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
      if (['COMPLETED', 'CANCELLED'].includes(complaint.status)) {
        return res.status(400).json({ message: `Complaint is already ${complaint.status}` });
      }
      complaint.status = 'COMPLETED';
      complaint.completedAt = new Date();
      await complaint.save();

      const worker = await Worker.findById(req.user.id);
      worker.completedTaskCount += 1;
      if (worker.currentTaskCount > 0) worker.currentTaskCount -= 1;
      worker.workStatus = worker.currentTaskCount > 0 ? 'IN_PROGRESS' : 'COMPLETED';
      await worker.save();
      await updateWorkerAvailability(req.user.id);

      await ComplaintTimeline.create({
        complaintId: complaint._id,
        action: 'Work Completed',
        performedBy: worker.name,
        role: 'worker',
        description: `${worker.name} marked the complaint as completed`,
      });

      await Notification.create({
        userId: complaint.userId,
        userModel: 'User',
        type: 'complaint_completed',
        title: 'Complaint Completed',
        message: `Your complaint "${complaint.title}" has been completed by ${worker.name}.`,
        complaintId: complaint._id,
      });
      emitToRoom(req, `user_${complaint.userId}`, 'complaintStatusUpdated', {
        complaintId: complaint._id,
        status: 'COMPLETED',
      });
      emitToRoom(req, `admin`, 'complaintStatusUpdated', {
        complaintId: complaint._id,
        status: 'COMPLETED',
      });
      emitToRoom(req, `worker_${req.user.id}`, 'workerStatusUpdated', {
        workerId: req.user.id,
        availabilityStatus: worker.availabilityStatus,
        workStatus: worker.workStatus,
        currentTaskCount: worker.currentTaskCount,
      });

      res.json({ message: 'Complaint completed', complaint, worker });
    } catch (error) {
      next(error);
    }
  },

  addNote: async (req, res, next) => {
    try {
      const complaint = await Complaint.findOne({
        _id: req.params.id,
        assignedWorker: req.user.id,
      });
      if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
      if (!req.body.text) {
        return res.status(400).json({ message: 'Note text is required' });
      }
      complaint.workNotes.push({
        text: req.body.text,
        image: req.body.image || undefined,
        addedBy: 'worker',
      });
      await complaint.save();
      await ComplaintTimeline.create({
        complaintId: complaint._id,
        action: 'Note Added',
        performedBy: (await Worker.findById(req.user.id)).name,
        role: 'worker',
        description: req.body.text,
      });
      res.json({ message: 'Note added', complaint });
    } catch (error) {
      next(error);
    }
  },

  rejectComplaint: async (req, res, next) => {
    try {
      const complaint = await Complaint.findOne({
        _id: req.params.id,
        assignedWorker: req.user.id,
      });
      if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
      if (complaint.status !== 'ASSIGNED') {
        return res.status(400).json({ message: 'Only assigned complaints can be rejected' });
      }
      const reason = (req.body && req.body.reason) || 'No reason provided';

      const worker = await Worker.findById(req.user.id);
      // Return task to admin/pool
      complaint.status = 'PENDING';
      complaint.assignedWorker = null;
      complaint.assignedAt = null;
      complaint.rejectionReason = reason;
      await complaint.save();

      if (worker) {
        worker.rejectedTaskCount = (worker.rejectedTaskCount || 0) + 1;
        if (worker.currentTaskCount > 0) worker.currentTaskCount -= 1;
        worker.workStatus = worker.currentTaskCount > 0 ? 'IN_PROGRESS' : 'IDLE';
        await worker.save();
        await updateWorkerAvailability(worker._id);
      }

      await ComplaintTimeline.create({
        complaintId: complaint._id,
        action: 'Worker Rejected',
        performedBy: worker ? worker.name : 'Worker',
        role: 'worker',
        description: `Worker rejected the assignment. Reason: ${reason}`,
      });

      await Notification.create({
        userId: '000000000000000000000000',
        userModel: 'Admin',
        type: 'worker_rejected',
        title: 'Worker Rejected Assignment',
        message: `${worker ? worker.name : 'Worker'} rejected complaint "${complaint.title}". Reason: ${reason}.`,
        complaintId: complaint._id,
      });
      await Notification.create({
        userId: complaint.userId,
        userModel: 'User',
        type: 'status_updated',
        title: 'Worker Rejected',
        message: `The assigned worker could not take your complaint "${complaint.title}". We are finding a new worker.`,
        complaintId: complaint._id,
      });

      emitToRoom(req, 'admin', 'complaintStatusUpdated', {
        complaintId: complaint._id,
        status: 'PENDING',
      });
      emitToRoom(req, `user_${complaint.userId}`, 'complaintStatusUpdated', {
        complaintId: complaint._id,
        status: 'PENDING',
      });

      res.json({ message: 'Complaint rejected', complaint });
    } catch (error) {
      next(error);
    }
  },

  getNotifications: async (req, res, next) => {
    try {
      const notifications = await Notification.find({
        userId: req.user.id,
        userModel: 'Worker',
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
        { _id: req.params.id, userId: req.user.id, userModel: 'Worker' },
        { isRead: true },
        { new: true }
      );
      if (!notification) return res.status(404).json({ message: 'Notification not found' });
      res.json({ message: 'Notification marked as read', notification });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = workerController;
