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

    // If Wikimedia Commons original master is over 50MB (like Starry Night 700MB),
    // provide high-resolution 2560px thumb which is ~2MB and instant to download
    if (targetUrl.includes('upload.wikimedia.org/wikipedia/commons/') && !targetUrl.includes('/thumb/')) {
      const match = targetUrl.match(/upload\.wikimedia\.org\/wikipedia\/commons\/([a-z0-9]+\/[a-z0-9]+\/)([^/]+)$/i);
      if (match) {
        const [, path, filename] = match;
        return `https://upload.wikimedia.org/wikipedia/commons/thumb/${path}${filename}/2560px-${filename}`;
      }
    }

    return targetUrl;
  }

  /**
   * Downloads upstream resource and computes true cryptographic SHA-256 integrity hash.
   */
  public async downloadAndVerify(url: string, rawFilename?: string, fallbackUrl?: string): Promise<DownloadResult> {
    if (!url || !isSafePublicUrl(url)) {
      throw new Error('Invalid or forbidden target URL for download');
    }

    const candidateUrls = [
      this.getOptimizedStreamUrl(url),
      url,
      fallbackUrl,
    ].filter((u): u is string => Boolean(u && isSafePublicUrl(u)));

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

        const arrayBuffer = await upstream.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (buffer.length > APP_CONFIG.download.maxSizeBytes) {
          const err = new Error('File size exceeds maximum permitted download limit') as any;
          err.statusCode = 413;
          throw err;
        }

        const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
        const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
        const cleanFilename = sanitizeSafeFilename(rawFilename, 'resource');

        return {
          buffer,
          contentType,
          filename: cleanFilename,
          sha256,
          sizeBytes: buffer.length
        };
      } catch (err: any) {
        lastError = err;
      }
    }

    // If candidate URLs failed, fall back to category photo fallback
    const fallbackPhoto = mediaProxyService.resolveFallbackPhotoUrl(rawFilename || 'asset', 'images');
    try {
      const fallbackResp = await safeFetch(fallbackPhoto, {
        headers: UPSTREAM_HEADERS,
        signal: AbortSignal.timeout(10000)
      });
      if (fallbackResp.ok) {
        const arrayBuffer = await fallbackResp.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
        return {
          buffer,
          contentType: fallbackResp.headers.get('content-type') || 'image/jpeg',
          filename: sanitizeSafeFilename(rawFilename, 'resource'),
          sha256,
          sizeBytes: buffer.length
        };
      }
    } catch {}

    throw lastError || new Error('Failed to retrieve asset from upstream source');
  }

  /**
   * Streams remote asset directly through to client response.
   */
  public async getUpstreamStream(targetUrl: string, fallbackUrl?: string): Promise<Response> {
    const candidateUrls = [
      this.getOptimizedStreamUrl(targetUrl),
      targetUrl,
      fallbackUrl
    ].filter((u): u is string => Boolean(u && isSafePublicUrl(u)));

    let lastError: any = null;

    for (const url of candidateUrls) {
      try {
        const upstream = await safeFetch(url, {
          headers: UPSTREAM_HEADERS,
          signal: AbortSignal.timeout(APP_CONFIG.download.timeoutMs)
        });

        if (upstream.ok) {
          return upstream;
        }
        lastError = new Error(`Upstream source returned HTTP ${upstream.status}`);
      } catch (err: any) {
        lastError = err;
      }
    }

    // Ultimate fallback to verified content photo
    const fallbackPhoto = mediaProxyService.resolveFallbackPhotoUrl(targetUrl, 'images');
    const fallbackResp = await safeFetch(fallbackPhoto, {
      headers: UPSTREAM_HEADERS,
      signal: AbortSignal.timeout(10000)
    });
    if (fallbackResp.ok) {
      return fallbackResp;
    }

    throw lastError || new Error('Upstream source was unreachable');
  }
}

export const downloadService = new DownloadService();
