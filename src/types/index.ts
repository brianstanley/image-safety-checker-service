export interface ImageCheckRequest {
  imageUrl: string;
}

export interface ImageCheckResponse {
  success: boolean;
  is_safe: boolean;
  reason: 'nudity' | 'suggestive' | 'violence' | 'gore' | 'hate' | 'other' | null;
  provider: 'sightengine' | 'rekognition';
  imageUrl: string;
  score: number;
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