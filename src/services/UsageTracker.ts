import { ServiceUsage } from '../models/ServiceUsage';
import { SERVICES, ServiceType } from '../constants';

export class UsageTracker {
  // SightEngine limits are based on operations, not API calls
  // Each API call uses 2 models, so effective limits are:
  // Daily: 500 operations ÷ 2 models = 250 calls
  // Monthly: 2000 operations ÷ 2 models = 1000 calls
  private static readonly SIGHTENGINE_DAILY_LIMIT = 250; // Effective daily limit for API calls
  private static readonly SIGHTENGINE_MONTHLY_LIMIT = 2000; // Effective monthly limit for API calls
  private static readonly REKOGNITION_MONTHLY_LIMIT = 4000;

  static async incrementUsage(service: ServiceType, count: number = 1): Promise<void> {
    const now = new Date();
    const month = now.getMonth() + 1; // getMonth() returns 0-11
    const year = now.getFullYear();
    
    // Create a date object for the current day only in UTC
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

    console.log('=== Incrementing Usage ===');
    console.log('Service:', service);
    console.log('Count to add:', count);
    console.log('Date to save:', today.toISOString());
    console.log('==========================');

    await ServiceUsage.findOneAndUpdate(
      {
        service,
        date: today
      },
      {
        $inc: { count },
        $setOnInsert: { service, date: today, month, year }
      },
      { upsert: true, new: true }
    );
  }

  static async canUseSightengine(): Promise<boolean> {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

    console.log('=== SightEngine Daily Limit Check ===');
    console.log('Current time:', now.toISOString());
    console.log('Today (UTC):', today.toISOString());
    console.log('Today (local):', new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString());

    // Check daily limit
    const dailyUsage = await ServiceUsage.aggregate([
      {
        $match: {
          service: SERVICES.SIGHTENGINE,
          date: today
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$count' }
        }
      }
    ]);

    console.log('Daily usage query result:', dailyUsage);
    console.log('Current usage:', dailyUsage.length > 0 ? dailyUsage[0].total : 0);
    console.log('Daily limit:', this.SIGHTENGINE_DAILY_LIMIT);
    console.log('Can use SightEngine:', dailyUsage.length === 0 || dailyUsage[0].total < this.SIGHTENGINE_DAILY_LIMIT);

    if (dailyUsage.length > 0 && dailyUsage[0].total >= this.SIGHTENGINE_DAILY_LIMIT) {
      return false;
    }

    // Check monthly limit
    const monthlyUsage = await ServiceUsage.aggregate([
      {
        $match: {
          service: SERVICES.SIGHTENGINE,
          month,
          year
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$count' }
        }
      }
    ]);
    console.log("Monthly usage:", monthlyUsage)

    return !(monthlyUsage.length > 0 && monthlyUsage[0].total >= this.SIGHTENGINE_MONTHLY_LIMIT);
  }

  static async canUseRekognition(): Promise<boolean> {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const monthlyUsage = await ServiceUsage.aggregate([
      {
        $match: {
          service: SERVICES.REKOGNITION,
          month,
          year
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$count' }
        }
      }
    ]);

    return !(monthlyUsage.length > 0 && monthlyUsage[0].total >= this.REKOGNITION_MONTHLY_LIMIT);
  }

  static async getServiceUsage(service: ServiceType): Promise<{
    daily: number;
    monthly: number;
  }> {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

    console.log('=== Getting Service Usage ===');
    console.log('Service:', service);
    console.log('Date for query:', today.toISOString());
    console.log('============================');

    const [dailyUsage, monthlyUsage] = await Promise.all([
      ServiceUsage.aggregate([
        {
          $match: {
            service,
            date: today
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$count' }
          }
        }
      ]),
      ServiceUsage.aggregate([
        {
          $match: {
            service,
            month,
            year
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$count' }
          }
        }
      ])
    ]);

    return {
      daily: dailyUsage.length > 0 ? dailyUsage[0].total : 0,
      monthly: monthlyUsage.length > 0 ? monthlyUsage[0].total : 0
    };
  }
} 