const User = require('../models/User');
const Worker = require('../models/Worker');
const Complaint = require('../models/Complaint');
const Notification = require('../models/Notification');
const ComplaintTimeline = require('../models/ComplaintTimeline');
const Category = require('../models/Category');
const Rating = require('../models/Rating');
const {
  updateWorkerAvailability,
  emitToRoom,
} = require('./complaintHelpers');

const createNotification = async ({ userId, userModel, type, title, message, complaintId }) => {
  return Notification.create({ userId, userModel, type, title, message, complaintId });
};

const adminController = {
  /* ===================== DASHBOARD ===================== */
  getStats: async (req, res, next) => {
    try {
      const [
        totalUsers,
        totalWorkers,
        totalComplaints,
        pending,
        assigned,
        inProgress,
        resolved,
        closed,
        cancelled,
        highPriority,
        emergency,
        today,
      ] = await Promise.all([
        User.countDocuments(),
        Worker.countDocuments(),
        Complaint.countDocuments(),
        Complaint.countDocuments({ status: 'PENDING' }),
        Complaint.countDocuments({ status: 'ASSIGNED' }),
        Complaint.countDocuments({ status: 'IN_PROGRESS' }),
        Complaint.countDocuments({ status: 'COMPLETED' }),
        Complaint.countDocuments({ status: 'CLOSED' }),
        Complaint.countDocuments({ status: 'CANCELLED' }),
        Complaint.countDocuments({ priority: 'High' }),
        Complaint.countDocuments({ priority: 'Emergency' }),
        Complaint.countDocuments({
          createdAt: { $gte: new Date().setHours(0, 0, 0, 0) },
        }),
      ]);

      // recent complaints (for dashboard table)
      const recent = await Complaint.find()
        .populate('userId', 'name flat block apartment phone')
        .populate('assignedWorker', 'name category')
        .sort({ createdAt: -1 })
        .limit(6);

      // overdue: assigned/in-progress past expected date
      const overdue = await Complaint.countDocuments({
        status: { $in: ['ASSIGNED', 'IN_PROGRESS'] },
        expectedDate: { $lt: new Date() },
      });

      res.json({
        totalUsers,
        totalWorkers,
        totalComplaints,
        pending,
        assigned,
        inProgress,
        resolved,
        closed,
        cancelled,
        highPriority,
        emergency,
        today,
        overdue,
        recent,
      });
    } catch (error) {
      next(error);
    }
  },

  /* ===================== USERS ===================== */
  getUsers: async (req, res, next) => {
    try {
      const { search, status, page = 1, limit = 50 } = req.query;
      const query = {};
      if (search) {
        query.$or = [
          { name: new RegExp(search, 'i') },
          { email: new RegExp(search, 'i') },
          { phone: new RegExp(search, 'i') },
          { flat: new RegExp(search, 'i') },
          { block: new RegExp(search, 'i') },
        ];
      }
      if (status === 'active') query.isActive = true;
      if (status === 'inactive') query.isActive = false;

      const total = await User.countDocuments(query);
      const users = await User.find(query)
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit));

      const complaintCounts = await Complaint.aggregate([
        { $group: { _id: '$userId', count: { $sum: 1 } } },
      ]);
      const countMap = {};
      complaintCounts.forEach((c) => (countMap[c._id] = c.count));
      const result = users.map((u) => ({
        ...u.toObject(),
        complaintCount: countMap[u._id] || 0,
      }));
      res.json({ users: result, total, page: Number(page), limit: Number(limit) });
    } catch (error) {
      next(error);
    }
  },

  getUserById: async (req, res, next) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ message: 'User not found' });
      const complaints = await Complaint.find({ userId: user._id })
        .populate('assignedWorker', 'name category')
        .sort({ createdAt: -1 });
      res.json({ user, complaints });
    } catch (error) {
      next(error);
    }
  },

  updateUserStatus: async (req, res, next) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ message: 'User not found' });
      user.isActive = req.body.isActive !== undefined ? req.body.isActive : user.isActive;
      await user.save();
      res.json({ message: 'User status updated', user });
    } catch (error) {
      next(error);
    }
  },

  deleteUser: async (req, res, next) => {
    try {
      const user = await User.findByIdAndDelete(req.params.id);
      if (!user) return res.status(404).json({ message: 'User not found' });
      await Complaint.deleteMany({ userId: user._id });
      await Notification.deleteMany({ userId: user._id, userModel: 'User' });
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      next(error);
    }
  },

  /* ===================== WORKERS ===================== */
  getWorkers: async (req, res, next) => {
    try {
      const { availability, category, search, page = 1, limit = 50 } = req.query;
      const query = {};
      if (availability) query.availabilityStatus = availability;
      if (category) query.category = category;
      if (search) {
        query.$or = [
          { name: new RegExp(search, 'i') },
          { email: new RegExp(search, 'i') },
          { phone: new RegExp(search, 'i') },
          { category: new RegExp(search, 'i') },
          { workerType: new RegExp(search, 'i') },
        ];
      }
      const total = await Worker.countDocuments(query);
      const workers = await Worker.find(query)
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit));
      res.json({ workers, total, page: Number(page), limit: Number(limit) });
    } catch (error) {
      next(error);
    }
  },

  getAvailableWorkers: async (req, res, next) => {
    try {
      const { category } = req.query;
      const query = { isActive: true, availabilityStatus: { $nin: ['OFFLINE'] } };
      if (category) query.category = category;
      const workers = await Worker.find(query).sort({ currentTaskCount: 1, experience: -1 });
      res.json(workers);
    } catch (error) {
      next(error);
    }
  },

  getWorkerById: async (req, res, next) => {
    try {
      const worker = await Worker.findById(req.params.id);
      if (!worker) return res.status(404).json({ message: 'Worker not found' });
      const complaints = await Complaint.find({ assignedWorker: worker._id }).sort({
        createdAt: -1,
      });
      const ratings = await Rating.find({ workerId: worker._id })
        .populate('userId', 'name flat block')
        .sort({ createdAt: -1 });
      res.json({ worker, complaints, ratings });
    } catch (error) {
      next(error);
    }
  },

  addWorker: async (req, res, next) => {
    try {
      const {
        name,
        email,
        password,
        phone,
        category,
        workerType,
        skills,
        assignedArea,
        photo,
        experience,
        address,
        availabilityStatus,
      } = req.body;
      if (!name || !email || !password || !category) {
        return res.status(400).json({ message: 'Name, email, password and category are required' });
      }
      const existing = await Worker.findOne({ email });
      if (existing) return res.status(409).json({ message: 'Email already registered' });
      console.log('Add worker request received:', { name, email, category, workerType });
      const worker = await Worker.create({
        name,
        email,
        password,
        phone,
        category,
        workerType: workerType || category,
        skills: Array.isArray(skills) ? skills : skills ? String(skills).split(',').map((s) => s.trim()).filter(Boolean) : [],
        assignedArea,
        photo,
        experience: Number(experience) || 0,
        address,
        availabilityStatus: availabilityStatus || 'AVAILABLE',
      });
      console.log('Worker saved successfully:', worker._id);
      res.status(201).json({ message: 'Worker added successfully', worker });
    } catch (error) {
      next(error);
    }
  },

  updateWorker: async (req, res, next) => {
    try {
      const worker = await Worker.findById(req.params.id);
      if (!worker) return res.status(404).json({ message: 'Worker not found' });
      const {
        name,
        phone,
        category,
        workerType,
        skills,
        assignedArea,
        photo,
        experience,
        address,
        availabilityStatus,
        isActive,
      } = req.body;
      if (name) worker.name = name;
      if (phone !== undefined) worker.phone = phone;
      if (category) worker.category = category;
      if (workerType !== undefined) worker.workerType = workerType || category;
      if (skills !== undefined)
        worker.skills = Array.isArray(skills) ? skills : String(skills).split(',').map((s) => s.trim()).filter(Boolean);
      if (assignedArea !== undefined) worker.assignedArea = assignedArea;
      if (photo !== undefined) worker.photo = photo;
      if (experience !== undefined) worker.experience = Number(experience);
      if (address !== undefined) worker.address = address;
      if (availabilityStatus !== undefined) worker.availabilityStatus = availabilityStatus;
      if (isActive !== undefined) worker.isActive = isActive;
      await worker.save();
      res.json({ message: 'Worker updated successfully', worker });
    } catch (error) {
      next(error);
    }
  },

  updateWorkerStatus: async (req, res, next) => {
    try {
      const worker = await Worker.findById(req.params.id);
      if (!worker) return res.status(404).json({ message: 'Worker not found' });
      if (req.body.isActive !== undefined) worker.isActive = req.body.isActive;
      if (req.body.availabilityStatus) {
        worker.availabilityStatus = req.body.availabilityStatus;
      }
      await worker.save();
      emitToRoom(req, `admin`, 'workerStatusUpdated', {
        workerId: worker._id,
        isActive: worker.isActive,
        availabilityStatus: worker.availabilityStatus,
      });
      res.json({ message: 'Worker status updated', worker });
    } catch (error) {
      next(error);
    }
  },

  deleteWorker: async (req, res, next) => {
    try {
      const worker = await Worker.findByIdAndDelete(req.params.id);
      if (!worker) return res.status(404).json({ message: 'Worker not found' });
      // Unassign pending tasks
      await Complaint.updateMany(
        { assignedWorker: worker._id, status: { $nin: ['COMPLETED', 'CLOSED', 'CANCELLED'] } },
        { assignedWorker: null, status: 'PENDING' }
      );
      await Notification.deleteMany({ userId: worker._id, userModel: 'Worker' });
      await Rating.deleteMany({ workerId: worker._id });
      res.json({ message: 'Worker deleted successfully' });
    } catch (error) {
      next(error);
    }
  },

  /* ===================== COMPLAINTS ===================== */
  getComplaints: async (req, res, next) => {
    try {
      const { status, category, priority, search, assigned, overdue, page = 1, limit = 50 } = req.query;
      const query = {};
      if (status) query.status = status;
      if (category) query.category = category;
      if (priority) query.priority = priority;
      if (search) {
        query.$or = [
          { complaintId: new RegExp(search, 'i') },
          { title: new RegExp(search, 'i') },
          { description: new RegExp(search, 'i') },
        ];
      }
      if (assigned === 'yes') query.assignedWorker = { $ne: null };
      if (assigned === 'no') query.assignedWorker = null;
      if (overdue === 'true') {
        query.status = { $in: ['ASSIGNED', 'IN_PROGRESS'] };
        query.expectedDate = { $lt: new Date() };
      }
      const total = await Complaint.countDocuments(query);
      const complaints = await Complaint.find(query)
        .populate('userId', 'name flat block apartment phone email')
        .populate('assignedWorker', 'name category phone')
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit));
      res.json({ complaints, total, page: Number(page), limit: Number(limit) });
    } catch (error) {
      next(error);
    }
  },

  getComplaintById: async (req, res, next) => {
    try {
      const complaint = await Complaint.findById(req.params.id)
        .populate('userId', 'name flat block apartment phone email')
        .populate('assignedWorker', 'name category phone experience');
      if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
      const timeline = await ComplaintTimeline.find({ complaintId: complaint._id }).sort({
        timestamp: 1,
      });
      res.json({ complaint, timeline });
    } catch (error) {
      next(error);
    }
  },

  assignWorker: async (req, res, next) => {
    try {
      const complaint = await Complaint.findById(req.params.id);
      if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
      const { workerId, expectedDate, instructions } = req.body;
      if (!workerId) return res.status(400).json({ message: 'workerId is required' });

      const worker = await Worker.findById(workerId);
      if (!worker) return res.status(404).json({ message: 'Worker not found' });
      if (!worker.isActive) {
        return res.status(400).json({ message: 'Worker is disabled' });
      }
      if (worker.availabilityStatus === 'OFFLINE') {
        return res.status(400).json({ message: 'Worker is offline' });
      }

      // If reassigning, decrement old worker
      if (complaint.assignedWorker && complaint.assignedWorker.toString() !== workerId) {
        const oldWorker = await Worker.findById(complaint.assignedWorker);
        if (oldWorker && oldWorker.currentTaskCount > 0) {
          oldWorker.currentTaskCount -= 1;
          await oldWorker.save();
          await updateWorkerAvailability(oldWorker._id);
          await Notification.create({
            userId: oldWorker._id,
            userModel: 'Worker',
            type: 'reassigned',
            title: 'Complaint Reassigned',
            message: `Complaint "${complaint.title}" has been reassigned to another worker.`,
            complaintId: complaint._id,
          });
          emitToRoom(req, `worker_${oldWorker._id}`, 'complaintReassigned', {
            complaintId: complaint._id,
            title: complaint.title,
          });
        }
      }

      // Assign new worker
      complaint.assignedWorker = workerId;
      complaint.assignedBy = req.user.id;
      complaint.assignedAt = new Date();
      complaint.status = 'ASSIGNED';
      if (expectedDate) complaint.expectedDate = expectedDate;
      if (instructions !== undefined) complaint.instructions = instructions;
      await complaint.save();

      worker.currentTaskCount += 1;
      worker.workStatus = 'ASSIGNED';
      await worker.save();
      await updateWorkerAvailability(worker._id);

      await ComplaintTimeline.create({
        complaintId: complaint._id,
        action: 'Worker Assigned',
        performedBy: 'Admin',
        role: 'admin',
        description: `Complaint assigned to ${worker.name} (${worker.category}).${expectedDate ? ` Expected by ${new Date(expectedDate).toLocaleDateString()}.` : ''}`,
      });

      const assignmentNote =
        instructions || `Expected by ${expectedDate ? new Date(expectedDate).toLocaleDateString() : 'soon'}.`;

      await createNotification({
        userId: worker._id,
        userModel: 'Worker',
        type: 'new_assignment',
        title: 'New Complaint Assigned',
        message: `New complaint "${complaint.title}" (${complaint.complaintId}) assigned. Category: ${complaint.category}, Flat: ${complaint.flat}, Priority: ${complaint.priority}. ${instructions || ''}`,
        complaintId: complaint._id,
      });

      await createNotification({
        userId: complaint.userId,
        userModel: 'User',
        type: 'worker_assigned',
        title: 'Worker Assigned',
        message: `Worker ${worker.name} has been assigned to your complaint "${complaint.title}". ${assignmentNote}`,
        complaintId: complaint._id,
      });

      emitToRoom(req, `worker_${worker._id}`, 'complaintAssigned', {
        complaintId: complaint._id,
        title: complaint.title,
        category: complaint.category,
        flat: complaint.flat,
        priority: complaint.priority,
      });
      emitToRoom(req, `user_${complaint.userId}`, 'complaintStatusUpdated', {
        complaintId: complaint._id,
        status: 'ASSIGNED',
        worker: { name: worker.name, category: worker.category },
      });
      emitToRoom(req, `admin`, 'complaintAssigned', { complaintId: complaint._id, workerId });

      res.json({
        message: 'Complaint assigned successfully',
        complaint,
        worker,
      });
    } catch (error) {
      next(error);
    }
  },

  reassignWorker: async (req, res, next) => {
    try {
      const complaint = await Complaint.findById(req.params.id);
      if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
      return adminController.assignWorker(req, res, next);
    } catch (error) {
      next(error);
    }
  },

  updateComplaintStatus: async (req, res, next) => {
    try {
      const complaint = await Complaint.findById(req.params.id);
      if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
      const { status } = req.body;
      const allowed = ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED', 'CANCELLED', 'REOPENED'];
      if (!allowed.includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }
      complaint.status = status;
      if (status === 'COMPLETED') complaint.completedAt = new Date();
      if (status === 'CLOSED') complaint.closedAt = new Date();
      if ((status === 'CANCELLED' || status === 'CLOSED') && complaint.assignedWorker) {
        const worker = await Worker.findById(complaint.assignedWorker);
        if (worker && worker.currentTaskCount > 0) {
          worker.currentTaskCount -= 1;
          await worker.save();
          await updateWorkerAvailability(worker._id);
        }
      }
      await complaint.save();

      await ComplaintTimeline.create({
        complaintId: complaint._id,
        action: `Status Changed to ${status}`,
        performedBy: 'Admin',
        role: 'admin',
        description: `Complaint status changed to ${status}.`,
      });

      await createNotification({
        userId: complaint.userId,
        userModel: 'User',
        type: 'status_updated',
        title: 'Status Updated',
        message: `Your complaint "${complaint.title}" status is now ${status}.`,
        complaintId: complaint._id,
      });
      emitToRoom(req, `user_${complaint.userId}`, 'complaintStatusUpdated', {
        complaintId: complaint._id,
        status,
      });
      emitToRoom(req, `admin`, 'complaintStatusUpdated', {
        complaintId: complaint._id,
        status,
      });

      res.json({ message: 'Complaint status updated', complaint });
    } catch (error) {
      next(error);
    }
  },

  /* ===================== CATEGORIES ===================== */
  getCategories: async (req, res, next) => {
    try {
      const categories = await Category.find().sort({ name: 1 });
      res.json(categories);
    } catch (error) {
      next(error);
    }
  },

  getActiveCategories: async (req, res, next) => {
    try {
      const categories = await Category.find({ isActive: true }).sort({ name: 1 });
      res.json(categories);
    } catch (error) {
      next(error);
    }
  },

  addCategory: async (req, res, next) => {
    try {
      const { name, description, icon, assignedWorkerType, priorityDefault } = req.body;
      if (!name) return res.status(400).json({ message: 'Category name is required' });
      const existing = await Category.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
      if (existing) return res.status(409).json({ message: 'Category already exists' });
      const category = await Category.create({
        name,
        description,
        icon: icon || '🏷️',
        assignedWorkerType,
        priorityDefault: priorityDefault || 'Medium',
      });
      res.status(201).json({ message: 'Category added successfully', category });
    } catch (error) {
      next(error);
    }
  },

  updateCategory: async (req, res, next) => {
    try {
      const category = await Category.findById(req.params.id);
      if (!category) return res.status(404).json({ message: 'Category not found' });
      if (req.body.name) category.name = req.body.name;
      if (req.body.description !== undefined) category.description = req.body.description;
      if (req.body.icon !== undefined) category.icon = req.body.icon;
      if (req.body.assignedWorkerType !== undefined) category.assignedWorkerType = req.body.assignedWorkerType;
      if (req.body.priorityDefault !== undefined) category.priorityDefault = req.body.priorityDefault;
      if (req.body.isActive !== undefined) category.isActive = req.body.isActive;
      await category.save();
      res.json({ message: 'Category updated successfully', category });
    } catch (error) {
      next(error);
    }
  },

  deleteCategory: async (req, res, next) => {
    try {
      const category = await Category.findById(req.params.id);
      if (!category) return res.status(404).json({ message: 'Category not found' });
      category.isActive = false;
      await category.save();
      res.json({ message: 'Category disabled successfully', category });
    } catch (error) {
      next(error);
    }
  },

  /* ===================== NOTIFICATIONS (admin) ===================== */
  getAdminNotifications: async (req, res, next) => {
    try {
      const notifications = await Notification.find({ userModel: 'Admin' }).sort({
        createdAt: -1,
      });
      const unread = notifications.filter((n) => !n.isRead).length;
      res.json({ notifications, unread });
    } catch (error) {
      next(error);
    }
  },

  markAdminNotificationRead: async (req, res, next) => {
    try {
      const notification = await Notification.findByIdAndUpdate(
        req.params.id,
        { isRead: true },
        { new: true }
      );
      if (!notification) return res.status(404).json({ message: 'Notification not found' });
      res.json({ message: 'Notification marked as read', notification });
    } catch (error) {
      next(error);
    }
  },

  markAllAdminNotificationsRead: async (req, res, next) => {
    try {
      await Notification.updateMany({ userModel: 'Admin', isRead: false }, { isRead: true });
      res.json({ message: 'All notifications marked as read' });
    } catch (error) {
      next(error);
    }
  },

  deleteAdminNotification: async (req, res, next) => {
    try {
      const notification = await Notification.findByIdAndDelete(req.params.id);
      if (!notification) return res.status(404).json({ message: 'Notification not found' });
      res.json({ message: 'Notification deleted' });
    } catch (error) {
      next(error);
    }
  },

  sendNotification: async (req, res, next) => {
    try {
      const { userId, userModel, title, message, complaintId } = req.body;
      if (!userId || !userModel || !title || !message) {
        return res.status(400).json({ message: 'userId, userModel, title and message required' });
      }
      const notification = await Notification.create({
        userId,
        userModel,
        type: 'admin_message',
        title,
        message,
        complaintId,
      });
      const room = userModel === 'Worker' ? `worker_${userId}` : `user_${userId}`;
      emitToRoom(req, room, 'notificationCreated', notification);
      emitToRoom(req, `admin`, 'notificationCreated', notification);
      res.status(201).json({ message: 'Notification sent', notification });
    } catch (error) {
      next(error);
    }
  },

  /* ===================== REPORTS ===================== */
  getReports: async (req, res, next) => {
    try {
      const complaints = await Complaint.find();

      const startOfToday = new Date().setHours(0, 0, 0, 0);
      const startOfWeek = new Date().setDate(new Date().getDate() - ((new Date().getDay() + 6) % 7));
      startOfWeek; // eslint-disable-line
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

      // by month
      const byMonth = {};
      const byWeek = {};
      complaints.forEach((c) => {
        const d = new Date(c.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        byMonth[key] = (byMonth[key] || 0) + 1;
        const wk = `${d.getFullYear()}-W${Math.ceil((d.getDate()) / 7)}`;
        byWeek[wk] = (byWeek[wk] || 0) + 1;
      });
      const months = Object.keys(byMonth)
        .sort()
        .map((m) => {
          const [y, mo] = m.split('-');
          return { month: `${mo}/${y}`, count: byMonth[m] };
        });
      const weeks = Object.keys(byWeek)
        .sort()
        .map((w) => ({ week: w.split('-')[1], count: byWeek[w] }));

      // by category
      const catMap = {};
      complaints.forEach((c) => (catMap[c.category] = (catMap[c.category] || 0) + 1));
      const byCategory = Object.entries(catMap).map(([name, count]) => ({ name, count }));

      // by status
      const statusMap = {};
      complaints.forEach((c) => (statusMap[c.status] = (statusMap[c.status] || 0) + 1));
      const byStatus = Object.entries(statusMap).map(([name, count]) => ({ name, count }));

      // by priority
      const priorityMap = {};
      complaints.forEach((c) => (priorityMap[c.priority] = (priorityMap[c.priority] || 0) + 1));
      const byPriority = Object.entries(priorityMap).map(([name, count]) => ({ name, count }));

      // worker workload & performance
      const workers = await Worker.find();
      const workload = workers.map((w) => ({
        name: w.name,
        category: w.category,
        currentTasks: w.currentTaskCount,
        completed: w.completedTaskCount,
        averageRating: w.averageRating || 0,
        ratingCount: w.ratingCount || 0,
      }));

      // worker ranking by completed + rating
      const workerRanking = [...workload].sort(
        (a, b) => b.completed - a.completed || b.averageRating - a.averageRating
      );

      // workers by category
      const wCat = {};
      workers.forEach((w) => (wCat[w.category] = (wCat[w.category] || 0) + 1));
      const workersByCategory = Object.entries(wCat).map(([name, count]) => ({ name, count }));

      const completedComplaints = complaints.filter((c) => c.status === 'COMPLETED' || c.status === 'CLOSED');
      const completionRate = complaints.length
        ? Math.round((completedComplaints.length / complaints.length) * 100)
        : 0;

      // avg resolution time (completed - created), in hours
      let avgResolutionHours = 0;
      if (completedComplaints.length) {
        const total = completedComplaints.reduce((acc, c) => {
          const end = c.completedAt || c.closedAt || c.updatedAt || c.createdAt;
          return acc + (new Date(end) - new Date(c.createdAt));
        }, 0);
        avgResolutionHours = Math.round((total / completedComplaints.length) / 3600000);
      }

      // most common category
      let mostCommonCategory = null;
      if (byCategory.length) {
        mostCommonCategory = byCategory.reduce((a, b) => (b.count > a.count ? b : a));
      }

      const todayCount = complaints.filter((c) => new Date(c.createdAt).getTime() >= startOfToday).length;
      const weekCount = complaints.filter((c) => new Date(c.createdAt).getTime() >= oneWeekAgo).length;
      const monthCount = complaints.filter((c) => new Date(c.createdAt).getTime() >= startOfMonth).length;

      res.json({
        byMonth: months,
        byWeek: weeks,
        byCategory,
        byStatus,
        byPriority,
        workload,
        workerRanking,
        workersByCategory,
        completionRate,
        totalComplaints: complaints.length,
        completedComplaints: completedComplaints.length,
        pendingComplaints: complaints.filter((c) => c.status === 'PENDING').length,
        avgResolutionHours,
        mostCommonCategory,
        todayCount,
        weekCount,
        monthCount,
      });
    } catch (error) {
      next(error);
    }
  },

  getWorkerPerformance: async (req, res, next) => {
    try {
      const workers = await Worker.find();
      const tasks = await Complaint.find({});
      const per = await Promise.all(
        workers.map(async (w) => {
          const workerComplaints = tasks.filter(
            (c) => c.assignedWorker && c.assignedWorker.toString() === w._id.toString()
          );
          const completed = workerComplaints.filter((c) => c.status === 'COMPLETED' || c.status === 'CLOSED');
          let avgCompletionDays = 0;
          if (completed.length) {
            const total = completed.reduce((acc, c) => {
              const end = c.completedAt || c.closedAt || c.updatedAt;
              return acc + Math.max(0, (new Date(end) - new Date(c.createdAt)) / 86400000);
            }, 0);
            avgCompletionDays = Math.round((total / completed.length) * 10) / 10;
          }
          let onTimePct = 0;
          if (completed.length) {
            onTimePct = Math.round((w.onTimeCount / completed.length) * 100);
          }
          return {
            workerId: w._id,
            name: w.name,
            category: w.category,
            workerType: w.workerType,
            totalAssigned: workerComplaints.length,
            completed,
            rejected: w.rejectedTaskCount || 0,
            inProgress: workerComplaints.filter((c) => c.status === 'IN_PROGRESS').length,
            pending: workerComplaints.filter((c) => c.status === 'ASSIGNED').length,
            avgCompletionDays,
            averageRating: w.averageRating || 0,
            ratingCount: w.ratingCount || 0,
            onTimePct,
            availabilityStatus: w.availabilityStatus,
          };
        })
      );
      const ranked = per.sort((a, b) => b.completed - a.completed || b.averageRating - a.averageRating);
      res.json(ranked);
    } catch (error) {
      next(error);
    }
  },
};

module.exports = adminController;
