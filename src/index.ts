import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import imageRoutes from './routes/image.routes';
import { adminRoutes } from './routes/admin.routes';
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

// Routes
app.use('/api/images', imageRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
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
    });
  })
  .catch((error) => {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }); 