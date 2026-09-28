const jwt = require('jsonwebtoken');

const setupSockets = (io) => {
  io.on('connection', (socket) => {
    try {
      const token = socket.handshake.auth.token;
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.data = { id: decoded.id, role: decoded.role };
        if (decoded.role === 'ADMIN') {
          socket.join('admin');
        } else if (decoded.role === 'WORKER') {
          socket.join(`worker_${decoded.id}`);
        } else if (decoded.role === 'USER') {
          socket.join(`user_${decoded.id}`);
        }
      }
    } catch (e) {
      // invalid token - leave unauthenticated
    }

    socket.on('disconnect', () => {});
  });
};

module.exports = setupSockets;
