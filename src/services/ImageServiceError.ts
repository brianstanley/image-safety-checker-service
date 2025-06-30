import { ImageCheckError, DetailedErrorResponse } from '../types';

export class ImageServiceError extends Error {
  public readonly errorType: ImageCheckError;
  public readonly provider?: 'sightengine' | 'rekognition';
  public readonly imageUrl?: string;
  public readonly statusCode: number;

  constructor(
    message: string,
    errorType: ImageCheckError,
    statusCode: number = 500,
    provider?: 'sightengine' | 'rekognition',
    imageUrl?: string
  ) {
    super(message);
    this.name = 'ImageServiceError';
    this.errorType = errorType;
    this.provider = provider;
    this.imageUrl = imageUrl;
    this.statusCode = statusCode;
  }

  public toDetailedResponse(): DetailedErrorResponse {
    return {
      success: false,
      error: this.message,
      errorType: this.mapErrorTypeToResponseType(),
      provider: this.provider,
      imageUrl: this.imageUrl
    };
  }

  private mapErrorTypeToResponseType(): DetailedErrorResponse['errorType'] {
    switch (this.errorType) {
      case 'IMAGE_NOT_FOUND':
        return 'image_not_found';
      case 'INVALID_URL':
        return 'validation';
      case 'SERVICE_UNAVAILABLE':
        return 'service_unavailable';
      case 'RATE_LIMIT_EXCEEDED':
        return 'rate_limit';
      case 'AUTHENTICATION_ERROR':
        return 'authentication';
      case 'INTERNAL_ERROR':
      default:
        return 'internal';
    }
  }

  // Static factory methods for common errors
  static imageNotFound(imageUrl: string, provider?: 'sightengine' | 'rekognition'): ImageServiceError {
    return new ImageServiceError(
      `Image not found or inaccessible: ${imageUrl}`,
      'IMAGE_NOT_FOUND',
      404,
      provider,
      imageUrl
    );
  }

  static invalidUrl(imageUrl: string): ImageServiceError {
    return new ImageServiceError(
      `Invalid image URL: ${imageUrl}`,
      'INVALID_URL',
      400,
      undefined,
      imageUrl
    );
  }

  static serviceUnavailable(provider: 'sightengine' | 'rekognition', reason?: string): ImageServiceError {
    return new ImageServiceError(
      `${provider} service is currently unavailable${reason ? `: ${reason}` : ''}`,
      'SERVICE_UNAVAILABLE',
      503,
      provider
    );
  }

  static rateLimitExceeded(provider: 'sightengine' | 'rekognition'): ImageServiceError {
    return new ImageServiceError(
      `${provider} rate limit exceeded`,
      'RATE_LIMIT_EXCEEDED',
      429,
      provider
    );
  }

  static authenticationError(provider: 'sightengine' | 'rekognition'): ImageServiceError {
    return new ImageServiceError(
      `${provider} authentication failed`,
      'AUTHENTICATION_ERROR',
      401,
      provider
    );
  }

  static internalError(message: string, provider?: 'sightengine' | 'rekognition'): ImageServiceError {
    return new ImageServiceError(
      message,
      'INTERNAL_ERROR',
      500,
      provider
    );
  }
} 