const Message = require('../models/Message');
const Complaint = require('../models/Complaint');
const User = require('../models/User');
const Worker = require('../models/Worker');
const Notification = require('../models/Notification');
const { emitToRoom } = require('./complaintHelpers');

const WORKER_TYPES = {
  plumbing: 'Plumber',
  electrical: 'Electrician',
  carpentry: 'Carpenter',
  cleaning: 'Cleaner',
  painting: 'Painter',
  'ac technician': 'AC Technician',
  security: 'Security',
  'maintenance worker': 'Maintenance Worker',
  gardener: 'Gardener',
  'lift technician': 'Lift Technician',
  'water maintenance': 'Maintenance Worker',
  other: 'Other',
};

/**
 * Resolve a sender display name for a given model+id.
 */
const resolveName = async (senderModel, senderId) => {
  if (senderModel === 'Admin') return 'Admin';
  if (senderModel === 'User') {
    const u = await User.findById(senderId);
    return u ? u.name : 'User';
  }
  const w = await Worker.findById(senderId);
  return w ? w.name : 'Worker';
};

/**
 * Ensure the requesting party is permitted to access this complaint's chat.
 * - USER  : must own the complaint
 * - WORKER: must be the assigned worker
 * - ADMIN : always allowed
 */
const canAccess = async (complaint, role, id) => {
  if (role === 'ADMIN') return true;
  if (role === 'USER') {
    return complaint.userId && complaint.userId.toString() === id.toString();
  }
  if (role === 'WORKER') {
    return (
      complaint.assignedWorker &&
      complaint.assignedWorker.toString() === id.toString()
    );
  }
  return false;
};

const messageController = {
  getMessages: async (req, res, next) => {
    try {
      const complaint = await Complaint.findById(req.params.id);
      if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
      if (!(await canAccess(complaint, req.user.role, req.user.id))) {
        return res.status(403).json({ message: 'Not authorized to view this conversation' });
      }
      const messages = await Message.find({ complaintId: complaint._id }).sort({
        createdAt: 1,
      });
      // Mark messages as read where the reader is not the sender
      const readerModel =
        req.user.role === 'USER' ? 'User' : req.user.role === 'WORKER' ? 'Worker' : 'Admin';
      await Message.updateMany(
        {
          complaintId: complaint._id,
          senderModel: { $ne: readerModel },
          isRead: false,
        },
        { isRead: true }
      );
      res.json(messages);
    } catch (error) {
      next(error);
    }
  },

  sendMessage: async (req, res, next) => {
    try {
      const complaint = await Complaint.findById(req.params.id);
      if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

      const role = req.user.role;
      const id = req.user.id;
      const model = role === 'USER' ? 'User' : role === 'WORKER' ? 'Worker' : 'Admin';

      // Only the complaint owner (user) or the assigned worker can send.
      if (!(await canAccess(complaint, role, id))) {
        return res.status(403).json({ message: 'Not authorized to message this complaint' });
      }
      if (role === 'WORKER') {
        // Workers may only message when assigned to this complaint
        if (!complaint.assignedWorker || complaint.assignedWorker.toString() !== id.toString()) {
          return res.status(403).json({ message: 'You are not assigned to this complaint' });
        }
      }

      const text = (req.body.text || '').toString().trim();
      if (!text && !req.body.image) {
        return res.status(400).json({ message: 'Message text is required' });
      }

      const senderName = await resolveName(model, id);
      const message = await Message.create({
        complaintId: complaint._id,
        senderId: id,
        senderModel: model,
        senderName,
        text,
        image: req.body.image || undefined,
        kind: req.body.kind || 'text',
      });

      // Notify + emit to the other party
      if (role === 'USER') {
        if (complaint.assignedWorker) {
          await Notification.create({
            userId: complaint.assignedWorker,
            userModel: 'Worker',
            type: 'new_message',
            title: 'New Message from Resident',
            message: `${senderName}: ${text || 'Sent an image'}`,
            complaintId: complaint._id,
          });
          emitToRoom(
            req,
            `worker_${complaint.assignedWorker}`,
            'newMessage',
            message
          );
        }
      } else if (role === 'WORKER') {
        await Notification.create({
          userId: complaint.userId,
          userModel: 'User',
          type: 'new_message',
          title: 'New Message from Worker',
          message: `${senderName}: ${text || 'Sent an image'}`,
          complaintId: complaint._id,
        });
        emitToRoom(req, `user_${complaint.userId}`, 'newMessage', message);
      }
      emitToRoom(req, `admin`, 'newMessage', message);

      res.status(201).json({ message: 'Message sent', message });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = messageController;
module.exports.WORKER_TYPES = WORKER_TYPES;
