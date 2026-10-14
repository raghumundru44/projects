require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initializeDatabase } = require('./database/db');
const { seedDatabase } = require('./database/seed');

const authRoutes = require('./routes/auth');
const complaintRoutes = require('./routes/complaints');
const officerRoutes = require('./routes/officer');
const adminRoutes = require('./routes/admin');
const verificationRoutes = require('./routes/verification');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/officer', officerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/verification', verificationRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'PublicFix AI Backend' });
});
  // Serve frontend static files in production
  if (process.env.NODE_ENV === 'production') {
    const clientBuildPath = path.join(__dirname, '..', 'frontend', 'dist');
    app.use(express.static(clientBuildPath));
    // SPA fallback for React Router
    app.get('*', (req, res) => {
      res.sendFile(path.join(clientBuildPath, 'index.html'));
    });
  }

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ error: 'Unexpected file field.' });
  }
  res.status(500).json({ error: 'Internal server error.' });
});

// Start server after DB is initialized
async function startServer() {
  let port = PORT;
  const maxAttempts = 5;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      await initializeDatabase();
      await seedDatabase();
      await new Promise((resolve, reject) => {
        const server = app.listen(port, () => {
          console.log(`\n✅ PublicFix AI Backend running on http://localhost:${port}`);
          console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
          console.log(`🔑 Gemini API: ${process.env.GEMINI_API_KEY ? 'Configured' : 'NOT configured (add to .env)'}`);
          resolve();
        });
        server.on('error', err => {
          if (err.code === 'EADDRINUSE') {
            console.warn(`Port ${port} in use, trying next port...`);
            port++;
            reject(err);
          } else {
            reject(err);
          }
        });
      });
      break; // started successfully
    } catch (err) {
      if (attempt === maxAttempts - 1) {
        console.error('Failed to start server after multiple attempts:', err);
        process.exit(1);
      }
    }
  }
}


startServer();

module.exports = app;
