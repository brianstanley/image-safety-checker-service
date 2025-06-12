import { Router } from 'express';
import { z } from 'zod';
import { imageService } from '../services/image.service';
import { UsageTracker } from '../services/UsageTracker';
import { ImageCheckResponse } from '../types';

const router = Router();

// Schema for image check request
const checkImageSchema = z.object({
  imageUrl: z.string({
    required_error: 'Image URL is required',
    invalid_type_error: 'Image URL must be a string'
  }).url('Invalid URL format'),
  service: z.enum(['sightengine', 'rekognition']).optional()
});

// POST /api/images/check - Check an image for explicit content
router.post('/check', async (req, res) => {
  try {
    const { imageUrl, service } = await checkImageSchema.parseAsync(req.body);
    
    // Get result from appropriate service
    const result: ImageCheckResponse = await imageService.checkImage({ imageUrl, service });

    res.json(result);
  } catch (error) {
    console.error('Error checking image:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/images/usage - Get usage statistics for both services
router.get('/usage', async (req, res) => {
  try {
    const [sightengineStats, rekognitionStats] = await Promise.all([
      UsageTracker.getServiceUsage('sightengine'),
      UsageTracker.getServiceUsage('rekognition')
    ]);

    res.json({
      success: true,
      data: {
        sightengine: sightengineStats,
        rekognition: rekognitionStats
      }
    });
  } catch (error) {
    console.error('Error getting usage stats:', error);
    res.status(500).json({
      success: false,
      error: 'Error getting usage stats'
    });
  }
});

export default router; 