import request from 'supertest';
import express from 'express';
import v1Routes from '../v1';
import { validateApiKey } from '../../middleware/auth.middleware';
import { imageService } from '../../services/image.service';
import { UsageTracker } from '../../services/UsageTracker';

// Mock the services
jest.mock('../../services/image.service');
jest.mock('../../services/UsageTracker');

// Mock console.error to keep test output clean
const originalConsoleError = console.error;
console.error = jest.fn();

describe('Image Routes v1', () => {
  let app: express.Application;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/api/v1', validateApiKey, v1Routes);

    // Mock successful responses
    (imageService.checkImage as jest.Mock).mockResolvedValue({
      success: true,
      is_safe: true,
      reason: null,
      provider: 'sightengine',
      imageUrl: 'https://example.com/image.jpg',
      score: 0.1
    });

    (UsageTracker.getServiceUsage as jest.Mock).mockResolvedValue({
      daily: { count: 0, limit: 1000 },
      monthly: { count: 0, limit: 10000 }
    });
  });

  afterAll(() => {
    // Restore console.error
    console.error = originalConsoleError;
  });

  describe('POST /api/v1/images/check', () => {
    it('should return 401 without API key', async () => {
      const response = await request(app)
        .post('/api/v1/images/check')
        .send({ imageUrl: 'https://example.com/image.jpg' });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        error: 'Unauthorized'
      });
    });

    it('should return 400 with invalid image URL', async () => {
      const response = await request(app)
        .post('/api/v1/images/check')
        .set('x-api-key', 'test-key-1')
        .send({ imageUrl: 'invalid-url' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Validation error');
    });

    it('should return 400 without image URL', async () => {
      const response = await request(app)
        .post('/api/v1/images/check')
        .set('x-api-key', 'test-key-1')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Validation error');
    });

    it('should accept valid request with API key', async () => {
      const mockResponse = {
        success: true,
        is_safe: true,
        reason: null,
        provider: 'sightengine',
        imageUrl: 'https://example.com/image.jpg',
        score: 0.1
      };

      (imageService.checkImage as jest.Mock).mockResolvedValue(mockResponse);

      const response = await request(app)
        .post('/api/v1/images/check')
        .set('x-api-key', 'test-key-1')
        .send({ imageUrl: 'https://example.com/image.jpg' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResponse);
      expect(imageService.checkImage).toHaveBeenCalledWith({
        imageUrl: 'https://example.com/image.jpg'
      });
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      (imageService.checkImage as jest.Mock).mockRejectedValue(error);

      const response = await request(app)
        .post('/api/v1/images/check')
        .set('x-api-key', 'test-key-1')
        .send({ imageUrl: 'https://example.com/image.jpg' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error'
      });
      expect(console.error).toHaveBeenCalledWith('Error checking image:', error);
    });
  });

  describe('GET /api/v1/images/usage', () => {
    it('should return 401 without API key', async () => {
      const response = await request(app)
        .get('/api/v1/images/usage');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        error: 'Unauthorized'
      });
    });

    it('should return usage stats with valid API key', async () => {
      const mockStats = {
        sightengine: {
          daily: { count: 0, limit: 1000 },
          monthly: { count: 0, limit: 10000 }
        },
        rekognition: {
          daily: { count: 0, limit: 1000 },
          monthly: { count: 0, limit: 10000 }
        }
      };

      (UsageTracker.getServiceUsage as jest.Mock)
        .mockResolvedValueOnce(mockStats.sightengine)
        .mockResolvedValueOnce(mockStats.rekognition);

      const response = await request(app)
        .get('/api/v1/images/usage')
        .set('x-api-key', 'test-key-1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: mockStats
      });
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      (UsageTracker.getServiceUsage as jest.Mock).mockRejectedValue(error);

      const response = await request(app)
        .get('/api/v1/images/usage')
        .set('x-api-key', 'test-key-1');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'Error getting usage stats'
      });
      expect(console.error).toHaveBeenCalledWith('Error getting usage stats:', error);
    });
  });
});