import { Router } from 'express';
import { z } from 'zod';
import { imageService } from '../../services/image.service';
import { UsageTracker } from '../../services/UsageTracker';
import { ImageCheckResponse } from '../../types';
import { ImageServiceError } from '../../services/ImageServiceError';

const router = Router();

// Schema for image check request
const checkImageSchema = z.object({
  imageUrl: z.string({
    required_error: 'Image URL is required',
    invalid_type_error: 'Image URL must be a string'
  }).url('Invalid URL format'),
  service: z.enum(['sightengine', 'rekognition']).optional()
});

// POST /api/v1/images/check - Check an image for explicit content
router.post('/check', async (req, res) => {
  try {
    const { imageUrl, service } = await checkImageSchema.parseAsync(req.body);
    
    // Get result from appropriate service
    const result: ImageCheckResponse = await imageService.checkImage({ imageUrl, service });

    res.json(result);
  } catch (error) {
    console.error('Error checking image:', error);
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        errorType: 'validation',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }

    // Handle our custom ImageServiceError
    if (error instanceof ImageServiceError) {
      const errorResponse = error.toDetailedResponse();
      return res.status(error.statusCode).json(errorResponse);
    }

    // Handle unknown errors
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      errorType: 'internal'
    });
  }
});

// GET /api/v1/images/usage - Get usage statistics for both services
router.get('/usage', async (req, res) => {
  try {
    const [sightengineStats, rekognitionStats] = await Promise.all([
      UsageTracker.getServiceUsage('sightengine'),
      UsageTracker.getServiceUsage('rekognition')
    ]);

    res.json({
      success: true,
      data: {
        sightengine: {
          ...sightengineStats,
          limits: {
            daily: 250, // Effective daily limit (500 operations ÷ 2 models)
            monthly: 1000 // Effective monthly limit (2000 operations ÷ 2 models)
          },
          note: "Each API call uses 2 models (nudity-2.1, gore-2.0), counting as 2 operations in SightEngine"
        },
        rekognition: {
          ...rekognitionStats,
          limits: {
            daily: 1000,
            monthly: 4000
          }
        }
      }
    });
  } catch (error) {
    console.error('Error getting usage stats:', error);
    res.status(500).json({
      success: false,
      error: 'Error getting usage stats',
      errorType: 'internal'
    });
  }
});

export default router; 