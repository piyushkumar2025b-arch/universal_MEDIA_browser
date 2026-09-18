import { ResourceItem } from '../../src/types/resource';

export interface ProviderHealth {
  id: string;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  consecutiveFailures: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
  avgLatencyMs: number;
  totalCalls: number;
  successCalls: number;
}

export interface PoolExecutionOptions {
  timeoutMs?: number;
  retries?: number;
  fastQuorumCount?: number;
  fastYieldMinTimeMs?: number;
  overallDeadlineMs?: number;
  maxConcurrency?: number;
  onBackgroundResult?: (items: ResourceItem[]) => void;
}

class ResilientProviderPool {
  private healthMap = new Map<string, ProviderHealth>();
  private inFlightMap = new Map<string, Promise<ResourceItem[]>>();
  private circuitCooldownMs = 45000; // 45 seconds cooldown before half-open test
  private maxConsecutiveFailures = 3;

  private getOrCreateHealth(providerId: string): ProviderHealth {
    let health = this.healthMap.get(providerId);
    if (!health) {
      health = {
        id: providerId,
        state: 'CLOSED',
        consecutiveFailures: 0,
        avgLatencyMs: 0,
        totalCalls: 0,
        successCalls: 0
      };
      this.healthMap.set(providerId, health);
    }
    return health;
  }

  public isCircuitOpen(providerId: string): boolean {
    const health = this.getOrCreateHealth(providerId);
    if (health.state === 'OPEN') {
      const elapsed = Date.now() - (health.lastFailureTime || 0);
      if (elapsed > this.circuitCooldownMs) {
        // Transition to HALF_OPEN to attempt a canary probe
        health.state = 'HALF_OPEN';
        return false;
      }
      return true; // Still open, bypass provider
    }
    return false;
  }

  public recordSuccess(providerId: string, latencyMs: number) {
    const health = this.getOrCreateHealth(providerId);
    health.state = 'CLOSED';
    health.consecutiveFailures = 0;
    health.lastSuccessTime = Date.now();
    health.totalCalls++;
    health.successCalls++;
    health.avgLatencyMs = health.avgLatencyMs === 0 
      ? latencyMs 
      : Math.round(health.avgLatencyMs * 0.7 + latencyMs * 0.3);
  }

  public recordFailure(providerId: string, errorMsg: string) {
    const health = this.getOrCreateHealth(providerId);
    health.totalCalls++;
    health.consecutiveFailures++;
    health.lastFailureTime = Date.now();

    if (health.consecutiveFailures >= this.maxConsecutiveFailures) {
      health.state = 'OPEN';
    }
  }

  /**
   * Resilient execute: coalesces duplicate in-flight requests, respects circuit breaker,
   * enforces timeout, and records health statistics.
   */
  public async executeProvider(
    providerId: string,
    query: string,
    queryFn: (q: string) => Promise<ResourceItem[]>,
    timeoutMs = 8000
  ): Promise<ResourceItem[]> {
    if (this.isCircuitOpen(providerId)) {
      // Fast bypass when circuit is open
      return [];
    }

    const flightKey = `${providerId}:${query.trim().toLowerCase()}`;
    const existingFlight = this.inFlightMap.get(flightKey);
    if (existingFlight) {
      // Coalesce request (thundering herd protection)
      return existingFlight;
    }

    const promise = (async () => {
      const start = Date.now();
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          const timer = setTimeout(() => {
            reject(new Error(`The operation was aborted due to timeout (${timeoutMs}ms)`));
          }, timeoutMs);
          // Unref timer if available in Node environment to avoid hanging event loop
          if (typeof timer.unref === 'function') timer.unref();
        });

        const items = await Promise.race([queryFn(query), timeoutPromise]);
        const latency = Date.now() - start;
        this.recordSuccess(providerId, latency);
        return items;
      } catch (err: any) {
        this.recordFailure(providerId, err.message || 'Unknown provider error');
        throw err;
      } finally {
        this.inFlightMap.delete(flightKey);
      }
    })();

    this.inFlightMap.set(flightKey, promise);
    return promise;
  }

  /**
   * Execute multiple providers with sliding-window worker concurrency, latency-aware provider sorting,
   * fast quorum early yielding, and resilient circuit breaker protection.
   * Fast providers deliver instant UI results without being held back by slow trailing endpoints.
   */
  public async executeFederation(
    providerIds: string[],
    query: string,
    dispatchMap: Record<string, (q: string) => Promise<ResourceItem[]>>,
    options: PoolExecutionOptions = {}
  ): Promise<{ results: ResourceItem[]; errors: string[] }> {
    const { 
      timeoutMs = 3200,
      overallDeadlineMs = 3800,
      fastQuorumCount,
      fastYieldMinTimeMs = 1200,
      maxConcurrency = 16,
      onBackgroundResult
    } = options;
    const errors: string[] = [];
    const results: ResourceItem[] = [];

    const validProviderIds = providerIds.filter((pid) => Boolean(dispatchMap[pid]));
    if (validProviderIds.length === 0) {
      return { results, errors };
    }

    // Sort providers so proven healthy & fast providers start first
    const sortedProviderIds = [...validProviderIds].sort((a, b) => {
      const healthA = this.healthMap.get(a);
      const healthB = this.healthMap.get(b);

      const stateScoreA = healthA?.state === 'OPEN' ? 2 : (healthA?.state === 'HALF_OPEN' ? 1 : 0);
      const stateScoreB = healthB?.state === 'OPEN' ? 2 : (healthB?.state === 'HALF_OPEN' ? 1 : 0);
      if (stateScoreA !== stateScoreB) return stateScoreA - stateScoreB;

      const latA = (healthA?.avgLatencyMs && healthA.avgLatencyMs > 0) ? healthA.avgLatencyMs : 500;
      const latB = (healthB?.avgLatencyMs && healthB.avgLatencyMs > 0) ? healthB.avgLatencyMs : 500;
      return latA - latB;
    });

    let isTerminated = false;
    let hasYieldedEarly = false;
    let index = 0;
    const startTime = Date.now();
    const respondedProviders = new Set<string>();

    let triggerEarlyQuorum: (() => void) | null = null;
    const earlyQuorumPromise = new Promise<void>((resolve) => {
      triggerEarlyQuorum = resolve;
    });

    const executeTask = async (pid: string) => {
      if (isTerminated) return;
      const fn = dispatchMap[pid];
      if (!fn) return;

      try {
        const items = await this.executeProvider(pid, query, fn, timeoutMs);
        if (Array.isArray(items) && items.length > 0) {
          respondedProviders.add(pid);
          if (!hasYieldedEarly) {
            results.push(...items);
            const elapsed = Date.now() - startTime;
            const minProviders = Math.min(3, sortedProviderIds.length);
            if (
              fastQuorumCount &&
              results.length >= fastQuorumCount &&
              respondedProviders.size >= minProviders &&
              elapsed >= fastYieldMinTimeMs &&
              triggerEarlyQuorum
            ) {
              triggerEarlyQuorum();
            }
          } else {
            // Early quorum already returned to client; seamlessly stream downstream to background callback
            if (typeof onBackgroundResult === 'function') {
              try {
                onBackgroundResult(items);
              } catch (bgErr: any) {
                console.warn(`[ResilientPool] Background result dispatch notice for ${pid}:`, bgErr?.message);
              }
            }
          }
        }
      } catch (err: any) {
        if (!this.isCircuitOpen(pid)) {
          errors.push(`${pid}: ${err.message}`);
        }
      }
    };

    const worker = async () => {
      while (!isTerminated && index < sortedProviderIds.length) {
        const currentIndex = index++;
        if (currentIndex < sortedProviderIds.length) {
          await executeTask(sortedProviderIds[currentIndex]);
        }
      }
    };

    const workerCount = Math.min(maxConcurrency, sortedProviderIds.length);
    const workerPromises = Array.from({ length: workerCount }, () => worker());

    const deadlinePromise = new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        isTerminated = true;
        resolve();
      }, overallDeadlineMs);
      if (typeof timer.unref === 'function') timer.unref();
    });

    await Promise.race([
      Promise.all(workerPromises),
      earlyQuorumPromise,
      deadlinePromise
    ]);

    // Mark early yield flag so any subsequent background completions feed into onBackgroundResult
    hasYieldedEarly = true;

    return { results, errors };
  }

  public getHealthSummary(): Record<string, ProviderHealth> {
    const summary: Record<string, ProviderHealth> = {};
    for (const [id, health] of this.healthMap.entries()) {
      summary[id] = { ...health };
    }
    return summary;
  }
}

export const resilientPool = new ResilientProviderPool();
