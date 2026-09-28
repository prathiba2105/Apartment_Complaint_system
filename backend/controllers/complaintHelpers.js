/* Shared helpers for worker & admin assignment / status logic */
const Complaint = require('../models/Complaint');
const Worker = require('../models/Worker');
const Notification = require('../models/Notification');
const ComplaintTimeline = require('../models/ComplaintTimeline');

const updateWorkerAvailability = async (workerId) => {
  const worker = await Worker.findById(workerId);
  if (!worker) return;
  if (worker.availabilityStatus === 'OFFLINE') return;
  if (worker.currentTaskCount > 0) {
    worker.availabilityStatus = 'BUSY';
  } else {
    worker.availabilityStatus = 'AVAILABLE';
    if (worker.workStatus === 'COMPLETED' || worker.workStatus === 'IDLE') {
      worker.workStatus = 'IDLE';
    }
  }
  await worker.save();
};

const emitToRoom = (req, room, event, data) => {
  const io = req.app.get('io');
  if (io) {
    io.to(room).emit(event, data);
  }
};

module.exports = { updateWorkerAvailability, emitToRoom, Complaint, Worker, Notification, ComplaintTimeline };
