import { Request, Response, NextFunction } from 'express';
import { ErrorResponse } from '../types';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(err.stack);

  const error: ErrorResponse = {
    message: err.message || 'Internal server error',
    status: 500
  };

  res.status(error.status).json(error);
}; 