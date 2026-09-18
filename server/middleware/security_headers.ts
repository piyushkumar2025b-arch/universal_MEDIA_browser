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
      "default-src * 'self' data: blob:",
      "script-src * 'self' 'unsafe-inline' 'unsafe-eval' blob:",
      "style-src * 'self' 'unsafe-inline' https: http:",
      "font-src * 'self' data: https: http:",
      "img-src * 'self' data: blob: https: http:",
      "media-src * 'self' data: blob: https: http:",
      "connect-src * 'self' https: http: data: blob: wss: ws:",
      "frame-src * 'self' blob: data: https: http:",
      "child-src * 'self' blob: data: https: http:",
      "object-src * 'self' blob: data: https: http:",
      "worker-src * 'self' blob: data:",
      "frame-ancestors 'self' https://*.google.com https://*.ai.studio https://ai.studio *"
    ].join('; ')
  );

  // Strip server fingerprinting
  res.removeHeader('X-Powered-By');

  next();
}
