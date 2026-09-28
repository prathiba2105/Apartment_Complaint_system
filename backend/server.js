const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');

dotenv.config({ path: path.join(__dirname, '.env') });

const connectDB = require('./config/db');
const setupSockets = require('./sockets/socket');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const mongoose = require('mongoose');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const workerRoutes = require('./routes/workerRoutes');
const adminRoutes = require('./routes/adminRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const messageRoutes = require('./routes/messageRoutes');
const ratingRoutes = require('./routes/ratingRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  },
});

app.set('io', io);

connectDB();

app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => {
  res.json({ message: 'Apartment Care API is running', time: new Date().toISOString() });
});

// Development-only database verification endpoint (no secrets exposed)
app.get('/api/debug/database-info', (req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.json({
    connected,
    host: connected ? mongoose.connection.host : null,
    database: connected ? mongoose.connection.name : null,
    mongoUriLoaded: Boolean(process.env.MONGO_URI),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/worker', workerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', complaintRoutes);
app.use('/api', messageRoutes);
app.use('/api', ratingRoutes);
app.use('/api', uploadRoutes);

// Serve frontend statically
const frontendDir = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendDir));

app.get('/', (req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});

app.use(notFound);
app.use(errorHandler);

setupSockets(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`MONGO URI loaded: ${process.env.MONGO_URI ? 'Yes' : 'No'}`);
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} on port ${PORT}`);
});

