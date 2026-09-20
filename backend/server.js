require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('./middleware/authMiddleware');

// Import routes
const authRoutes = require('./routes/auth');
const familyRoutes = require('./routes/family');
const documentRoutes = require('./routes/documents');
const adminRoutes = require('./routes/admin');
const path = require('path');

const prisma = new PrismaClient();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- PUBLIC ROUTES ---

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    console.error('Database connection failed', error);
    res.status(500).json({ status: 'error', database: 'disconnected', details: error.message });
  }
});

// Auth routes (signup, login)
app.use('/api/auth', authRoutes);

// --- PROTECTED ROUTES ---

// Profile route (needs auth)
app.get('/api/auth/me', authMiddleware, async (req, res, next) => {
  // Forwarded to auth route handler
  const authRouter = require('./routes/auth');
  // Actually handled inside the auth routes file
});

// Family routes (all protected inside the router)
app.use('/api/family', familyRoutes);

// Document routes (all protected inside the router)
app.use('/api/documents', documentRoutes);

// Officer routes (protected + role-based inside the router)
const officerRoutes = require('./routes/officer');
app.use('/api/officer', officerRoutes);

// Admin routes (protected + role-based inside the router)
app.use('/api/admin', authMiddleware, adminRoutes);

// --- SERVER START ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Family ID Backend Server running on http://localhost:${PORT}`);
  console.log(`📋 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Auth:         POST http://localhost:${PORT}/api/auth/signup`);
  console.log(`🔐 Auth:         POST http://localhost:${PORT}/api/auth/login`);
  console.log(`👨‍👩‍👧‍👦 Family:       GET  http://localhost:${PORT}/api/family\n`);
});
