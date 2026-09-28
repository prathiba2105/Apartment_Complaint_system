const Settings = require('../models/Settings');

const DEFAULT = {
  key: 'global',
  adminProfile: { name: 'Admin', email: 'admin@apartmentcare.com', phone: '' },
  notification: {
    newComplaint: true,
    emergencyAlert: true,
    workerReject: true,
    overdue: true,
  },
  complaint: {
    defaultPriority: 'Medium',
    autoAssign: false,
    allowMultipleImages: true,
  },
  worker: { strictAvailability: true },
  app: { name: 'Apartment Care', supportEmail: '', supportPhone: '' },
};

const getSettings = async () => {
  let settings = await Settings.findOne({ key: 'global' });
  if (!settings) {
    settings = await Settings.create(DEFAULT);
  }
  return settings;
};

const settingsController = {
  get: async (req, res, next) => {
    try {
      const settings = await getSettings();
      res.json(settings);
    } catch (error) {
      next(error);
    }
  },

  update: async (req, res, next) => {
    try {
      let settings = await getSettings();
      const { adminProfile, notification, complaint, worker, app } = req.body;
      if (adminProfile) {
        if (adminProfile.name) settings.adminProfile.name = adminProfile.name;
        if (adminProfile.email) settings.adminProfile.email = adminProfile.email;
        if (adminProfile.phone !== undefined) settings.adminProfile.phone = adminProfile.phone;
      }
      if (notification) {
        Object.keys(notification).forEach((k) => {
          if (settings.notification[k] !== undefined) settings.notification[k] = notification[k];
        });
      }
      if (complaint) {
        Object.keys(complaint).forEach((k) => {
          if (settings.complaint[k] !== undefined) settings.complaint[k] = complaint[k];
        });
      }
      if (worker) {
        Object.keys(worker).forEach((k) => {
          if (settings.worker[k] !== undefined) settings.worker[k] = worker[k];
        });
      }
      if (app) {
        Object.keys(app).forEach((k) => {
          if (settings.app[k] !== undefined) settings.app[k] = app[k];
        });
      }
      await settings.save();
      res.json({ message: 'Settings updated successfully', settings });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = settingsController;
