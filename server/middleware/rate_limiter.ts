import { Request, Response, NextFunction } from 'express';
import { APP_CONFIG } from '../config/app_config';

interface ClientWindow {
  count: number;
  resetTime: number;
}

const clientWindows = new Map<string, ClientWindow>();
const benchmarkWindows = new Map<string, ClientWindow>();
const MAX_MAP_SIZE = 5000;

// Prune expired windows every minute and keep map size strictly bounded
setInterval(() => {
  const now = Date.now();
  for (const [ip, window] of clientWindows.entries()) {
    if (now > window.resetTime) {
      clientWindows.delete(ip);
    }
  }
  for (const [ip, window] of benchmarkWindows.entries()) {
    if (now > window.resetTime) {
      benchmarkWindows.delete(ip);
    }
  }
}, 60000);

function sanitizeClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    const first = forwarded.split(',')[0].trim();
    if (first && first.length <= 45) return first;
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

export function rateLimiterMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Only throttle API endpoints (/api/*)
  const fullPath = req.originalUrl || req.url || '';
  if (!fullPath.startsWith('/api')) {
    return next();
  }

  const clientIp = sanitizeClientIp(req);
  const now = Date.now();

  // 1. Strict limit for high-overhead benchmark probe (10 per minute per IP)
  if (fullPath.includes('/system/benchmark')) {
    const bLimit = 10;
    const bDuration = 60 * 1000;
    let bWindow = benchmarkWindows.get(clientIp);
    if (!bWindow || now > bWindow.resetTime) {
      if (benchmarkWindows.size >= MAX_MAP_SIZE) {
        const oldestKey = benchmarkWindows.keys().next().value;
        if (oldestKey) benchmarkWindows.delete(oldestKey);
      }
      bWindow = { count: 1, resetTime: now + bDuration };
      benchmarkWindows.set(clientIp, bWindow);
    } else {
      bWindow.count++;
    }

    if (bWindow.count > bLimit) {
      const retryAfterSec = Math.ceil((bWindow.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSec.toString());
      res.status(429).json({
        type: 'https://tools.ietf.org/html/rfc6585#section-4',
        title: 'Too Many Requests',
        status: 429,
        detail: `Benchmark rate limit of ${bLimit} runs per minute exceeded. Please retry in ${retryAfterSec}s.`,
        instance: fullPath
      });
      return;
    }
  }

  // 2. Global rate limit for all API routes (300 requests per minute)
  const windowDuration = APP_CONFIG.rateLimit.windowMs;
  const maxAllowed = APP_CONFIG.rateLimit.maxRequests;

  let window = clientWindows.get(clientIp);
  if (!window || now > window.resetTime) {
    if (clientWindows.size >= MAX_MAP_SIZE) {
      const oldestKey = clientWindows.keys().next().value;
      if (oldestKey) clientWindows.delete(oldestKey);
    }
    window = {
      count: 1,
      resetTime: now + windowDuration
    };
    clientWindows.set(clientIp, window);
  } else {
    window.count++;
  }

  const remaining = Math.max(0, maxAllowed - window.count);
  const retryAfterSec = Math.ceil((window.resetTime - now) / 1000);

  res.setHeader('X-RateLimit-Limit', maxAllowed.toString());
  res.setHeader('X-RateLimit-Remaining', remaining.toString());
  res.setHeader('X-RateLimit-Reset', Math.ceil(window.resetTime / 1000).toString());

  if (window.count > maxAllowed) {
    res.setHeader('Retry-After', retryAfterSec.toString());
    res.status(429).json({
      type: 'https://tools.ietf.org/html/rfc6585#section-4',
      title: 'Too Many Requests',
      status: 429,
      detail: `Rate limit of ${maxAllowed} requests per minute exceeded. Please retry in ${retryAfterSec} seconds.`,
      instance: fullPath
    });
    return;
  }

  next();
}
