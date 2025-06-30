import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import v1Routes from './routes/v1';
import { errorHandler } from './middleware/error.middleware';
import { validateApiKey } from './middleware/auth.middleware';

// Load environment variables
dotenv.config();

// Debug log environment variables
console.log('Environment variables loaded:', {
  SIGHTENGINE_API_KEY: process.env.SIGHTENGINE_API_KEY ? 'Set' : 'Not set',
  SIGHTENGINE_API_SECRET: process.env.SIGHTENGINE_API_SECRET ? 'Set' : 'Not set',
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ? 'Set' : 'Not set',
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ? 'Set' : 'Not set',
  AWS_REGION: process.env.AWS_REGION ? 'Set' : 'Not set'
});

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(validateApiKey);

// API Versioning
app.use('/api/v1', v1Routes);

// Legacy routes (for backward compatibility) - redirect to v1
app.use('/api/images', (req, res, next) => {
  // Redirect /api/images/* to /api/v1/images/*
  const newPath = req.path.replace('/api/images', '/api/v1/images');
  res.redirect(308, newPath);
});

app.use('/api/admin', (req, res, next) => {
  // Redirect /api/admin/* to /api/v1/admin/*
  const newPath = req.path.replace('/api/admin', '/api/v1/admin');
  res.redirect(308, newPath);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// API info endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Safe Checker API',
    version: '1.0.0',
    endpoints: {
      v1: '/api/v1',
      health: '/health'
    },
    documentation: 'API documentation coming soon'
  });
});

// Error handling
app.use(errorHandler);

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/safe-checker')
  .then(() => {
    console.log('Connected to MongoDB');
    // Start the server
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
      console.log(`API v1 available at: http://localhost:${port}/api/v1`);
    });
  })
  .catch((error) => {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }); 