import mongoose, { Document, Schema } from 'mongoose';
import { SERVICES, ServiceType } from '../constants';

export interface IServiceUsage extends Document {
  service: ServiceType;
  date: Date;
  count: number;
  month: number;
  year: number;
  createdAt: Date;
  updatedAt: Date;
}

const ServiceUsageSchema = new Schema({
  service: {
    type: String,
    required: true,
    enum: Object.values(SERVICES)
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  count: {
    type: Number,
    required: true,
    default: 0
  },
  month: {
    type: Number,
    required: true
  },
  year: {
    type: Number,
    required: true
  }
}, {
  timestamps: true // This will add createdAt and updatedAt fields
});

// Compound index for efficient queries
ServiceUsageSchema.index({ service: 1, date: 1 });
ServiceUsageSchema.index({ service: 1, month: 1, year: 1 });

export const ServiceUsage = mongoose.model<IServiceUsage>('ServiceUsage', ServiceUsageSchema); 