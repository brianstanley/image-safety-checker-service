import dotenv from 'dotenv';

// Load environment variables
process.env.SIGHTENGINE_API_KEY = 'test-sightengine-key';
process.env.SIGHTENGINE_API_SECRET = 'test-sightengine-secret';
process.env.AWS_ACCESS_KEY_ID = 'test-aws-key';
process.env.AWS_SECRET_ACCESS_KEY = 'test-aws-secret';
process.env.AWS_REGION = 'us-east-1';
process.env.MONGODB_URI = 'mongodb://localhost:27017/safe-checker-test';
process.env.ADMIN_API_KEY = 'test-admin-key';

// Mock console.error to keep test output clean
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  // Skip MongoDB connection errors
  if (args[0]?.includes?.('MongoDB connection error')) {
    return;
  }

  // Skip expected validation errors in tests
  if (
    args[0]?.includes?.('Error checking image') &&
    (
      args[1]?.issues?.[0]?.code === 'invalid_type' ||
      args[1]?.issues?.[0]?.code === 'invalid_string'
    )
  ) {
    return;
  }

  // Skip expected service errors in tests
  if (
    args[0]?.includes?.('Error checking image') &&
    args[1]?.message === 'Service error'
  ) {
    return;
  }

  originalConsoleError(...args);
};

// Global test timeout - 5 seconds should be enough for our mocked tests
jest.setTimeout(5000);

describe('Test Setup', () => {
  it('should have all required environment variables', () => {
    expect(process.env.SIGHTENGINE_API_KEY).toBeDefined();
    expect(process.env.SIGHTENGINE_API_SECRET).toBeDefined();
    expect(process.env.AWS_ACCESS_KEY_ID).toBeDefined();
    expect(process.env.AWS_SECRET_ACCESS_KEY).toBeDefined();
    expect(process.env.AWS_REGION).toBeDefined();
    expect(process.env.MONGODB_URI).toBeDefined();
    expect(process.env.ADMIN_API_KEY).toBeDefined();
  });
}); 