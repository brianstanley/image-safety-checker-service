import { UsageModel } from '../models/usage.model';
import { ImageCheckRequest, ImageCheckResponse, ServiceConfig } from '../types';
import axios from 'axios';
import { RekognitionClient, DetectModerationLabelsCommand } from '@aws-sdk/client-rekognition';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { UsageTracker } from './UsageTracker';
import { SERVICES, ServiceType } from '../constants';
import { ImageServiceError } from './ImageServiceError';

class ImageService {
  // Configurable thresholds
  private static readonly SIGHTENGINE_THRESHOLD = 0.7; // 70%
  private static readonly REKOGNITION_THRESHOLD = 80; // 80%

  private services: ServiceConfig[] = [
    {
      name: SERVICES.SIGHTENGINE,
      limit: 500,
      apiKey: process.env.SIGHTENGINE_API_KEY || '',
      apiSecret: process.env.SIGHTENGINE_API_SECRET
    },
    {
      name: SERVICES.REKOGNITION,
      limit: 4000,
      apiKey: process.env.AWS_ACCESS_KEY_ID || '',
      apiSecret: process.env.AWS_SECRET_ACCESS_KEY || '',
      region: process.env.AWS_REGION || 'us-east-1'
    }
  ];

  private async getCurrentMonth(): Promise<string> {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  private async getAvailableService(): Promise<ServiceConfig | null> {
    const currentMonth = await this.getCurrentMonth();

    for (const service of this.services) {
      const usage = await UsageModel.findOne({
        serviceName: service.name,
        month: currentMonth
      });

      if (!usage) {
        // Create new usage record if it doesn't exist
        await UsageModel.create({
          serviceName: service.name,
          month: currentMonth,
          requestsUsed: 0,
          limit: service.limit
        });
        return service;
      }

      if (usage.requestsUsed < usage.limit) {
        return service;
      }
    }

    return null;
  }

  private async incrementUsage(serviceName: string): Promise<void> {
    const currentMonth = await this.getCurrentMonth();

    await UsageModel.findOneAndUpdate(
      { serviceName, month: currentMonth },
      { $inc: { requestsUsed: 1 } },
      { upsert: true }
    );
  }

  // Normalize Sightengine response to unified contract
  private normalizeSightengineResponse(response: any, imageUrl: string) {
    const nudity = response.nudity || {};
    const offensive = response.offensive || {};
    const gore = response.gore || {};
    const scam = response.scam || {};

    // Check for explicit content
    const hasExplicitNudity =
      (nudity.sexual_activity ?? 0) > ImageService.SIGHTENGINE_THRESHOLD ||
      (nudity.sexual_display ?? 0) > ImageService.SIGHTENGINE_THRESHOLD ||
      (nudity.erotica ?? 0) > ImageService.SIGHTENGINE_THRESHOLD;

    // Check for suggestive content, but ignore if it's just swimwear/bikini
    const hasSuggestiveContent =
      (nudity.very_suggestive ?? 0) > 0.6 ||
      (nudity.suggestive ?? 0) > 0.6 ||
      (nudity.mildly_suggestive ?? 0) > 0.6;

    // Check if the suggestive content is just swimwear/bikini
    const isJustSwimwear =
      (nudity.suggestive_classes?.bikini ?? 0) > 0.5 ||
      (nudity.suggestive_classes?.swimwear_one_piece ?? 0) > 0.5 ||
      (nudity.suggestive_classes?.swimwear_male ?? 0) > 0.5;

    const hasViolence = Object.entries(offensive).some(([key, value]) =>
      typeof value === 'number' &&
      value > ImageService.SIGHTENGINE_THRESHOLD &&
      !key.includes('suggestive')
    );

    const hasGore = (gore.prob ?? 0) > ImageService.SIGHTENGINE_THRESHOLD;
    const hasHate = (offensive.hate_symbols ?? 0) > ImageService.SIGHTENGINE_THRESHOLD;
    const hasOther = (scam.prob ?? 0) > ImageService.SIGHTENGINE_THRESHOLD;

    // Consider it safe if it's just swimwear/bikini and has no explicit content
    const is_safe = !(hasExplicitNudity || (hasSuggestiveContent && !isJustSwimwear) || hasViolence || hasGore || hasHate || hasOther);

    // Calculate the highest score for unsafe content
    const scores = [
      nudity.sexual_activity ?? 0,
      nudity.sexual_display ?? 0,
      nudity.erotica ?? 0,
      nudity.very_suggestive ?? 0,
      nudity.suggestive ?? 0,
      nudity.mildly_suggestive ?? 0,
      ...Object.values(offensive).filter(v => typeof v === 'number') as number[],
      gore.prob ?? 0,
      scam.prob ?? 0
    ];
    const score = Math.max(...scores);

    // Determine the reason if not safe
    let reason = null;
    if (!is_safe) {
      if (hasExplicitNudity) reason = 'nudity';
      else if (hasSuggestiveContent && !isJustSwimwear) reason = 'suggestive';
      else if (hasViolence) reason = 'violence';
      else if (hasGore) reason = 'gore';
      else if (hasHate) reason = 'hate';
      else if (hasOther) reason = 'other';
    }

    return {
      success: true,
      is_safe,
      reason,
      provider: 'sightengine',
      imageUrl,
      score
    };
  }

  private async checkWithSightEngine(imageUrl: string): Promise<any> {
    const apiKey = process.env.SIGHTENGINE_API_KEY;
    const apiSecret = process.env.SIGHTENGINE_API_SECRET;

    if (!apiKey || !apiSecret) {
      throw ImageServiceError.authenticationError('sightengine');
    }

    try {
      const params = {
        url: imageUrl,
        models: 'nudity-2.1,offensive-2.0,scam,gore-2.0',
        api_user: apiKey,
        api_secret: apiSecret
      };

      const response = await axios.get('https://api.sightengine.com/1.0/check.json', { params });
      const data = response.data;

      // Check for Sightengine-specific errors
      if (data.error) {
        if (data.error === 'invalid_url') {
          throw ImageServiceError.imageNotFound(imageUrl, 'sightengine');
        } else if (data.error === 'invalid_credentials') {
          throw ImageServiceError.authenticationError('sightengine');
        } else if (data.error === 'rate_limit') {
          throw ImageServiceError.rateLimitExceeded('sightengine');
        } else {
          throw ImageServiceError.serviceUnavailable('sightengine', data.error);
        }
      }

      // Log raw Sightengine response
      console.log('Raw Sightengine Response:', JSON.stringify({
        request: {
          url: imageUrl,
          models: params.models
        },
        response: data
      }, null, 2));

      const normalized = this.normalizeSightengineResponse(data, imageUrl);
      await UsageTracker.incrementUsage(SERVICES.SIGHTENGINE);
      return normalized;
    } catch (error) {
      console.error('Sightengine API error:', error);
      
      // If it's already our custom error, re-throw it
      if (error instanceof ImageServiceError) {
        throw error;
      }

      // Handle axios errors
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw ImageServiceError.imageNotFound(imageUrl, 'sightengine');
        } else if (error.response?.status === 401) {
          throw ImageServiceError.authenticationError('sightengine');
        } else if (error.response?.status === 429) {
          throw ImageServiceError.rateLimitExceeded('sightengine');
        } else if (error.response?.status && error.response.status >= 500) {
          throw ImageServiceError.serviceUnavailable('sightengine', 'Server error');
        } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
          throw ImageServiceError.serviceUnavailable('sightengine', 'Network error');
        }
      }

      throw ImageServiceError.internalError('Failed to analyze image with Sightengine', 'sightengine');
    }
  }

  private async downloadImage(imageUrl: string): Promise<string> {
    try {
      const response = await axios({
        method: 'GET',
        url: imageUrl,
        responseType: 'arraybuffer',
        timeout: 10000, // 10 second timeout
        validateStatus: (status) => status < 400 // Only accept 2xx and 3xx status codes
      });

      const tempDir = os.tmpdir();
      const fileName = `image-${Date.now()}.jpg`;
      const filePath = path.join(tempDir, fileName);

      await fs.promises.writeFile(filePath, response.data);
      return filePath;
    } catch (error) {
      console.error('Error downloading image:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw ImageServiceError.imageNotFound(imageUrl);
        } else if (error.response?.status && error.response.status >= 400 && error.response.status < 500) {
          throw ImageServiceError.imageNotFound(imageUrl);
        } else if (error.code === 'ENOTFOUND') {
          throw ImageServiceError.imageNotFound(imageUrl);
        } else if (error.code === 'ECONNREFUSED') {
          throw ImageServiceError.serviceUnavailable('rekognition', 'Cannot connect to image server');
        } else if (error.code === 'ETIMEDOUT') {
          throw ImageServiceError.serviceUnavailable('rekognition', 'Image download timeout');
        }
      }
      
      throw ImageServiceError.imageNotFound(imageUrl);
    }
  }

  private async cleanupTempFile(filePath: string): Promise<void> {
    try {
      await fs.promises.unlink(filePath);
    } catch (error) {
      console.error('Error cleaning up temporary file:', error);
    }
  }

  // Normalize Rekognition response to unified contract
  private normalizeRekognitionResponse(response: any, imageUrl: string) {
    const moderationLabels = response.ModerationLabels || [];
    const unsafeLabels = moderationLabels.filter((label: any) =>
      label.Confidence > ImageService.REKOGNITION_THRESHOLD &&
      [
        // Only consider explicitly unsafe categories
        'Explicit Nudity',
        'Explicit Sexual Activity',
        'Violence',
        'Blood & Gore',
        'Hate Symbols',
        'Drugs & Tobacco',
        'Alcohol',
        'Gambling',
        'Exposed Male Genitalia',
        'Exposed Female Genitalia',
        'Exposed Buttocks or Anus',
        'Explicit Sexual Activity',
        'Sex Toys'
      ].includes(label.Name)
    );

    const is_safe = unsafeLabels.length === 0;

    // Calculate the highest confidence score for unsafe content
    // Convert from 0-100 scale to 0-1 scale to match Sightengine
    const score = unsafeLabels.length > 0 
      ? Math.max(...unsafeLabels.map((label: any) => label.Confidence)) / 100
      : 0;

    // Determine the reason if not safe
    let reason = null;
    if (!is_safe) {
      const labelNames = unsafeLabels.map((label: any) => label.Name.toLowerCase());

      if (labelNames.some((name: string) =>
        name.includes('explicit') ||
        name.includes('genitalia') ||
        name.includes('sexual activity') ||
        name.includes('sex toys')
      )) {
        reason = 'nudity';
      } else if (labelNames.some((name: string) =>
        name.includes('violence') ||
        name.includes('gore') ||
        name.includes('blood')
      )) {
        reason = 'violence';
      } else if (labelNames.some((name: string) =>
        name.includes('gore') ||
        name.includes('blood')
      )) {
        reason = 'gore';
      } else if (labelNames.some((name: string) =>
        name.includes('hate')
      )) {
        reason = 'hate';
      } else {
        reason = 'other';
      }
    }

    return {
      success: true,
      is_safe,
      reason,
      provider: 'rekognition',
      imageUrl,
      score
    };
  }

  private async checkWithRekognition(imageUrl: string): Promise<any> {
    const rekognitionClient = new RekognitionClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
      }
    });

    let tempFilePath: string | null = null;

    try {
      tempFilePath = await this.downloadImage(imageUrl);
      const imageBytes = await fs.promises.readFile(tempFilePath);

      const command = new DetectModerationLabelsCommand({
        Image: {
          Bytes: imageBytes
        },
        MinConfidence: ImageService.REKOGNITION_THRESHOLD
      });

      const response = await rekognitionClient.send(command);

      // Log raw Rekognition response
      console.log('Raw Rekognition Response:', JSON.stringify({
        request: {
          url: imageUrl,
          minConfidence: ImageService.REKOGNITION_THRESHOLD
        },
        response: {
          ModerationLabels: response.ModerationLabels?.map(label => ({
            Name: label.Name,
            Confidence: label.Confidence,
            ParentName: label.ParentName,
            TaxonomyLevel: label.TaxonomyLevel
          }))
        }
      }, null, 2));

      const normalized = this.normalizeRekognitionResponse(response, imageUrl);
      await UsageTracker.incrementUsage('rekognition');
      return normalized;

    } catch (error) {
      console.error('Amazon Rekognition API error:', error);
      
      // If it's already our custom error, re-throw it
      if (error instanceof ImageServiceError) {
        throw error;
      }

      // Handle AWS-specific errors
      if (error && typeof error === 'object' && 'name' in error) {
        const awsError = error as { name: string };
        if (awsError.name === 'InvalidParameterException') {
          throw ImageServiceError.imageNotFound(imageUrl, 'rekognition');
        } else if (awsError.name === 'InvalidImageFormatException') {
          throw ImageServiceError.imageNotFound(imageUrl, 'rekognition');
        } else if (awsError.name === 'ImageTooLargeException') {
          throw ImageServiceError.serviceUnavailable('rekognition', 'Image too large');
        } else if (awsError.name === 'AccessDeniedException') {
          throw ImageServiceError.authenticationError('rekognition');
        } else if (awsError.name === 'ThrottlingException') {
          throw ImageServiceError.rateLimitExceeded('rekognition');
        } else if (awsError.name === 'ServiceUnavailableException') {
          throw ImageServiceError.serviceUnavailable('rekognition');
        }
      }

      throw ImageServiceError.internalError('Failed to analyze image with Amazon Rekognition', 'rekognition');
    } finally {
      if (tempFilePath) {
        await this.cleanupTempFile(tempFilePath);
      }
    }
  }

  public async checkImage(request: ImageCheckRequest & { service?: ServiceType }): Promise<any> {
    // If a specific service is requested, use it
    if (request.service) {
      const service = this.services.find(s => s.name === request.service);
      if (!service) {
        throw ImageServiceError.serviceUnavailable(request.service as 'sightengine' | 'rekognition', 'Service not configured');
      }

      // Check if the requested service can be used
      if (request.service === SERVICES.SIGHTENGINE) {
        const canUseSightengine = await UsageTracker.canUseSightengine();
        if (!canUseSightengine) {
          throw ImageServiceError.rateLimitExceeded('sightengine');
        }
      } else if (request.service === SERVICES.REKOGNITION) {
        const canUseRekognition = await UsageTracker.canUseRekognition();
        if (!canUseRekognition) {
          throw ImageServiceError.rateLimitExceeded('rekognition');
        }
      }

      return request.service === SERVICES.SIGHTENGINE
        ? this.checkWithSightEngine(request.imageUrl)
        : this.checkWithRekognition(request.imageUrl);
    }

    // If no specific service is requested, try Sightengine first, then fallback to Rekognition
    try {
      const canUseSightengine = await UsageTracker.canUseSightengine();
      if (canUseSightengine) {
        return await this.checkWithSightEngine(request.imageUrl);
      }

      const canUseRekognition = await UsageTracker.canUseRekognition();
      if (canUseRekognition) {
        return await this.checkWithRekognition(request.imageUrl);
      }

      throw ImageServiceError.rateLimitExceeded('sightengine');
    } catch (error) {
      // If it's already our custom error, re-throw it
      if (error instanceof ImageServiceError) {
        throw error;
      }
      
      throw ImageServiceError.internalError('Error checking image');
    }
  }

  public async getServiceUsage(service: ServiceType): Promise<{
    daily: number;
    monthly: number;
  }> {
    return UsageTracker.getServiceUsage(service);
  }
}

export const imageService = new ImageService();