const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const { initDatabase } = require('./config/database');

const app = express();

const allowedOrigins = [
  'http://localhost:3000',
  ...(process.env.FRONTEND_URL || '').split(',').map((origin) => origin.trim()).filter(Boolean)
];

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  return /^https:\/\/[a-z0-9-]+(?:-[a-z0-9]+)?-waledhanashri11s-projects\.vercel\.app$/i.test(origin)
    || /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);
};

// CORS must be registered before JSON parsing and API routes.
const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const flatRoutes = require('./routes/flats');
const maintenanceRoutes = require('./routes/maintenance');
const complaintRoutes = require('./routes/complaints');
const noticeRoutes = require('./routes/notices');
const residentRoutes = require('./routes/resident');
const residentMgmtRoutes = require('./routes/residents');
const staffRoutes = require('./routes/staff');
const settingsRoutes = require('./routes/settings');
const notificationRoutes = require('./routes/notifications');
const nocRoutes = require('./routes/noc');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/flats', flatRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/resident', residentRoutes);
app.use('/api/residents', residentMgmtRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/noc', nocRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Society Management System API' });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await initDatabase();
    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Stop the existing backend process or run this server on another port.`);
        process.exit(1);
      }

      console.error('Server error:', error);
      process.exit(1);
    });
  } catch (error) {
    console.error('Error starting server:', error);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
