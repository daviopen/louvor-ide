import { Request, Response, NextFunction } from 'express';
import { ENV } from '../config/env';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Log request
  console.log(`📝 ${req.method} ${req.path} - ${req.ip} - ${new Date().toISOString()}`);
  
  // Log response
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    const statusEmoji = statusCode >= 400 ? '❌' : statusCode >= 300 ? '🔄' : '✅';
    
    console.log(`${statusEmoji} ${req.method} ${req.path} - ${statusCode} - ${duration}ms`);
  });
  
  next();
};
