import { PROVIDER_TRACKERS } from '../telemetry';
import { apiRegistry } from '../registry';
import { resourceCache } from '../cache_store';
import { resilientPool } from '../pipeline/resilient_pool';

export class TelemetryService {
  /**
   * Aggregates telemetry data from all registered providers.
   */
  public getProvidersTelemetry() {
    const list = Object.values(PROVIDER_TRACKERS).map((p) => {
      const circuitOpen = resilientPool.isCircuitOpen(p.id);
      return {
        id: p.id,
        name: p.name,
        category: p.category,
        status: circuitOpen ? 'offline' : p.status,
        circuitBreakerState: circuitOpen ? 'OPEN' : 'CLOSED',
        latencyMs: p.lastLatencyMs,
        lastSuccess: p.lastSuccess,
        lastFailure: p.lastFailure,
        requests: p.requests,
        errors: p.errors,
        rateLimit: p.rateLimit,
        lastErrorMessage: p.lastErrorMessage,
        statusCode: p.lastStatusCode,
        diagnosticFeedback: p.diagnosticFeedback,
        recommendedAction: p.recommendedAction
      };
    });

    return {
      status: 'operational',
      policy: 'STRICT_REAL_TIME_RETRIEVAL_ONLY',
      providers: list,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Returns API registry specifications.
   */
  public getRegistrySpecs() {
    const specs = apiRegistry.getAllSpecs();
    return {
      status: 'operational',
      count: specs.length,
      registry: specs,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Returns cache store statistics.
   */
  public getCacheStats() {
    return resourceCache.getStats();
  }
}

export const telemetryService = new TelemetryService();
