import { Request, Response } from 'express';
import { Readable } from 'stream';
import { downloadService } from '../services/download_service';
import { isSafePublicUrl, sanitizeSafeFilename } from '../utils/security';

export class DownloadController {
  /**
   * POST /api/v1/resources/:id/download
   * Real Asset Download with SHA-256 Checksum Verification
   */
  public async downloadResource(req: Request, res: Response): Promise<void> {
    const { url, filename, fallbackUrl } = req.body || {};
    if (!url || typeof url !== 'string' || !isSafePublicUrl(url)) {
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
   * Direct streaming proxy for large downloads with pipe optimization
   */
  public async proxyDownload(req: Request, res: Response): Promise<void> {
    const targetUrl = req.query.url as string;
    const requestedFilename = (req.query.filename as string) || 'download';
    const fallbackUrl = req.query.fallback as string;

    if (!targetUrl || !isSafePublicUrl(targetUrl)) {
      res.status(400).json({ error: 'Missing or forbidden target url parameter' });
      return;
    }

    try {
      const upstream = await downloadService.getUpstreamStream(targetUrl, fallbackUrl);
      const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
      const contentLength = upstream.headers.get('content-length');
      const safeFilename = sanitizeSafeFilename(requestedFilename, 'download');

      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
      res.setHeader('Content-Type', contentType);
      res.setHeader('Access-Control-Allow-Origin', '*');

      if (contentLength) {
        res.setHeader('Content-Length', contentLength);
      }

      if (req.method === 'HEAD') {
        res.end();
        return;
      }

      if (upstream.body) {
        const nodeStream = Readable.fromWeb(upstream.body as any);
        req.on('close', () => {
          nodeStream.destroy();
        });
        nodeStream.pipe(res);
        nodeStream.on('error', (err) => {
          console.error('[DownloadController] Stream error:', err);
          if (!res.headersSent && isSafePublicUrl(targetUrl)) {
            res.redirect(targetUrl);
          }
        });
      } else {
        const buffer = await upstream.arrayBuffer();
        res.send(Buffer.from(buffer));
      }
    } catch (err: any) {
      console.error('DownloadController Error in proxyDownload:', err);
      // If server streaming fails, redirect client directly to verified target URL so browser downloads from origin
      if (!res.headersSent && isSafePublicUrl(targetUrl)) {
        res.redirect(targetUrl);
        return;
      }
      const status = err.statusCode || 502;
      res.status(status).json({
        error: 'Failed to retrieve file from remote provider',
        message: err.message
      });
    }
  }
}

export const downloadController = new DownloadController();

