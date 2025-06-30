export interface ImageCheckRequest {
  imageUrl: string;
}

export interface ImageCheckResponse {
  success: boolean;
  is_safe: boolean;
  reason: 'nudity' | 'suggestive' | 'violence' | 'gore' | 'hate' | 'other' | null;
  provider: 'sightengine' | 'rekognition';
  imageUrl: string;
  score: number; // Confidence/probability score (0-1 for Sightengine, 0-100 for Rekognition)
}

export interface Usage {
  serviceName: 'sightengine' | 'rekognition';
  month: string;
  requestsUsed: number;
  limit: number;
}

export interface ServiceConfig {
  name: string;
  limit: number;
  apiKey?: string;
  apiSecret?: string;
  region?: string;
}

export interface ErrorResponse {
  message: string;
  status: number;
}

// New error types for better error handling
export interface DetailedErrorResponse {
  success: false;
  error: string;
  errorType: 'validation' | 'image_not_found' | 'service_unavailable' | 'rate_limit' | 'authentication' | 'internal';
  details?: Array<{
    field?: string;
    message: string;
  }>;
  provider?: 'sightengine' | 'rekognition';
  imageUrl?: string;
}

export type ImageCheckError = 
  | 'IMAGE_NOT_FOUND'
  | 'INVALID_URL'
  | 'SERVICE_UNAVAILABLE'
  | 'RATE_LIMIT_EXCEEDED'
  | 'AUTHENTICATION_ERROR'
  | 'INTERNAL_ERROR'; 