const Complaint = require('../models/Complaint');
const ComplaintTimeline = require('../models/ComplaintTimeline');
const Notification = require('../models/Notification');

const generateComplaintId = async () => {
  const year = new Date().getFullYear();
  const last = await Complaint.findOne({ complaintId: new RegExp(`^CMP-${year}-`) }).sort({
    complaintId: -1,
  });
  let next = 1;
  if (last) {
    const parts = last.complaintId.split('-');
    next = parseInt(parts[parts.length - 1], 10) + 1;
  }
  return `CMP-${year}-${String(next).padStart(4, '0')}`;
};

const createComplaint = async (req, res, next) => {
  try {
    const {
      title,
      description,
      category,
      apartment,
      block,
      floor,
      flat,
      priority,
      preferredDate,
      preferredTime,
      additionalNotes,
      image,
      images,
      attachment,
      attachments,
    } = req.body;

    if (!title || !category) {
      return res.status(400).json({ message: 'Title and category are required' });
    }
    console.log('Complaint request received:', { title, category, priority, userId: req.user.id });

    const complaintId = await generateComplaintId();

    // Normalize S3 attachment metadata (uploaded via POST /api/upload).
    const attachmentItems = [];
    if (attachment && attachment.s3Key) {
      attachmentItems.push({
        fileName: attachment.fileName,
        fileType: attachment.fileType,
        fileSize: attachment.fileSize,
        s3Key: attachment.s3Key,
      });
    }
    if (Array.isArray(attachments)) {
      for (const a of attachments) {
        if (a && a.s3Key) {
          attachmentItems.push({
            fileName: a.fileName,
            fileType: a.fileType,
            fileSize: a.fileSize,
            s3Key: a.s3Key,
          });
        }
      }
    }

    const complaint = await Complaint.create({
      complaintId,
      userId: req.user.id,
      title,
      description,
      category,
      apartment: apartment || undefined,
      block: block || undefined,
      floor: floor || undefined,
      flat: flat || undefined,
      priority: priority || 'Medium',
      preferredDate: preferredDate || undefined,
      preferredTime: preferredTime || undefined,
      additionalNotes: additionalNotes || undefined,
      image: image || undefined,
      images: Array.isArray(images) ? images.filter(Boolean) : image ? [image] : undefined,
      attachments: attachmentItems.length ? attachmentItems : undefined,
      status: 'PENDING',
    });
    console.log('Complaint saved successfully:', complaint._id, complaintId);

    await ComplaintTimeline.create({
      complaintId: complaint._id,
      action: 'Complaint Created',
      performedBy: req.user.name || 'User',
      role: 'user',
      description: `Complaint "${title}" was created in category ${category}`,
    });

    await Notification.create({
      userId: req.user.id,
      userModel: 'User',
      type: 'complaint_created',
      title: 'Complaint Created',
      message: `Your complaint "${title}" (#${complaintId}) has been created successfully.`,
      complaintId: complaint._id,
    });

    // Notify admin(s) about a new / emergency complaint
    const isEmergency = priority === 'Emergency';
    await Notification.create({
      userId: '000000000000000000000000', // fixed admin identifier
      userModel: 'Admin',
      type: isEmergency ? 'emergency_complaint' : 'new_complaint',
      title: isEmergency ? '🚨 Emergency Complaint' : 'New Complaint',
      message: `${isEmergency ? 'EMERGENCY - ' : ''}New complaint "${title}" (#${complaintId}) from ${req.user.name || 'a resident'} (${category}, ${priority} priority).`,
      complaintId: complaint._id,
    });
    if (req.app.get('io')) {
      req.app.get('io').to('admin').emit('newComplaint', {
        complaintId: complaint._id,
        complaintIdLabel: complaintId,
        title,
        category,
        priority,
        emergency: isEmergency,
      });
    }

    if (req.app.get('io')) {
      req.app.get('io').to(`user_${req.user.id}`).emit('complaintCreated', {
        complaint: {
          id: complaint._id,
          complaintId: complaint.complaintId,
          title,
          category,
          priority,
          status: 'PENDING',
        },
      });
    }

    res.status(201).json({
      message: 'Complaint submitted successfully',
      complaint,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createComplaint };
