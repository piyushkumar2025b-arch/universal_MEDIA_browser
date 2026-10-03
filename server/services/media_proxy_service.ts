import crypto from 'crypto';
import { APP_CONFIG } from '../config/app_config';
import { isSafePublicUrl, isSafePublicUrlAsync, safeFetch } from '../utils/security';

export interface CachedMediaEntry {
  data: Buffer;
  contentType: string;
  etag: string;
  timestamp: number;
}

export class MediaProxyService {
  private mediaProxyCache = new Map<string, CachedMediaEntry>();
  private inFlightFetches = new Map<string, Promise<CachedMediaEntry | null>>();

  /**
   * Fetches an image from upstream or memory cache, with in-flight request coalescing.
   */
  public async fetchAndCacheMedia(targetUrl: string): Promise<CachedMediaEntry | null> {
    if (!targetUrl || !(await isSafePublicUrlAsync(targetUrl))) {
      return null;
    }

    const cached = this.mediaProxyCache.get(targetUrl);
    if (cached) return cached;

    // Deduplicate identical concurrent requests (Thundering Herd protection)
    if (this.inFlightFetches.has(targetUrl)) {
      return this.inFlightFetches.get(targetUrl)!;
    }

    const fetchPromise = (async () => {
      try {
        const timeoutMs = targetUrl.includes('wikimedia.org') || targetUrl.includes('archive.org')
          ? APP_CONFIG.mediaProxy.wikimediaTimeoutMs
          : APP_CONFIG.mediaProxy.upstreamTimeoutMs;

        const isWikimedia = targetUrl.includes('wikimedia.org');
        const headers: Record<string, string> = {
          'User-Agent': isWikimedia
            ? 'URMIL-Universal-Browser/1.0 (https://ai.studio; dandakshina9@gmail.com)'
            : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,audio/*,video/*,*/*;q=0.8'
        };

        if (isWikimedia) {
          headers['Referer'] = 'https://commons.wikimedia.org/';
        } else if (targetUrl.includes('archive.org')) {
          headers['Referer'] = 'https://archive.org/';
        }

        let response = await safeFetch(targetUrl, {
          headers,
          signal: AbortSignal.timeout(timeoutMs)
        });

        // If upstream rejected with 403 or 401, retry once with alternate clean browser header
        if (!response.ok && (response.status === 403 || response.status === 401)) {
          response = await safeFetch(targetUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
              'Accept': '*/*'
            },
            signal: AbortSignal.timeout(timeoutMs)
          });
        }

        if (!response.ok) return null;

        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const arrayBuffer = await response.arrayBuffer();
        const data = Buffer.from(arrayBuffer);
        const etag = `"${crypto.createHash('md5').update(data).digest('hex')}"`;

        const entry: CachedMediaEntry = {
          data,
          contentType,
          etag,
          timestamp: Date.now()
        };

        if (this.mediaProxyCache.size >= APP_CONFIG.mediaProxy.maxEntries) {
          const firstKey = this.mediaProxyCache.keys().next().value;
          if (firstKey) this.mediaProxyCache.delete(firstKey);
        }
        this.mediaProxyCache.set(targetUrl, entry);
        return entry;
      } catch {
        return null;
      } finally {
        this.inFlightFetches.delete(targetUrl);
      }
    })();

    this.inFlightFetches.set(targetUrl, fetchPromise);
    return fetchPromise;
  }

  public getCachedEntry(targetUrl: string): CachedMediaEntry | undefined {
    return this.mediaProxyCache.get(targetUrl);
  }
}

export const mediaProxyService = new MediaProxyService();
