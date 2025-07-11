import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('❌ Error:', error);

  const response: ApiResponse = {
    success: false,
    error: error.message || 'Internal Server Error',
  };

  // Firebase errors
  if (error.message.includes('permission-denied')) {
    res.status(403).json(response);
    return;
  }

  if (error.message.includes('not-found')) {
    res.status(404).json(response);
    return;
  }

  // Default to 500
  res.status(500).json(response);
};

export const notFoundHandler = (
  req: Request,
  res: Response
): void => {
  const response: ApiResponse = {
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
  };

  res.status(404).json(response);
};
