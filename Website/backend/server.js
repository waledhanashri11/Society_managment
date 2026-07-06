const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { initDatabase } = require('./config/database');

const app = express();

app.use(cors());
app.use(express.json());

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const flatRoutes = require('./routes/flats');
const maintenanceRoutes = require('./routes/maintenance');
const complaintRoutes = require('./routes/complaints');
const noticeRoutes = require('./routes/notices');
const residentRoutes = require('./routes/resident');
const staffRoutes = require('./routes/staff');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/flats', flatRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/resident', residentRoutes);
app.use('/api/staff', staffRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Society Management System API' });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Error starting server:', error);
  }
};

startServer();
