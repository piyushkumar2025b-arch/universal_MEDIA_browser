import { Request, Response } from 'express';
import { telemetryService } from '../services/telemetry_service';
import { testSingleProvider, PROVIDER_DISPATCH_MAP } from '../provider_router';

export class SystemController {
  private static isBenchmarkRunning = false;
  private static lastBenchmarkTime = 0;

  /**
   * GET /api/v1/system/providers
   * Returns live telemetry across all active and configured providers
   */
  public getProviders(req: Request, res: Response): void {
    const telemetry = telemetryService.getProvidersTelemetry();
    res.json(telemetry);
  }

  /**
   * POST /api/v1/system/test-provider/:id
   * Executes a live canary probe on an individual provider
   */
  public async testProvider(req: Request, res: Response): Promise<void> {
    const body = req.body || {};
    const providerId = (req.params.id || body.id || req.query.provider || req.query.id) as string | undefined;
    const customQuery = (body.query || req.query.query) as string | undefined;

    if (!providerId) {
      res.status(400).json({ error: 'Missing providerId parameter' });
      return;
    }

    const secretKey = process.env.ADMIN_SECRET_KEY || process.env.BENCHMARK_SECRET_KEY;
    const authHeader = req.headers['authorization'];
    const bearerToken = typeof authHeader === 'string' && authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : undefined;
    const providedKey = (req.headers['x-admin-key'] as string) || bearerToken || body.adminKey || (req.query.adminKey as string);

    const clientIp = (req.socket.remoteAddress || '127.0.0.1').replace(/^::ffff:/, '');
    const isLoopback = clientIp === '127.0.0.1' || clientIp === '::1';

    // Allow loopback (for local health verification) or valid admin key; block unauthorized external probes
    if (!isLoopback && (!secretKey || !providedKey || providedKey !== secretKey)) {
      res.status(403).json({
        error: 'Forbidden: Diagnostic provider testing requires administrative authorization.'
      });
      return;
    }

    const result = await testSingleProvider(providerId, customQuery);
    res.json(result);
  }

  /**
   * POST /api/v1/system/benchmark
   * Executes a parallel benchmark across all active providers with strict authorization,
   * deduplication, rate limits, and concurrency bounds (BUG-001 & BUG-002)
   */
  public async runBenchmark(req: Request, res: Response): Promise<void> {
    const secretKey = process.env.ADMIN_SECRET_KEY || process.env.BENCHMARK_SECRET_KEY;
    const authHeader = req.headers['authorization'];
    const bearerToken = typeof authHeader === 'string' && authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : undefined;
    const providedKey = (req.headers['x-admin-key'] as string) || bearerToken || req.body?.adminKey || (req.query?.adminKey as string);

    // BUG-001 & BUG-002: Always require admin authorization independently of environment
    if (!secretKey || !providedKey || providedKey !== secretKey) {
      res.status(403).json({
        error: 'Forbidden: Administrative authorization required to execute system benchmark.',
        message: 'Configure ADMIN_SECRET_KEY or BENCHMARK_SECRET_KEY and provide valid authorization.'
      });
      return;
    }

    // Enforce global benchmark concurrency lock (limit 1 active server-wide)
    if (SystemController.isBenchmarkRunning) {
      res.status(429).json({
        error: 'Server busy: A benchmark is currently executing. Limit 1 concurrent benchmark server-wide.'
      });
      return;
    }

    // Enforce 30s benchmark cooldown
    const now = Date.now();
    if (now - SystemController.lastBenchmarkTime < 30000) {
      const waitSec = Math.ceil((30000 - (now - SystemController.lastBenchmarkTime)) / 1000);
      res.status(429).json({
        error: `Benchmark cooldown active. Please wait ${waitSec}s before initiating another benchmark.`
      });
      return;
    }

    const requestedIds = req.body?.providerIds as string[] | undefined;
    const MAX_BENCHMARK_PROVIDERS = 20;

    // Deduplicate requested IDs and clamp to strict upper bound
    let targetIds: string[];
    if (requestedIds && Array.isArray(requestedIds) && requestedIds.length > 0) {
      targetIds = Array.from(new Set(requestedIds)).filter(id => Boolean(PROVIDER_DISPATCH_MAP[id]));
    } else {
      // Default to canary subset of 20 rather than uncapped ~319 providers
      targetIds = Object.keys(PROVIDER_DISPATCH_MAP).slice(0, MAX_BENCHMARK_PROVIDERS);
    }

    if (targetIds.length > MAX_BENCHMARK_PROVIDERS) {
      targetIds = targetIds.slice(0, MAX_BENCHMARK_PROVIDERS);
    }

    if (targetIds.length === 0) {
      res.status(400).json({ error: 'No valid provider IDs specified for benchmark' });
      return;
    }

    SystemController.isBenchmarkRunning = true;
    const startTime = Date.now();

    try {
      const BATCH_SIZE = 4;
      const results: any[] = [];

      for (let i = 0; i < targetIds.length; i += BATCH_SIZE) {
        const batch = targetIds.slice(i, i + BATCH_SIZE);
        const batchPromises = batch.map(id => testSingleProvider(id));
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      }

      const passed = results.filter(r => r.success).length;
      const empty = results.filter(r => r.status === 'empty').length;
      const errors = results.filter(r => r.status === 'error').length;

      res.json({
        totalTested: results.length,
        passed,
        empty,
        errors,
        executionTimeMs: Date.now() - startTime,
        results
      });
    } finally {
      SystemController.isBenchmarkRunning = false;
      SystemController.lastBenchmarkTime = Date.now();
    }
  }

  /**
   * GET /api/v1/system/registry
   * Specifications and documentation metadata for all supported open access providers
   */
  public getRegistry(req: Request, res: Response): void {
    const specs = telemetryService.getRegistrySpecs();
    res.json(specs);
  }

  /**
   * GET /api/v1/system/cache-stats
   * Cache telemetry and memory footprint metrics
   */
  public getCacheStats(req: Request, res: Response): void {
    const stats = telemetryService.getCacheStats();
    res.json(stats);
  }

  /**
   * GET /api/health
   * Liveness and readiness probe endpoint
   */
  public getHealth(req: Request, res: Response): void {
    const telemetry = telemetryService.getProvidersTelemetry();
    res.json({
      status: 'healthy',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      ...telemetry
    });
  }
}

export const systemController = new SystemController();
