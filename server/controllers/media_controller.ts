import { Request, Response } from 'express';
import { mediaProxyService } from '../services/media_proxy_service';
import { APP_CONFIG } from '../config/app_config';
import { isSafePublicUrl, safeFetch } from '../utils/security';

export class MediaController {
  /**
   * GET /api/image-proxy
   * High-speed proxy with ETag validation, conditional HTTP 304,
   * immutable browser caching, and verified content photo fallback.
   */
  public async proxyImage(req: Request, res: Response): Promise<void> {
    const targetUrl = req.query.url as string;
    const queryTitle = (req.query.title as string) || '';
    const queryCategory = (req.query.category as string) || 'images';

    if (!targetUrl || !isSafePublicUrl(targetUrl)) {
      const fallbackUrl = mediaProxyService.resolveFallbackPhotoUrl(queryTitle, queryCategory);
      const fallbackResult = await mediaProxyService.fetchAndCacheMedia(fallbackUrl);
      if (fallbackResult) {
        res.setHeader('Content-Type', fallbackResult.contentType);
        res.setHeader('Cache-Control', `public, max-age=${APP_CONFIG.mediaProxy.browserCacheSeconds}, immutable`);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.send(fallbackResult.data);
        return;
      }
      res.status(400).send('Invalid or forbidden image URL');
      return;
    }

    const clientEtag = req.headers['if-none-match'];
    const cached = mediaProxyService.getCachedEntry(targetUrl);
    if (cached && clientEtag === cached.etag) {
      res.status(304).end();
      return;
    }

    let result = await mediaProxyService.fetchAndCacheMedia(targetUrl);

    // If upstream blocked request or returned error, fallback to verified content photograph
    if (!result) {
      const fallbackUrl = mediaProxyService.resolveFallbackPhotoUrl(queryTitle || targetUrl, queryCategory);
      result = await mediaProxyService.fetchAndCacheMedia(fallbackUrl);
    }

    if (!result) {
      res.status(502).send('Failed to proxy media asset');
      return;
    }

    if (clientEtag === result.etag) {
      res.status(304).end();
      return;
    }

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Length', result.data.length.toString());
    res.setHeader('ETag', result.etag);
    res.setHeader('Cache-Control', `public, max-age=${APP_CONFIG.mediaProxy.browserCacheSeconds}, stale-while-revalidate=86400, immutable`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(result.data);
  }

  /**
   * GET /api/v1/content-photo
   */
  public async getContentPhoto(req: Request, res: Response): Promise<void> {
    const query = (req.query.q as string) || (req.query.title as string) || '';
    const category = (req.query.category as string) || 'images';
    const photoUrl = mediaProxyService.resolveFallbackPhotoUrl(query, category);

    const media = await mediaProxyService.fetchAndCacheMedia(photoUrl);
    if (media) {
      res.setHeader('Content-Type', media.contentType);
      res.setHeader('Cache-Control', `public, max-age=${APP_CONFIG.mediaProxy.browserCacheSeconds}, immutable`);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(media.data);
      return;
    }

    res.redirect(photoUrl);
  }

  /**
   * GET /api/v1/audio-stream
   * Universal audio streaming proxy and Archive.org resolver.
   * Eliminates browser Mixed Content (HTTP on HTTPS) blocking,
   * handles upstream Referer constraints (e.g. ccMixter), and
   * resolves dynamic Internet Archive track streams.
   */
  private static iaAudioCache = new Map<string, string>();
  private static MAX_IA_CACHE = 1000;

  public async proxyAudioStream(req: Request, res: Response): Promise<void> {
    const rawIaId = req.query.iaId as string | undefined;
    // Strictly validate iaId format to prevent injection or parameter tampering
    const iaId = rawIaId && /^[a-zA-Z0-9._-]{1,100}$/.test(rawIaId) ? rawIaId : undefined;
    let targetUrl = (req.query.url as string) || '';

    // 1. Resolve Internet Archive dynamic audio file if safe iaId passed
    if (iaId) {
      if (MediaController.iaAudioCache.has(iaId)) {
        targetUrl = MediaController.iaAudioCache.get(iaId)!;
      } else {
        try {
          const metaRes = await safeFetch(`https://archive.org/metadata/${encodeURIComponent(iaId)}/files`, {
            signal: AbortSignal.timeout(5000)
          });
          if (metaRes.ok) {
            const data: any = await metaRes.json();
            const files = Array.isArray(data.result) ? data.result : [];
            const audioFile = files.find((f: any) =>
              typeof f.name === 'string' &&
              (f.name.toLowerCase().endsWith('.mp3') || f.name.toLowerCase().endsWith('.m4a') || f.name.toLowerCase().endsWith('.ogg') || f.name.toLowerCase().endsWith('.flac') || f.name.toLowerCase().endsWith('.wav')) &&
              !f.name.includes('_thumb') &&
              !f.name.includes('_spectrogram')
            ) || files.find((f: any) => typeof f.format === 'string' && /mp3|audio|ogg|flac|wav/i.test(f.format) && typeof f.name === 'string');
            if (audioFile?.name) {
              targetUrl = `https://archive.org/download/${encodeURIComponent(iaId)}/${encodeURIComponent(audioFile.name)}`;
              if (MediaController.iaAudioCache.size >= MediaController.MAX_IA_CACHE) {
                const oldest = MediaController.iaAudioCache.keys().next().value;
                if (oldest) MediaController.iaAudioCache.delete(oldest);
              }
              MediaController.iaAudioCache.set(iaId, targetUrl);
            }
          }
        } catch {
          // fallback to direct download URL or embed
        }
      }

      if (!targetUrl) {
        // Fallback to official archive embed player redirect
        return res.redirect(`https://archive.org/embed/${encodeURIComponent(iaId)}`);
      }
    }

    if (!targetUrl || !isSafePublicUrl(targetUrl)) {
      res.status(400).send('Missing, invalid, or forbidden audio URL');
      return;
    }

    try {
      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'audio/*,*/*;q=0.9'
      };

      // Upstream anti-leech referer fixes
      if (targetUrl.includes('ccmixter.org')) {
        headers['Referer'] = 'http://ccmixter.org/';
      } else if (targetUrl.includes('archive.org')) {
        headers['Referer'] = 'https://archive.org/';
      }

      // Forward client Range header for seeking/scrubbing in HTML5 audio
      if (req.headers.range) {
        headers['Range'] = req.headers.range;
      }

      const abortController = new AbortController();
      const connTimer = setTimeout(() => {
        abortController.abort(new Error('Audio stream connection timed out'));
      }, 15000);

      const upstreamRes = await safeFetch(targetUrl, {
        headers,
        method: req.method === 'HEAD' ? 'HEAD' : 'GET',
        signal: abortController.signal
      });

      // Clear connection timer as soon as response headers arrive
      clearTimeout(connTimer);

      if (!upstreamRes.ok && upstreamRes.status !== 206) {
        // If upstream proxy failed, redirect directly to the target URL so client browser can stream directly
        if (targetUrl) {
          return res.redirect(targetUrl);
        }
        if (iaId) {
          return res.redirect(`https://archive.org/embed/${encodeURIComponent(iaId)}`);
        }
        res.status(upstreamRes.status).send(`Upstream audio provider returned ${upstreamRes.status}`);
        return;
      }

      const contentType = upstreamRes.headers.get('content-type') || 'audio/mpeg';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Accept-Ranges', 'bytes');

      const contentLength = upstreamRes.headers.get('content-length');
      if (contentLength) res.setHeader('Content-Length', contentLength);

      const contentRange = upstreamRes.headers.get('content-range');
      if (contentRange) res.setHeader('Content-Range', contentRange);

      res.status(upstreamRes.status);

      if (req.method === 'HEAD') {
        res.end();
        return;
      }

      if (upstreamRes.body) {
        const reader = upstreamRes.body.getReader();
        let isClosed = false;

        req.on('close', () => {
          isClosed = true;
          abortController.abort();
          try {
            reader.cancel().catch(() => {});
          } catch {}
        });

        const pump = async () => {
          try {
            while (!isClosed) {
              const { done, value } = await reader.read();
              if (done || isClosed) break;
              if (value) res.write(value);
            }
          } finally {
            if (!res.writableEnded) {
              res.end();
            }
          }
        };
        pump().catch(() => {
          if (!res.writableEnded) res.end();
        });
      } else {
        if (!res.writableEnded) res.end();
      }
    } catch (err: any) {
      if (targetUrl) {
        return res.redirect(targetUrl);
      }
      if (iaId) {
        return res.redirect(`https://archive.org/embed/${encodeURIComponent(iaId)}`);
      }
      res.status(502).send(`Failed to stream audio: ${err.message}`);
    }
  }

  /**
   * GET /api/v1/video-stream
   * High-throughput video proxy supporting byte-range streaming (HTTP 206 Partial Content),
   * CORS headers, upstream referer resolution, and direct video playback without mixed-content blocking.
   */
  private static iaVideoCache = new Map<string, string>();

  public async proxyVideoStream(req: Request, res: Response): Promise<void> {
    const rawIaId = req.query.iaId as string | undefined;
    const iaId = rawIaId && /^[a-zA-Z0-9._-]{1,100}$/.test(rawIaId) ? rawIaId : undefined;
    let targetUrl = (req.query.url as string) || '';

    // 1. Resolve Internet Archive dynamic video file if safe iaId passed
    if (iaId) {
      if (MediaController.iaVideoCache.has(iaId)) {
        targetUrl = MediaController.iaVideoCache.get(iaId)!;
      } else {
        try {
          const metaRes = await safeFetch(`https://archive.org/metadata/${encodeURIComponent(iaId)}/files`, {
            signal: AbortSignal.timeout(5000)
          });
          if (metaRes.ok) {
            const data: any = await metaRes.json();
            const files = Array.isArray(data.result) ? data.result : [];
            const videoFile = files.find((f: any) =>
              typeof f.name === 'string' &&
              f.name.toLowerCase().endsWith('.mp4') &&
              !f.name.includes('_thumb') &&
              !f.name.includes('_spectrogram')
            ) || files.find((f: any) =>
              typeof f.name === 'string' &&
              f.name.toLowerCase().endsWith('.webm') &&
              !f.name.includes('_thumb')
            ) || files.find((f: any) =>
              typeof f.name === 'string' &&
              (f.name.toLowerCase().endsWith('.ogv') || f.name.toLowerCase().endsWith('.mkv')) &&
              !f.name.includes('_thumb')
            ) || files.find((f: any) =>
              typeof f.format === 'string' &&
              /mp4|h\.264|video/i.test(f.format) &&
              typeof f.name === 'string'
            );
            if (videoFile?.name) {
              targetUrl = `https://archive.org/download/${encodeURIComponent(iaId)}/${encodeURIComponent(videoFile.name)}`;
              if (MediaController.iaVideoCache.size >= MediaController.MAX_IA_CACHE) {
                const oldest = MediaController.iaVideoCache.keys().next().value;
                if (oldest) MediaController.iaVideoCache.delete(oldest);
              }
              MediaController.iaVideoCache.set(iaId, targetUrl);
            }
          }
        } catch {
          // fallback to direct embed
        }
      }

      if (!targetUrl) {
        return res.redirect(`https://archive.org/embed/${encodeURIComponent(iaId)}`);
      }
    }

    if (!targetUrl || !isSafePublicUrl(targetUrl)) {
      res.status(400).send('Missing, invalid, or forbidden video URL');
      return;
    }

    try {
      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'video/*,*/*;q=0.9'
      };

      if (targetUrl.includes('wikimedia.org')) {
        headers['Referer'] = 'https://commons.wikimedia.org/';
      } else if (targetUrl.includes('archive.org')) {
        headers['Referer'] = 'https://archive.org/';
      } else if (targetUrl.includes('pexels.com')) {
        headers['Referer'] = 'https://www.pexels.com/';
      }

      if (req.headers.range) {
        headers['Range'] = req.headers.range;
      }

      const abortController = new AbortController();
      const connTimer = setTimeout(() => {
        abortController.abort(new Error('Video stream connection timed out'));
      }, 15000);

      const upstreamRes = await safeFetch(targetUrl, {
        headers,
        method: req.method === 'HEAD' ? 'HEAD' : 'GET',
        signal: abortController.signal
      });

      // Clear connection timer as soon as response headers arrive
      clearTimeout(connTimer);

      if (!upstreamRes.ok && upstreamRes.status !== 206) {
        if (iaId) {
          return res.redirect(`https://archive.org/embed/${encodeURIComponent(iaId)}`);
        }
        res.status(upstreamRes.status).send(`Upstream video provider returned ${upstreamRes.status}`);
        return;
      }

      const contentType = upstreamRes.headers.get('content-type') || 'video/mp4';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=86400');

      const contentLength = upstreamRes.headers.get('content-length');
      if (contentLength) res.setHeader('Content-Length', contentLength);

      const contentRange = upstreamRes.headers.get('content-range');
      if (contentRange) res.setHeader('Content-Range', contentRange);

      res.status(upstreamRes.status);

      if (req.method === 'HEAD') {
        res.end();
        return;
      }

      if (upstreamRes.body) {
        const reader = upstreamRes.body.getReader();
        let isClosed = false;

        req.on('close', () => {
          isClosed = true;
          abortController.abort();
          try {
            reader.cancel().catch(() => {});
          } catch {}
        });

        const pump = async () => {
          try {
            while (!isClosed) {
              const { done, value } = await reader.read();
              if (done || isClosed) break;
              if (value) res.write(value);
            }
          } finally {
            if (!res.writableEnded) {
              res.end();
            }
          }
        };
        pump().catch(() => {
          if (!res.writableEnded) res.end();
        });
      } else {
        if (!res.writableEnded) res.end();
      }
    } catch (err: any) {
      if (iaId) {
        return res.redirect(`https://archive.org/embed/${encodeURIComponent(iaId)}`);
      }
      res.status(502).send(`Failed to stream video: ${err.message}`);
    }
  }

  /**
   * GET & HEAD /api/v1/media-tunnel
   * Universal Media Bypass & Streaming Relay Tunnel.
   * Eliminates CORS blocking, browser mixed-content (HTTP on HTTPS),
   * hotlink/anti-leech referrer restrictions, and CDN geographic/IP bans.
   * Features:
   * 1. Multi-tier User-Agent rotation (Chrome, Safari macOS, iOS, Firefox)
   * 2. Upstream Referer spoofing & domain matching (Wikimedia, Archive, ccMixter, Museums, Pexels)
   * 3. HTTP 206 Partial Content byte-range forwarding for audio/video scrubbing
   * 4. Auto MIME-type sniffing & correction
   * 5. Unrestricted CORS headers (Access-Control-Allow-Origin: *)
   * 6. High-throughput in-flight streaming pipe with disconnect cleanup
   */
  public async universalMediaTunnel(req: Request, res: Response): Promise<void> {
    // Handle CORS preflight
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Accept, Content-Type, User-Agent, If-None-Match');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges, Content-Type, ETag, X-Bypass-Tunnel-Status');
    res.setHeader('X-Bypass-Tunnel-Status', 'ACTIVE_RELAY');

    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    const rawUrl = (req.query.url as string) || '';
    const mediaType = (req.query.type as string) || 'auto';
    const queryTitle = (req.query.title as string) || '';
    const queryCategory = (req.query.category as string) || 'images';
    const rawIaId = req.query.iaId as string | undefined;
    const iaId = rawIaId && /^[a-zA-Z0-9._-]{1,100}$/.test(rawIaId) ? rawIaId : undefined;

    let targetUrl = rawUrl;

    // Resolve Internet Archive dynamic media file if iaId provided
    if (iaId && (!targetUrl || targetUrl.includes('archive.org/details/'))) {
      if (mediaType === 'audio' && MediaController.iaAudioCache.has(iaId)) {
        targetUrl = MediaController.iaAudioCache.get(iaId)!;
      } else if (mediaType === 'video' && MediaController.iaVideoCache.has(iaId)) {
        targetUrl = MediaController.iaVideoCache.get(iaId)!;
      } else {
        try {
          const metaRes = await safeFetch(`https://archive.org/metadata/${encodeURIComponent(iaId)}/files`, {
            signal: AbortSignal.timeout(5000)
          });
          if (metaRes.ok) {
            const data: any = await metaRes.json();
            const files = Array.isArray(data.result) ? data.result : [];
            if (mediaType === 'video') {
              const vf = files.find((f: any) =>
                typeof f.name === 'string' &&
                (f.name.endsWith('.mp4') || f.name.endsWith('.webm') || f.name.endsWith('.ogv')) &&
                !f.name.includes('_thumb')
              );
              if (vf?.name) {
                targetUrl = `https://archive.org/download/${encodeURIComponent(iaId)}/${encodeURIComponent(vf.name)}`;
                MediaController.iaVideoCache.set(iaId, targetUrl);
              }
            } else {
              const af = files.find((f: any) =>
                typeof f.name === 'string' &&
                (f.name.endsWith('.mp3') || f.name.endsWith('.m4a') || f.name.endsWith('.ogg') || f.name.endsWith('.flac') || f.name.endsWith('.wav')) &&
                !f.name.includes('_thumb') && !f.name.includes('_spectrogram')
              );
              if (af?.name) {
                targetUrl = `https://archive.org/download/${encodeURIComponent(iaId)}/${encodeURIComponent(af.name)}`;
                MediaController.iaAudioCache.set(iaId, targetUrl);
              }
            }
          }
        } catch {
          // continue with targetUrl
        }
      }
    }

    if (!targetUrl || !isSafePublicUrl(targetUrl)) {
      if (mediaType === 'image') {
        const fallbackUrl = mediaProxyService.resolveFallbackPhotoUrl(queryTitle, queryCategory);
        const fallbackResult = await mediaProxyService.fetchAndCacheMedia(fallbackUrl);
        if (fallbackResult) {
          res.setHeader('Content-Type', fallbackResult.contentType);
          res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
          res.send(fallbackResult.data);
          return;
        }
      }
      res.status(400).send('Invalid or restricted target URL');
      return;
    }

    // Determine domain-specific spoofed Referer
    let spoofedReferer: string | undefined;
    try {
      const parsed = new URL(targetUrl);
      const host = parsed.hostname.toLowerCase();
      if (host.includes('wikimedia.org') || host.includes('wikipedia.org')) spoofedReferer = 'https://commons.wikimedia.org/';
      else if (host.includes('archive.org')) spoofedReferer = 'https://archive.org/';
      else if (host.includes('ccmixter.org')) spoofedReferer = 'http://ccmixter.org/';
      else if (host.includes('pexels.com')) spoofedReferer = 'https://www.pexels.com/';
      else if (host.includes('unsplash.com')) spoofedReferer = 'https://unsplash.com/';
      else if (host.includes('flickr.com') || host.includes('staticflickr.com')) spoofedReferer = 'https://www.flickr.com/';
      else if (host.includes('freemusicarchive.org')) spoofedReferer = 'https://freemusicarchive.org/';
      else if (host.includes('radio-browser.info')) spoofedReferer = 'https://www.radio-browser.info/';
      else if (host.includes('clevelandart.org')) spoofedReferer = 'https://www.clevelandart.org/';
      else if (host.includes('metmuseum.org')) spoofedReferer = 'https://www.metmuseum.org/';
      else if (host.includes('artic.edu')) spoofedReferer = 'https://www.artic.edu/';
      else if (host.includes('polyhaven.com')) spoofedReferer = 'https://polyhaven.com/';
      else if (host.includes('gutenberg.org')) spoofedReferer = 'https://www.gutenberg.org/';
      else spoofedReferer = `${parsed.protocol}//${parsed.host}/`;
    } catch {
      spoofedReferer = undefined;
    }

    // User-Agent tier rotation pool
    const USER_AGENTS = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0'
    ];

    let upstreamRes: Response | any = null;
    let attempt = 0;

    let activeAbortController: AbortController | null = null;

    while (attempt < USER_AGENTS.length) {
      const ua = USER_AGENTS[attempt];
      const headers: Record<string, string> = {
        'User-Agent': ua,
        'Accept': mediaType === 'video'
          ? 'video/*,*/*;q=0.9'
          : mediaType === 'audio'
          ? 'audio/*,*/*;q=0.9'
          : mediaType === 'image'
          ? 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
          : '*/*'
      };

      if (spoofedReferer) {
        headers['Referer'] = spoofedReferer;
      }

      if (req.headers.range) {
        headers['Range'] = req.headers.range;
      }

      const abortController = new AbortController();
      const timeoutMs = mediaType === 'video' || mediaType === 'audio' ? 15000 : 8000;
      const connTimer = setTimeout(() => {
        abortController.abort(new Error('Tunnel connection timed out'));
      }, timeoutMs);

      try {
        upstreamRes = await safeFetch(targetUrl, {
          headers,
          method: req.method === 'HEAD' ? 'HEAD' : 'GET',
          signal: abortController.signal
        });

        clearTimeout(connTimer);
        activeAbortController = abortController;

        if (upstreamRes.ok || upstreamRes.status === 206) {
          break; // Successful connection through bypass tunnel
        }

        // If upstream refused with 403, 401, or 429, rotate User-Agent and retry
        if (upstreamRes.status === 403 || upstreamRes.status === 401 || upstreamRes.status === 429) {
          attempt++;
          continue;
        }

        break;
      } catch {
        clearTimeout(connTimer);
        attempt++;
      }
    }

    if (!upstreamRes || (!upstreamRes.ok && upstreamRes.status !== 206)) {
      // Fallback strategies based on media type
      if (mediaType === 'image') {
        const fallbackUrl = mediaProxyService.resolveFallbackPhotoUrl(queryTitle || targetUrl, queryCategory);
        const fallbackResult = await mediaProxyService.fetchAndCacheMedia(fallbackUrl);
        if (fallbackResult) {
          res.setHeader('Content-Type', fallbackResult.contentType);
          res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
          res.send(fallbackResult.data);
          return;
        }
      }

      if (targetUrl) {
        return res.redirect(targetUrl);
      }
      res.status(502).send('Upstream media bypass tunnel could not retrieve asset');
      return;
    }

    // Forward upstream status and headers
    const contentType = upstreamRes.headers.get('content-type') || 
      (mediaType === 'video' ? 'video/mp4' : mediaType === 'audio' ? 'audio/mpeg' : 'application/octet-stream');

    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=86400');

    const contentLength = upstreamRes.headers.get('content-length');
    if (contentLength) res.setHeader('Content-Length', contentLength);

    const contentRange = upstreamRes.headers.get('content-range');
    if (contentRange) res.setHeader('Content-Range', contentRange);

    const etag = upstreamRes.headers.get('etag');
    if (etag) res.setHeader('ETag', etag);

    res.status(upstreamRes.status);

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    // Stream chunks directly with abort safety
    if (upstreamRes.body) {
      const reader = upstreamRes.body.getReader();
      let isClosed = false;

      req.on('close', () => {
        isClosed = true;
        if (activeAbortController) {
          activeAbortController.abort();
        }
        try {
          reader.cancel().catch(() => {});
        } catch {}
      });

      const pump = async () => {
        try {
          while (!isClosed) {
            const { done, value } = await reader.read();
            if (done || isClosed) break;
            if (value) res.write(value);
          }
        } finally {
          if (!res.writableEnded) {
            res.end();
          }
        }
      };
      pump().catch(() => {
        if (!res.writableEnded) res.end();
      });
    } else {
      if (!res.writableEnded) res.end();
    }
  }

  /**
   * GET /api/v1/video-embed
   * Resilient video embed handler providing multi-mirror playback
   * (YouTube NoCookie, Invidious, Piped, direct link fallback).
   */
  public renderVideoEmbed(req: Request, res: Response): void {
    const videoId = req.query.id as string;
    const provider = (req.query.provider as string) || 'youtube';
    const mirror = (req.query.mirror as string) || 'nocookie';
    const title = (req.query.title as string) || 'Video Player';

    if (!videoId || !/^[a-zA-Z0-9_-]{3,64}$/.test(videoId)) {
      res.status(400).send('Invalid video identifier');
      return;
    }

    let embedSrc = '';
    if (provider === 'youtube') {
      if (mirror === 'invidious') {
        embedSrc = `https://yewtu.be/embed/${encodeURIComponent(videoId)}`;
      } else if (mirror === 'piped') {
        embedSrc = `https://piped.video/embed/${encodeURIComponent(videoId)}`;
      } else {
        embedSrc = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?autoplay=1&enablejsapi=1&rel=0`;
      }
    } else if (provider === 'dailymotion') {
      embedSrc = `https://geo.dailymotion.com/player.html?video=${encodeURIComponent(videoId)}`;
    } else if (provider === 'vimeo') {
      embedSrc = `https://player.vimeo.com/video/${encodeURIComponent(videoId)}`;
    } else if (provider === 'archive') {
      embedSrc = `https://archive.org/embed/${encodeURIComponent(videoId)}`;
    } else {
      embedSrc = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?autoplay=1&enablejsapi=1&rel=0`;
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body, html { width: 100%; height: 100%; background: #000; overflow: hidden; display: flex; flex-direction: column; }
    .embed-container { flex: 1; width: 100%; height: 100%; position: relative; }
    iframe { width: 100%; height: 100%; border: none; }
  </style>
</head>
<body>
  <div class="embed-container">
    <iframe
      src="${embedSrc}"
      title="${title}"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      referrerpolicy="no-referrer-when-downgrade"
      allowfullscreen>
    </iframe>
  </div>
</body>
</html>`);
  }
}

export const mediaController = new MediaController();
