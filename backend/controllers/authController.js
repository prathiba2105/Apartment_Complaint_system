const User = require('../models/User');
const Worker = require('../models/Worker');
const Category = require('../models/Category');
const LoginActivity = require('../models/LoginActivity');
const jwt = require('jsonwebtoken');

const getClientIp = (req) =>
  (req.headers && (req.headers['x-forwarded-for'] || req.headers['x-real-ip'])) ||
  (req.socket && req.socket.remoteAddress) ||
  '';

const getClientUserAgent = (req) =>
  (req.headers && req.headers['user-agent']) || '';

const recordLoginActivity = async ({ userId, email, role, success, req }) => {
  try {
    await LoginActivity.create({
      userId,
      email,
      role,
      success,
      ip: getClientIp(req),
      userAgent: getClientUserAgent(req),
    });
  } catch (e) {
    // Login activity tracking must never break the login flow.
  }
};

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

const getCategoryNames = async () => {
  try {
    const cats = await Category.find({ isActive: true }).select('name');
    if (cats.length > 0) return cats.map((c) => c.name);
  } catch (e) {}
  return [
    'Plumbing',
    'Electrical',
    'Cleaning',
    'Security',
    'Carpentry',
    'Painting',
    'Lift Maintenance',
    'Water Maintenance',
    'Other',
  ];
};

const registers = {
  registerUser: async (req, res, next) => {
    try {
      const { name, email, password, confirmPassword, phone, apartment, block, floor, flat } =
        req.body;
      console.log('Register request received:', { name, email, apartment, block, floor, flat });
      console.log('REGISTER REQUEST RECEIVED');
      if (!name || !email || !password) {
        return res.status(400).json({ message: 'Please provide name, email and password' });
      }
      if (password !== confirmPassword) {
        return res.status(400).json({ message: 'Passwords do not match' });
      }
      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(409).json({ message: 'Email already registered' });
      }
      const user = await User.create({
        name,
        email,
        password,
        phone,
        apartment,
        block,
        floor,
        flat,
      });
      console.log('User saved successfully:', user._id);
      console.log('NEW USER SAVED ID:', user._id);
      console.log('DATABASE USED:', User.db.name);
      console.log('COLLECTION USED:', User.collection.name);
      const token = generateToken(user._id, 'USER');
      res.status(201).json({
        message: 'User registered successfully',
        token,
        role: 'USER',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          apartment: user.apartment,
          block: user.block,
          floor: user.floor,
          flat: user.flat,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  registerWorker: async (req, res, next) => {
    try {
      const { name, email, password, confirmPassword, phone, category, experience, address } =
        req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ message: 'Please provide name, email and password' });
      }
      if (password !== confirmPassword) {
        return res.status(400).json({ message: 'Passwords do not match' });
      }
      if (!category) {
        return res.status(400).json({ message: 'Please select a category' });
      }
      const allowed = await getCategoryNames();
      if (!allowed.includes(category)) {
        return res.status(400).json({ message: 'Invalid category' });
      }
      const existing = await Worker.findOne({ email });
      if (existing) {
        return res.status(409).json({ message: 'Email already registered' });
      }
      const worker = await Worker.create({
        name,
        email,
        password,
        phone,
        category,
        experience: Number(experience) || 0,
        address,
      });
      const token = generateToken(worker._id, 'WORKER');
      res.status(201).json({
        message: 'Worker registered successfully',
        token,
        role: 'WORKER',
        worker: {
          id: worker._id,
          name: worker.name,
          email: worker.email,
          category: worker.category,
          experience: worker.experience,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  loginUser: async (req, res, next) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: 'Please provide email and password' });
      }
      const user = await User.findOne({ email }).select('+password');
      console.log('Login request received:', { email });
      if (!user || !(await user.matchPassword(password))) {
        console.log('Login failed for:', email, '-> user found:', !!user);
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      console.log('User login successful:', user._id);
      if (!user.isActive) {
        return res.status(403).json({ message: 'Your account has been disabled' });
      }
      const token = generateToken(user._id, 'USER');
      recordLoginActivity({ userId: user._id, email: user.email, role: 'USER', success: true, req });
      res.json({
        message: 'Login successful',
        token,
        role: 'USER',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          flat: user.flat,
          apartment: user.apartment,
          block: user.block,
          floor: user.floor,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  loginWorker: async (req, res, next) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: 'Please provide email and password' });
      }
      const worker = await Worker.findOne({ email }).select('+password');
      if (!worker || !(await worker.matchPassword(password))) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      if (!worker.isActive) {
        return res.status(403).json({ message: 'Your account has been disabled' });
      }
      const token = generateToken(worker._id, 'WORKER');
      recordLoginActivity({ userId: worker._id, email: worker.email, role: 'WORKER', success: true, req });
      res.json({
        message: 'Login successful',
        token,
        role: 'WORKER',
        worker: {
          id: worker._id,
          name: worker.name,
          email: worker.email,
          category: worker.category,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  loginAdmin: async (req, res, next) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: 'Please provide email and password' });
      }
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@apartmentcare.com';
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
      if (email.toLowerCase() !== adminEmail.toLowerCase() || password !== adminPassword) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      const token = generateToken('admin', 'ADMIN');
      recordLoginActivity({ userId: 'admin', email: adminEmail, role: 'ADMIN', success: true, req });
      res.json({
        message: 'Admin login successful',
        token,
        role: 'ADMIN',
        admin: { name: 'Admin', role: 'Apartment Manager', email: adminEmail },
      });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = registers;
