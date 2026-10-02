import { Request, Response, NextFunction } from 'express';

/**
 * Enterprise-grade HTTP security headers middleware.
 * Mitigates MIME sniffing, clickjacking, XSS exploitation,
 * and sensitive header disclosures.
 */
export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Prevent browser MIME-sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Disable legacy browser XSS filters that create vulnerabilities
  res.setHeader('X-XSS-Protection', '0');

  // Protect referrers from leaking search queries to third-party assets
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Restrict unused hardware device features
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Set Content-Security-Policy supporting the live preview environment and media providers
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https: blob:",
      "style-src 'self' 'unsafe-inline' https:",
      "font-src 'self' data: https:",
      "img-src 'self' data: blob: https:",
      "media-src 'self' data: blob: https:",
      "connect-src 'self' https: wss: ws:",
      "frame-src 'self' https://www.youtube-nocookie.com https://www.youtube.com https://player.vimeo.com https://geo.dailymotion.com https://archive.org https://yewtu.be https://piped.video blob: https:",
      "child-src 'self' blob: https:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "worker-src 'self' blob:",
      "frame-ancestors 'self' https://*.google.com https://*.ai.studio https://ai.studio https://*.run.app"
    ].join('; ')
  );

  // Strip server fingerprinting
  res.removeHeader('X-Powered-By');

  next();
}
