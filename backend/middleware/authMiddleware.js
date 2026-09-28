const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Worker = require('../models/Worker');

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { id, role } = decoded;
    if (role === 'ADMIN') {
      // Admin is a static role authenticated against environment credentials.
      const adminEmail = (process.env.ADMIN_EMAIL || 'admin@apartmentcare.com').toLowerCase();
      if (id !== 'admin') {
        return res.status(401).json({ message: 'Not authorized, invalid admin' });
      }
      req.user = { id: 'admin', role: 'ADMIN', name: 'Admin' };
      return next();
    }
    let found = null;
    if (role === 'USER') {
      found = await User.findById(id);
    } else if (role === 'WORKER') {
      found = await Worker.findById(id);
    }
    if (!found) {
      return res.status(401).json({ message: 'Not authorized, user not found' });
    }
    req.user = { id: found._id, role, name: found.name };
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

module.exports = { protect };
