import { Router } from 'express';
import { z } from 'zod';
import { imageService } from '../services/image.service';
import { UsageTracker } from '../services/UsageTracker';
import { ImageCheckResponse } from '../types';

const router = Router();

// Schema for image check request
const imageCheckSchema = z.object({
  imageUrl: z.string({
    required_error: "imageUrl is required",
    invalid_type_error: "imageUrl must be a string"
  }).url("Please provide a valid URL for the image")
});

// POST /api/images/check - Check an image for explicit content
router.post('/check', async (req, res) => {
  try {
    const { imageUrl } = await imageCheckSchema.parseAsync(req.body);
    
    // Get result from appropriate service
    const result: ImageCheckResponse = await imageService.checkImage({ imageUrl });

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
      error: 'Error checking image'
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