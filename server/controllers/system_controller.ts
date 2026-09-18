import { Request, Response } from 'express';
import { telemetryService } from '../services/telemetry_service';
import { testSingleProvider, PROVIDER_DISPATCH_MAP } from '../provider_router';

export class SystemController {
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

    const result = await testSingleProvider(providerId, customQuery);
    res.json(result);
  }

  /**
   * POST /api/v1/system/benchmark
   * Executes a parallel benchmark across all active providers
   */
  public async runBenchmark(req: Request, res: Response): Promise<void> {
    const requestedIds = req.body.providerIds as string[] | undefined;

    const allKeys = Object.keys(PROVIDER_DISPATCH_MAP);
    const targetIds = requestedIds && Array.isArray(requestedIds) && requestedIds.length > 0
      ? requestedIds.filter(id => PROVIDER_DISPATCH_MAP[id])
      : allKeys;

    const BATCH_SIZE = 6;
    const results: any[] = [];
    const startTime = Date.now();

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
