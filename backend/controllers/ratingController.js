const Rating = require('../models/Rating');
const Complaint = require('../models/Complaint');
const Worker = require('../models/Worker');
const { emitToRoom } = require('./complaintHelpers');

const ratingController = {
  addRating: async (req, res, next) => {
    try {
      const complaint = await Complaint.findOne({
        _id: req.params.id,
        userId: req.user.id,
      });
      if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

      if (!['COMPLETED', 'CLOSED'].includes(complaint.status)) {
        return res
          .status(400)
          .json({ message: 'Complaint must be completed before rating' });
      }
      if (!complaint.assignedWorker) {
        return res.status(400).json({ message: 'No worker assigned to this complaint' });
      }

      const existing = await Rating.findOne({ complaintId: complaint._id });
      if (existing) {
        return res.status(409).json({ message: 'You have already rated this complaint' });
      }

      const rating = Number(req.body.rating);
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'Rating must be between 1 and 5' });
      }

      const created = await Rating.create({
        complaintId: complaint._id,
        userId: req.user.id,
        workerId: complaint.assignedWorker,
        rating,
        feedback: req.body.feedback || '',
        onTime: req.body.onTime !== undefined ? !!req.body.onTime : true,
      });

      // Update worker stats
      const worker = await Worker.findById(complaint.assignedWorker);
      if (worker) {
        worker.ratingCount += 1;
        worker.ratingSum += rating;
        worker.averageRating = +(worker.ratingSum / worker.ratingCount).toFixed(1);
        if (created.onTime) worker.onTimeCount += 1;
        await worker.save();
      }

      emitToRoom(req, `admin`, 'workerRated', { workerId: complaint.assignedWorker, complaintId: complaint._id });
      emitToRoom(req, `worker_${complaint.assignedWorker}`, 'workerRated', {
        workerId: complaint.assignedWorker,
        complaintId: complaint._id,
      });

      res.status(201).json({
        message: 'Rating submitted. Thank you for your feedback!',
        rating: created,
        worker,
      });
    } catch (error) {
      next(error);
    }
  },

  getWorkerRating: async (req, res, next) => {
    try {
      const worker = await Worker.findById(req.params.workerId);
      if (!worker) return res.status(404).json({ message: 'Worker not found' });
      const ratings = await Rating.find({ workerId: worker._id })
        .populate('userId', 'name flat block apartment')
        .sort({ createdAt: -1 });
      res.json({
        worker: {
          id: worker._id,
          name: worker.name,
          category: worker.category,
          averageRating: worker.averageRating,
          ratingCount: worker.ratingCount,
        },
        ratings,
      });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = ratingController;
