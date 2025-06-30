import { imageService } from '../image.service';
import { UsageTracker } from '../UsageTracker';
import axios from 'axios';
import { RekognitionClient } from '@aws-sdk/client-rekognition';
import { SERVICES } from '../../constants';
import { ImageServiceError } from '../ImageServiceError';

// Mock external dependencies
jest.mock('axios');
jest.mock('@aws-sdk/client-rekognition');
jest.mock('../UsageTracker');

describe('ImageService', () => {
  const mockImageUrl = 'https://example.com/test-image.jpg';
  const mockImageBuffer = Buffer.from('fake-image-data');

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Mock axios for image download - use a more efficient mock
    (axios as unknown as jest.Mock).mockImplementation((config) => {
      if (config.responseType === 'arraybuffer') {
        return Promise.resolve({ data: mockImageBuffer });
      }
      return Promise.resolve({ data: {} });
    });

    // Mock UsageTracker methods to resolve quickly
    (UsageTracker.canUseSightengine as jest.Mock).mockResolvedValue(true);
    (UsageTracker.canUseRekognition as jest.Mock).mockResolvedValue(true);
  });

  describe('checkImage', () => {
    it('should use Sightengine by default when available', async () => {
      // Mock Sightengine response
      const mockSightengineResponse = {
        data: {
          nudity: {
            sexual_activity: 0.1,
            sexual_display: 0.1,
            erotica: 0.1
          },
          offensive: {
            hate_symbols: 0.1
          },
          gore: {
            prob: 0.1
          },
          scam: {
            prob: 0.1
          }
        }
      };
      (axios.get as jest.Mock).mockResolvedValue(mockSightengineResponse);

      const result = await imageService.checkImage({ imageUrl: mockImageUrl });

      expect(result).toEqual({
        success: true,
        is_safe: true,
        reason: null,
        provider: 'sightengine',
        imageUrl: mockImageUrl,
        score: 0.1
      });
      expect(UsageTracker.incrementUsage).toHaveBeenCalledWith(SERVICES.SIGHTENGINE);
    });

    it('should fallback to Rekognition when Sightengine is unavailable', async () => {
      // Mock UsageTracker for this specific test
      (UsageTracker.canUseSightengine as jest.Mock).mockResolvedValue(false);

      // Mock Rekognition response
      const mockRekognitionResponse = {
        ModerationLabels: []
      };
      (RekognitionClient.prototype.send as jest.Mock).mockResolvedValue(mockRekognitionResponse);

      const result = await imageService.checkImage({ imageUrl: mockImageUrl });

      expect(result).toEqual({
        success: true,
        is_safe: true,
        reason: null,
        provider: 'rekognition',
        imageUrl: mockImageUrl,
        score: 0
      });
      expect(UsageTracker.incrementUsage).toHaveBeenCalledWith(SERVICES.REKOGNITION);
    });

    it('should throw error when all services are unavailable', async () => {
      // Mock UsageTracker for this specific test
      (UsageTracker.canUseSightengine as jest.Mock).mockResolvedValue(false);
      (UsageTracker.canUseRekognition as jest.Mock).mockResolvedValue(false);

      await expect(imageService.checkImage({ imageUrl: mockImageUrl }))
        .rejects
        .toThrow('sightengine rate limit exceeded');
    });

    it('should use specified service when provided', async () => {
      // Mock Rekognition response
      const mockRekognitionResponse = {
        ModerationLabels: []
      };
      (RekognitionClient.prototype.send as jest.Mock).mockResolvedValue(mockRekognitionResponse);

      const result = await imageService.checkImage({ 
        imageUrl: mockImageUrl,
        service: SERVICES.REKOGNITION
      });

      expect(result).toEqual({
        success: true,
        is_safe: true,
        reason: null,
        provider: 'rekognition',
        imageUrl: mockImageUrl,
        score: 0
      });
      expect(UsageTracker.incrementUsage).toHaveBeenCalledWith(SERVICES.REKOGNITION);
    });

    it('should throw ImageServiceError when image is not found with Sightengine', async () => {
      // Mock Sightengine error response
      const mockSightengineErrorResponse = {
        data: {
          error: 'invalid_url'
        }
      };
      (axios.get as jest.Mock).mockResolvedValue(mockSightengineErrorResponse);

      await expect(imageService.checkImage({ 
        imageUrl: mockImageUrl,
        service: SERVICES.SIGHTENGINE
      }))
        .rejects
        .toThrow('Image not found or inaccessible: https://example.com/test-image.jpg');
    });

    it('should throw ImageServiceError when image download fails', async () => {
      // Mock axios error for image download
      const axiosError = {
        isAxiosError: true,
        response: { status: 404 },
        code: 'ENOTFOUND'
      };
      (axios as unknown as jest.Mock).mockImplementation((config) => {
        if (config.responseType === 'arraybuffer') {
          return Promise.reject(axiosError);
        }
        return Promise.resolve({ data: {} });
      });

      await expect(imageService.checkImage({ 
        imageUrl: mockImageUrl,
        service: SERVICES.REKOGNITION
      }))
        .rejects
        .toThrow('Image not found or inaccessible: https://example.com/test-image.jpg');
    });
  });

  describe('content detection', () => {
    it('should detect unsafe content from Sightengine', async () => {
      // Mock Sightengine response with unsafe content
      const mockSightengineResponse = {
        data: {
          nudity: {
            sexual_activity: 0.8,
            sexual_display: 0.1,
            erotica: 0.1
          },
          offensive: {
            hate_symbols: 0.1
          },
          gore: {
            prob: 0.1
          },
          scam: {
            prob: 0.1
          }
        }
      };
      (axios.get as jest.Mock).mockResolvedValue(mockSightengineResponse);

      const result = await imageService.checkImage({ imageUrl: mockImageUrl });

      expect(result).toEqual({
        success: true,
        is_safe: false,
        reason: 'nudity',
        provider: 'sightengine',
        imageUrl: mockImageUrl,
        score: 0.8
      });
    });

    it('should detect unsafe content from Rekognition', async () => {
      // Mock Rekognition response with unsafe content
      const mockRekognitionResponse = {
        ModerationLabels: [
          {
            Name: 'Explicit Nudity',
            Confidence: 90,
            ParentName: 'Explicit Content',
            TaxonomyLevel: 1
          }
        ]
      };
      (RekognitionClient.prototype.send as jest.Mock).mockResolvedValue(mockRekognitionResponse);

      const result = await imageService.checkImage({ 
        imageUrl: mockImageUrl,
        service: SERVICES.REKOGNITION
      });

      expect(result).toEqual({
        success: true,
        is_safe: false,
        reason: 'nudity',
        provider: 'rekognition',
        imageUrl: mockImageUrl,
        score: 0.9
      });
    });
  });
}); 