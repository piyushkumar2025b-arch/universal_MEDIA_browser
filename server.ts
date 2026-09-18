import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { APP_CONFIG } from './server/config/app_config';
import { requestIdMiddleware } from './server/middleware/request_id';
import { requestLoggerMiddleware } from './server/middleware/request_logger';
import { rateLimiterMiddleware } from './server/middleware/rate_limiter';
import { securityHeadersMiddleware } from './server/middleware/security_headers';
import { compressionMiddleware } from './server/middleware/compression';
import { errorHandlerMiddleware } from './server/middleware/error_handler';
import apiRouter from './server/routes/api_router';
import { REAL_DATA_POLICY } from './server/providers';
import { webSocketHub } from './server/websocket_hub';

async function startServer() {
  const app = express();
  const PORT = APP_CONFIG.port;

  // Disable server fingerprinting
  app.disable('x-powered-by');

  // -------------------------------------------------------------
  // Global Middleware Pipeline
  // -------------------------------------------------------------
  app.use(securityHeadersMiddleware);
  app.use(compressionMiddleware);
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(requestIdMiddleware);
  app.use(requestLoggerMiddleware);
  app.use(rateLimiterMiddleware);

  // Log active policy on startup
  console.log('[URMIL Gateway] System Design Layers Initialized.');
  console.log('[URMIL Gateway] Policy Enforcement:', REAL_DATA_POLICY.rule1);

  // -------------------------------------------------------------
  // REST API Routes (/api/*)
  // -------------------------------------------------------------
  app.use('/api', apiRouter);

  // -------------------------------------------------------------
  // Centralized Error Handling Middleware
  // -------------------------------------------------------------
  app.use(errorHandlerMiddleware);

  // -------------------------------------------------------------
  // Presentation / Frontend Integration (Vite / Static)
  // -------------------------------------------------------------
  if (APP_CONFIG.environment !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // -------------------------------------------------------------
  // Ingress Binding & Lifecycle Management
  // -------------------------------------------------------------
  const server = app.listen(PORT, APP_CONFIG.host, () => {
    console.log(`[URMIL Gateway] Operational on http://${APP_CONFIG.host}:${PORT} in ${APP_CONFIG.environment} mode`);
  });

  // Attach WebSocket Hub for live real-time streaming search & telemetry
  webSocketHub.init(server);

  // Graceful shutdown handling
  const handleShutdown = (signal: string) => {
    console.log(`[URMIL Gateway] Received ${signal}. Starting graceful shutdown...`);
    webSocketHub.close();
    server.close(() => {
      console.log('[URMIL Gateway] HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

startServer().catch((err) => {
  console.error('[URMIL Gateway] Fatal startup error:', err);
  process.exit(1);
});
