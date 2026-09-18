import { Request, Response, NextFunction } from 'express';
import zlib from 'zlib';

/**
 * Native zlib HTTP compression middleware for API JSON and text responses.
 * Reduces wire payload sizes by 70-85% for large search result envelopes,
 * drastically reducing transit latency without introducing external dependencies.
 */
export function compressionMiddleware(req: Request, res: Response, next: NextFunction): void {
  const acceptEncoding = req.headers['accept-encoding'];
  if (!acceptEncoding || typeof acceptEncoding !== 'string') {
    return next();
  }

  const supportsGzip = acceptEncoding.includes('gzip');
  const supportsDeflate = acceptEncoding.includes('deflate');

  if (!supportsGzip && !supportsDeflate) {
    return next();
  }

  const originalSend = res.send.bind(res);
  const originalJson = res.json.bind(res);

  const compressAndSend = (body: any, isJson: boolean): Response => {
    // If response was already sent or already has content encoding, pass through
    if (res.headersSent || res.getHeader('Content-Encoding')) {
      return originalSend(body);
    }

    let payload: Buffer | string;
    if (isJson) {
      payload = typeof body === 'string' ? body : JSON.stringify(body);
      if (!res.getHeader('Content-Type')) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
      }
    } else if (typeof body === 'string') {
      payload = body;
    } else if (Buffer.isBuffer(body)) {
      payload = body;
    } else {
      return originalSend(body);
    }

    const byteLength = Buffer.byteLength(payload);
    // Skip compression for small payloads (< 1024 bytes) to avoid negative compression overhead
    if (byteLength < 1024) {
      return originalSend(payload);
    }

    const method = supportsGzip ? 'gzip' : 'deflate';
    const compressor = supportsGzip ? zlib.gzipSync : zlib.deflateSync;

    try {
      const compressed = compressor(payload, { level: 6 });
      res.setHeader('Content-Encoding', method);
      res.setHeader('Content-Length', compressed.length.toString());
      res.setHeader('Vary', 'Accept-Encoding');
      return originalSend(compressed);
    } catch {
      return originalSend(payload);
    }
  };

  res.send = (body: any): Response => {
    return compressAndSend(body, false);
  };

  res.json = (body: any): Response => {
    return compressAndSend(body, true);
  };

  next();
}
