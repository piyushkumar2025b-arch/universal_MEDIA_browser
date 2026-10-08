import crypto from 'crypto';
import { APP_CONFIG } from '../config/app_config';
import { mediaProxyService } from './media_proxy_service';
import { isSafePublicUrl, sanitizeSafeFilename, safeFetch } from '../utils/security';

export interface DownloadResult {
  buffer: Buffer;
  contentType: string;
  filename: string;
  sha256: string;
  sizeBytes: number;
  isVerified: boolean;
}

const UPSTREAM_HEADERS = Object.freeze({
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 URMIL-Universal-Browser/1.0',
  'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,audio/*,video/*,application/pdf,application/json,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
});

export class DownloadService {
  /**
   * Resolves an optimized or alternative streamable URL if the target is a known gigantic master file.
   */
  public getOptimizedStreamUrl(targetUrl: string): string {
    if (!targetUrl) return '';

    // If Wikimedia Commons original master is an uncompressed gigantic TIFF/TIF file,
    // provide high-resolution 2560px thumb which is web-compatible and instant to download
    if (targetUrl.includes('upload.wikimedia.org/wikipedia/commons/') && !targetUrl.includes('/thumb/') && /\.(tiff?)$/i.test(targetUrl)) {
      const match = targetUrl.match(/upload\.wikimedia\.org\/wikipedia\/commons\/([a-z0-9]+\/[a-z0-9]+\/)([^/]+)$/i);
      if (match) {
        const [, path, filename] = match;
        return `https://upload.wikimedia.org/wikipedia/commons/thumb/${path}${filename}/2560px-${filename}.jpg`;
      }
    }

    return targetUrl;
  }

  /**
   * Downloads upstream resource and computes true cryptographic SHA-256 integrity hash.
   * Verifies against expected checksum if supplied (BUG-006) and aligns TIFF/JPEG filenames (BUG-007).
   */
  public async downloadAndVerify(
    url: string,
    rawFilename?: string,
    fallbackUrl?: string,
    expectedSha256?: string
  ): Promise<DownloadResult> {
    if (!url || !isSafePublicUrl(url)) {
      throw new Error('Invalid or forbidden target URL for download');
    }

    const candidateUrls = [
      url,
      this.getOptimizedStreamUrl(url),
      fallbackUrl,
    ].filter((u, i, arr): u is string => Boolean(u && isSafePublicUrl(u) && arr.indexOf(u) === i));

    let lastError: any = null;

    for (const target of candidateUrls) {
      try {
        const upstream = await safeFetch(target, {
          headers: UPSTREAM_HEADERS,
          signal: AbortSignal.timeout(APP_CONFIG.download.timeoutMs)
        });

        if (!upstream.ok) {
          lastError = new Error(`Upstream returned HTTP ${upstream.status}`);
          continue;
        }

        const rawContentType = upstream.headers.get('content-type') || '';
        if (rawContentType.toLowerCase().includes('text/html') || rawContentType.toLowerCase().includes('application/xhtml+xml')) {
          const err = new Error('Upstream source returned an HTML web page instead of binary media file') as any;
          err.statusCode = 415;
          throw err;
        }

        // Check Content-Length header upfront if provided by upstream
        const contentLengthHeader = upstream.headers.get('content-length');
        if (contentLengthHeader) {
          const expectedBytes = parseInt(contentLengthHeader, 10);
          if (!isNaN(expectedBytes) && expectedBytes > APP_CONFIG.download.maxSizeBytes) {
            const err = new Error(`File size (${Math.round(expectedBytes / (1024 * 1024))}MB) exceeds maximum permitted limit (${Math.round(APP_CONFIG.download.maxSizeBytes / (1024 * 1024))}MB)`) as any;
            err.statusCode = 413;
            throw err;
          }
        }

        // Stream the response with a hard byte counter and compute SHA-256 on the fly
        if (!upstream.body) {
          const err = new Error('Upstream source returned empty body') as any;
          err.statusCode = 502;
          throw err;
        }

        const reader = upstream.body.getReader();
        const chunks: Uint8Array[] = [];
        let totalBytes = 0;
        const hash = crypto.createHash('sha256');

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
              totalBytes += value.length;
              if (totalBytes > APP_CONFIG.download.maxSizeBytes) {
                reader.cancel().catch(() => {});
                const err = new Error(`Download exceeded maximum permitted size of ${Math.round(APP_CONFIG.download.maxSizeBytes / (1024 * 1024))}MB`) as any;
                err.statusCode = 413;
                throw err;
              }
              chunks.push(value);
              hash.update(value);
            }
          }
        } finally {
          try {
            reader.releaseLock();
          } catch {}
        }

        const buffer = Buffer.concat(chunks);
        const sha256 = hash.digest('hex');
        const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
        let cleanFilename = sanitizeSafeFilename(rawFilename, 'resource');

        // BUG-007: If upstream resource was converted to JPEG thumb or response is JPEG while filename is TIFF, fix filename
        if ((target.endsWith('.jpg') || target.includes('/thumb/') || contentType.toLowerCase().includes('image/jpeg')) && /\.(tiff?)$/i.test(cleanFilename)) {
          cleanFilename = cleanFilename.replace(/\.(tiff?)$/i, '.jpg');
        }

        // BUG-006: Cryptographic verification against trusted expected digest
        let isVerified = false;
        if (expectedSha256 && typeof expectedSha256 === 'string' && expectedSha256.trim()) {
          if (expectedSha256.trim().toLowerCase() === sha256.toLowerCase()) {
            isVerified = true;
          } else {
            const mismatchErr = new Error(`Cryptographic checksum verification mismatch: expected ${expectedSha256.trim()} but received asset computed ${sha256}`) as any;
            mismatchErr.statusCode = 409;
            throw mismatchErr;
          }
        }

        return {
          buffer,
          contentType,
          filename: cleanFilename,
          sha256,
          sizeBytes: buffer.length,
          isVerified
        };
      } catch (err: any) {
        lastError = err;
      }
    }

    throw lastError || new Error('Failed to retrieve asset from upstream source');
  }

  /**
   * Streams remote asset directly through to client response.
   */
  public async getUpstreamStream(targetUrl: string, fallbackUrl?: string, method = 'GET'): Promise<Response> {
    const candidateUrls = [
      targetUrl,
      this.getOptimizedStreamUrl(targetUrl),
      fallbackUrl
    ].filter((u, i, arr): u is string => Boolean(u && isSafePublicUrl(u) && arr.indexOf(u) === i));

    let lastError: any = null;

    for (const url of candidateUrls) {
      try {
        const timeoutMs = APP_CONFIG.download.timeoutMs;
        const upstream = await safeFetch(url, {
          method,
          headers: UPSTREAM_HEADERS,
          signal: AbortSignal.timeout(timeoutMs)
        });

        if (upstream.ok) {
          const rawContentType = upstream.headers.get('content-type') || '';
          if (rawContentType.toLowerCase().includes('text/html') || rawContentType.toLowerCase().includes('application/xhtml+xml')) {
            const htmlErr = new Error('Upstream source returned an HTML document instead of binary media asset') as any;
            htmlErr.statusCode = 415;
            lastError = htmlErr;
            continue;
          }

          const contentLengthHeader = upstream.headers.get('content-length');
          if (contentLengthHeader) {
            const expectedBytes = parseInt(contentLengthHeader, 10);
            if (!isNaN(expectedBytes) && expectedBytes > APP_CONFIG.download.maxSizeBytes) {
              const err = new Error('File size exceeds maximum permitted download limit') as any;
              err.statusCode = 413;
              throw err;
            }
          }
          return upstream;
        }
        lastError = new Error(`Upstream source returned HTTP ${upstream.status}`);
      } catch (err: any) {
        lastError = err;
      }
    }

    throw lastError || new Error('Upstream source was unreachable');
  }
}

export const downloadService = new DownloadService();
