import crypto from 'crypto';
import { APP_CONFIG } from '../config/app_config';
import { isSafePublicUrl, safeFetch } from '../utils/security';

export interface CachedMediaEntry {
  data: Buffer;
  contentType: string;
  etag: string;
  timestamp: number;
}

export class MediaProxyService {
  private mediaProxyCache = new Map<string, CachedMediaEntry>();
  private inFlightFetches = new Map<string, Promise<CachedMediaEntry | null>>();

  private readonly FALLBACK_CONTENT_PHOTOS: Record<string, string[]> = {
    textiles: [
      'https://images.unsplash.com/photo-1582562124811-c09040d0a901?w=800&auto=format&fit=crop&q=80',
      'https://openaccess-cdn.clevelandart.org/2005.5.5/2005.5.5_web.jpg',
      'https://images.metmuseum.org/CRDImages/ep/web-large/DP159770.jpg',
      'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80'
    ],
    art: [
      'https://openaccess-cdn.clevelandart.org/2005.5.5/2005.5.5_web.jpg',
      'https://images.metmuseum.org/CRDImages/ep/web-large/DP159770.jpg',
      'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=800&auto=format&fit=crop&q=80',
      'https://upload.wikimedia.org/wikipedia/commons/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg'
    ],
    nature: [
      'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80'
    ],
    ocean: [
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&auto=format&fit=crop&q=80'
    ],
    space: [
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=800&auto=format&fit=crop&q=80'
    ],
    technology: [
      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80'
    ],
    books: [
      'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=800&auto=format&fit=crop&q=80'
    ]
  };

  /**
   * Resolves a category- and subject-matched verified fallback photograph URL.
   */
  public resolveFallbackPhotoUrl(title: string, category: string): string {
    const q = (title || '').toLowerCase();
    if (q.includes('tassel') || q.includes('textile') || q.includes('fabric') || q.includes('craft')) {
      const list = this.FALLBACK_CONTENT_PHOTOS.textiles;
      return list[Math.abs(title.length) % list.length];
    }
    if (q.includes('ocean') || q.includes('sea') || q.includes('marine')) {
      const list = this.FALLBACK_CONTENT_PHOTOS.ocean;
      return list[Math.abs(title.length) % list.length];
    }
    if (q.includes('space') || q.includes('galaxy') || q.includes('planet') || q.includes('nasa')) {
      const list = this.FALLBACK_CONTENT_PHOTOS.space;
      return list[Math.abs(title.length) % list.length];
    }
    const cat = (category || 'images').toLowerCase();
    const list = this.FALLBACK_CONTENT_PHOTOS[cat] || (cat === 'art' ? this.FALLBACK_CONTENT_PHOTOS.art : this.FALLBACK_CONTENT_PHOTOS.nature);
    return list[Math.abs(title.length) % list.length];
  }

  /**
   * Fetches an image from upstream or memory cache, with in-flight request coalescing.
   */
  public async fetchAndCacheMedia(targetUrl: string): Promise<CachedMediaEntry | null> {
    if (!isSafePublicUrl(targetUrl)) {
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
