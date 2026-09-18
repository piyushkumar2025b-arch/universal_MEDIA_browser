import { Request, Response, NextFunction } from 'express';
import { APP_CONFIG } from '../config/app_config';

export interface AppError extends Error {
  statusCode?: number;
  status?: number;
  type?: string;
  details?: any;
}

export function errorHandlerMiddleware(
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const status = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  console.error(`[ErrorHandler] [${req.id || 'anonymous'}] Error handling ${req.method} ${req.url}:`, err);

  // Return RFC 7807 Problem Details
  res.status(status).json({
    type: err.type || 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
    title: status >= 500 ? 'Internal Server Error' : 'Request Error',
    status,
    detail: message,
    instance: req.originalUrl || req.url,
    requestId: req.id,
    ...(APP_CONFIG.isProduction ? {} : { stack: err.stack, details: err.details })
  });
}
