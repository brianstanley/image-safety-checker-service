import { ServiceUsage } from '../models/ServiceUsage';
import { SERVICES, ServiceType } from '../constants';

export class UsageTracker {
  private static readonly SIGHTENGINE_DAILY_LIMIT = 500;
  private static readonly SIGHTENGINE_MONTHLY_LIMIT = 2000;
  private static readonly REKOGNITION_MONTHLY_LIMIT = 4000;

  static async incrementUsage(service: ServiceType): Promise<void> {
    const now = new Date();
    const month = now.getMonth() + 1; // getMonth() returns 0-11
    const year = now.getFullYear();

    await ServiceUsage.findOneAndUpdate(
      {
        service,
        date: {
          $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
        }
      },
      {
        $inc: { count: 1 },
        $setOnInsert: { service, date: now, month, year }
      },
      { upsert: true, new: true }
    );
  }

  static async canUseSightengine(): Promise<boolean> {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // Check daily limit
    const dailyUsage = await ServiceUsage.aggregate([
      {
        $match: {
          service: SERVICES.SIGHTENGINE,
          date: {
            $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
            $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
          }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$count' }
        }
      }
    ]);

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

    const [dailyUsage, monthlyUsage] = await Promise.all([
      ServiceUsage.aggregate([
        {
          $match: {
            service,
            date: {
              $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
              $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
            }
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