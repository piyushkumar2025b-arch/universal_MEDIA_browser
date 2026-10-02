import { Request, Response } from 'express';
import { Readable } from 'stream';
import { downloadService } from '../services/download_service';
import { isSafePublicUrl, isSafePublicUrlAsync, sanitizeSafeFilename } from '../utils/security';
import { APP_CONFIG } from '../config/app_config';

export class DownloadController {
  /**
   * POST /api/v1/resources/:id/download
   * Real Asset Download with SHA-256 Checksum Verification
   */
  public async downloadResource(req: Request, res: Response): Promise<void> {
    const { url, filename, fallbackUrl } = req.body || {};
    if (!url || typeof url !== 'string' || !(await isSafePublicUrlAsync(url))) {
      res.status(400).json({ error: 'Missing or forbidden target url in download request' });
      return;
    }

    try {
      const cleanFilename = sanitizeSafeFilename(filename, 'resource');
      const result = await downloadService.downloadAndVerify(url, cleanFilename, fallbackUrl);

      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Content-Length', result.sizeBytes.toString());
      res.setHeader('X-URMIL-SHA256', result.sha256);
      res.setHeader('X-URMIL-Integrity-Verified', 'true');

      res.send(result.buffer);
    } catch (err: any) {
      console.error('DownloadController Error in downloadResource:', err);
      const status = err.statusCode || 502;
      res.status(status).json({
        error: 'Failed to stream asset from upstream source',
        message: err.message
      });
    }
  }

  /**
   * GET /api/download-proxy
   * Direct streaming proxy for large downloads with byte counting and truncation detection
   */
  public async proxyDownload(req: Request, res: Response): Promise<void> {
    const targetUrl = req.query.url as string;
    const requestedFilename = (req.query.filename as string) || 'download';
    const fallbackUrl = req.query.fallback as string;

    if (!targetUrl || !(await isSafePublicUrlAsync(targetUrl))) {
      res.status(400).json({ error: 'Missing or forbidden target url parameter' });
      return;
    }

    try {
      const upstream = await downloadService.getUpstreamStream(targetUrl, fallbackUrl);
      const rawContentType = upstream.headers.get('content-type') || 'application/octet-stream';
      const lowerContentType = rawContentType.toLowerCase();

      // BUG-009: Reject HTML, web pages, or anti-bot challenge responses masquerading as media
      if (lowerContentType.includes('text/html') || lowerContentType.includes('application/xhtml+xml')) {
        res.status(415).json({
          error: 'Invalid content type received from remote provider',
          message: 'Remote source returned an HTML web page or error document instead of the requested binary media asset'
        });
        return;
      }

      const contentLength = upstream.headers.get('content-length');
      const safeFilename = sanitizeSafeFilename(requestedFilename, 'download');

      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
      res.setHeader('Content-Type', rawContentType);
      res.setHeader('Access-Control-Allow-Origin', '*');

      const expectedBytes = contentLength ? parseInt(contentLength, 10) : null;
      if (contentLength) {
        res.setHeader('Content-Length', contentLength);
      }

      if (req.method === 'HEAD') {
        res.end();
        return;
      }

      const maxBytes = APP_CONFIG.download.maxSizeBytes;

      if (upstream.body) {
        const nodeStream = Readable.fromWeb(upstream.body as any);
        let receivedBytes = 0;
        let isAborted = false;

        req.on('close', () => {
          nodeStream.destroy();
        });

        // BUG-004: Enforce size limit while streaming even if Content-Length is missing or chunked
        nodeStream.on('data', (chunk: Buffer) => {
          receivedBytes += chunk.length;
          if (receivedBytes > maxBytes && !isAborted) {
            isAborted = true;
            console.warn(`[DownloadController] Streaming download exceeded ${Math.round(maxBytes / (1024 * 1024))}MB limit (${receivedBytes} bytes). Terminating.`);
            nodeStream.destroy(new Error('Streaming payload exceeded maximum permitted size'));
            if (!res.headersSent) {
              res.status(413).json({ error: `File size exceeded maximum permitted streaming limit of ${Math.round(maxBytes / (1024 * 1024))}MB` });
            } else {
              res.destroy(new Error('Streaming payload exceeded size limit'));
            }
          }
        });

        // BUG-011: Detect premature stream error or termination so client does not accept truncated download as complete
        nodeStream.on('error', (err) => {
          console.error('[DownloadController] Upstream stream error:', err.message);
          if (!res.headersSent) {
            res.status(502).json({ error: 'Stream error from upstream provider', message: err.message });
          } else {
            // Destroy response socket to signal failure to the browser
            res.destroy(err);
          }
        });

        nodeStream.on('end', () => {
          if (isAborted) return;
          if (expectedBytes !== null && !isNaN(expectedBytes) && receivedBytes < expectedBytes) {
            console.warn(`[DownloadController] Truncated download: received ${receivedBytes} of expected ${expectedBytes} bytes`);
            res.destroy(new Error(`Truncated download: expected ${expectedBytes} bytes, received ${receivedBytes}`));
            return;
          }
          if (!res.writableEnded) {
            res.end();
          }
        });

        nodeStream.pipe(res, { end: false });
      } else {
        const buffer = await upstream.arrayBuffer();
        if (buffer.byteLength > maxBytes) {
          res.status(413).json({ error: `File size exceeded maximum limit of ${Math.round(maxBytes / (1024 * 1024))}MB` });
          return;
        }
        res.send(Buffer.from(buffer));
      }
    } catch (err: any) {
      console.error('DownloadController Error in proxyDownload:', err);
      if (!res.headersSent) {
        const status = err.statusCode || 502;
        res.status(status).json({
          error: 'Failed to retrieve file from remote provider',
          message: err.message
        });
      } else {
        res.destroy(err);
      }
    }
  }
}

export const downloadController = new DownloadController();

