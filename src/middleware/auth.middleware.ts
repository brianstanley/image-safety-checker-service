import { Request, Response, NextFunction } from 'express';

export const validateApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized'
    });
  }

  // For now, we'll use a mock list of API keys
  // In production, this should be moved to environment variables
  const validApiKeys = ['test-key-1', 'test-key-2'];
  
  if (!validApiKeys.includes(apiKey as string)) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized'
    });
  }

  next();
};

export const validateAdminKey = (req: Request, res: Response, next: NextFunction) => {
  const adminKey = req.headers['x-admin-key'];
  
  if (!adminKey || adminKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized'
    });
  }

  next();
}; 