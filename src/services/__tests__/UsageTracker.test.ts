  import { UsageTracker } from '../UsageTracker';
import { ServiceUsage } from '../../models/ServiceUsage';
import { SERVICES } from '../../constants';

// Mock mongoose
jest.mock('mongoose', () => ({
  connect: jest.fn(),
  connection: {
    on: jest.fn(),
    once: jest.fn()
  }
}));

// Mock the ServiceUsage model
jest.mock('../../models/ServiceUsage', () => ({
  ServiceUsage: {
    findOneAndUpdate: jest.fn(),
    aggregate: jest.fn()
  }
}));

describe('UsageTracker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('incrementUsage', () => {
    it('should increment usage for a service', async () => {
      const mockDate = new Date('2024-03-15');
      jest.useFakeTimers().setSystemTime(mockDate);

      await UsageTracker.incrementUsage(SERVICES.SIGHTENGINE);

      expect(ServiceUsage.findOneAndUpdate).toHaveBeenCalledWith(
        {
          service: SERVICES.SIGHTENGINE,
          date: {
            $gte: expect.any(Date),
            $lt: expect.any(Date)
          }
        },
        {
          $inc: { count: 1 },
          $setOnInsert: {
            service: SERVICES.SIGHTENGINE,
            date: mockDate,
            month: 3,
            year: 2024
          }
        },
        { upsert: true, new: true }
      );
    });
  });

  describe('canUseSightengine', () => {
    it('should return true when usage is below limits', async () => {
      // Mock daily usage below limit
      (ServiceUsage.aggregate as jest.Mock).mockResolvedValueOnce([{ total: 400 }]);
      // Mock monthly usage below limit
      (ServiceUsage.aggregate as jest.Mock).mockResolvedValueOnce([{ total: 1500 }]);

      const result = await UsageTracker.canUseSightengine();
      expect(result).toBe(true);
    });

    it('should return false when daily limit is reached', async () => {
      // Mock daily usage at limit
      (ServiceUsage.aggregate as jest.Mock).mockResolvedValueOnce([{ total: 500 }]);

      const result = await UsageTracker.canUseSightengine();
      expect(result).toBe(false);
    });

    it('should return false when monthly limit is reached', async () => {
      // Mock daily usage below limit
      (ServiceUsage.aggregate as jest.Mock).mockResolvedValueOnce([{ total: 400 }]);
      // Mock monthly usage at limit
      (ServiceUsage.aggregate as jest.Mock).mockResolvedValueOnce([{ total: 2000 }]);

      const result = await UsageTracker.canUseSightengine();
      expect(result).toBe(false);
    });
  });

  describe('canUseRekognition', () => {
    it('should return true when usage is below limit', async () => {
      // Mock monthly usage below limit
      (ServiceUsage.aggregate as jest.Mock).mockResolvedValueOnce([{ total: 3000 }]);

      const result = await UsageTracker.canUseRekognition();
      expect(result).toBe(true);
    });

    it('should return false when monthly limit is reached', async () => {
      // Mock monthly usage at limit
      (ServiceUsage.aggregate as jest.Mock).mockResolvedValueOnce([{ total: 4000 }]);

      const result = await UsageTracker.canUseRekognition();
      expect(result).toBe(false);
    });
  });
});