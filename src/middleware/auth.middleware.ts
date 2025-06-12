import { Request, Response, NextFunction } from 'express';
import { ErrorResponse } from '../types';

export const validateApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    const error: ErrorResponse = {
      message: 'API key is required',
      status: 401
    };
    return res.status(401).json(error);
  }

  // For now, we'll use a mock list of API keys
  // In production, this should be moved to environment variables
  const validApiKeys = ['test-key-1', 'test-key-2'];
  
  if (!validApiKeys.includes(apiKey as string)) {
    const error: ErrorResponse = {
      message: 'Invalid API key',
      status: 401
    };
    return res.status(401).json(error);
  }

  next();
};

export const validateAdminKey = (req: Request, res: Response, next: NextFunction) => {
  const adminKey = req.headers['x-admin-key'];
  
  if (!adminKey || adminKey !== process.env.ADMIN_API_KEY) {
    const error: ErrorResponse = {
      message: 'Unauthorized access',
      status: 401
    };
    return res.status(401).json(error);
  }

  next();
}; 