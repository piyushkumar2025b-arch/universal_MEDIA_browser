import { Request, Response, NextFunction } from 'express';

export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Only log API routes to reduce console noise for static assets
  if (!req.path.startsWith('/api')) {
    return next();
  }

  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const logLevel = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
    
    // Prefix with system tag
    const logMsg = `[HTTP] ${req.method} ${req.originalUrl || req.url} ${status} - ${duration}ms (id: ${req.id || 'anonymous'})`;
    if (logLevel === 'error') {
      console.error(logMsg);
    } else if (logLevel === 'warn') {
      console.warn(logMsg);
    }
  });

  next();
}
