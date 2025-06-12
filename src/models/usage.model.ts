import { Schema, model, Document } from 'mongoose';
import { Usage } from '../types';

export interface UsageDocument extends Usage, Document {}

const usageSchema = new Schema<UsageDocument>({
  serviceName: {
    type: String,
    enum: ['sightengine', 'rekognition'],
    required: true
  },
  month: {
    type: String,
    required: true,
    match: /^\d{4}-\d{2}$/
  },
  requestsUsed: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  limit: {
    type: Number,
    required: true,
    min: 0
  }
}, {
  timestamps: true
});

// Compound index to ensure uniqueness of serviceName and month combination
usageSchema.index({ serviceName: 1, month: 1 }, { unique: true });

export const UsageModel = model<UsageDocument>('Usage', usageSchema); 