import { ResourceItem } from '../../src/types/resource';
import { activeSignalContext } from '../utils/async_context';

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
  parentSignal?: AbortSignal;
  onBackgroundResult?: (items: ResourceItem[]) => void;
}

interface InFlightRecord {
  promise: Promise<ResourceItem[]>;
  abortController: AbortController;
  consumers: Set<symbol>;
}

class ResilientProviderPool {
  private healthMap = new Map<string, ProviderHealth>();
  // BUG-002: Track consumers per in-flight request for consumer-aware cancellation
  private inFlightMap = new Map<string, InFlightRecord>();
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
   * enforces timeout, and actively aborts underlying network requests on timeout.
   * BUG-002: Employs consumer-aware cancellation so one cancelled caller does not cancel
   * shared upstream work needed by another client.
   */
  public async executeProvider(
    providerId: string,
    query: string,
    queryFn: (q: string, signal?: AbortSignal) => Promise<ResourceItem[]>,
    timeoutMs = 8000,
    parentSignal?: AbortSignal
  ): Promise<ResourceItem[]> {
    if (this.isCircuitOpen(providerId)) {
      return [];
    }

    const flightKey = `${providerId}:${query.trim().toLowerCase()}`;
    const consumerId = Symbol();
    const existingFlight = this.inFlightMap.get(flightKey);

    if (existingFlight) {
      // Coalesce request with individual consumer registration
      existingFlight.consumers.add(consumerId);

      if (!parentSignal) {
        return existingFlight.promise;
      }

      if (parentSignal.aborted) {
        existingFlight.consumers.delete(consumerId);
        if (existingFlight.consumers.size === 0) {
          existingFlight.abortController.abort();
        }
        throw new Error('Caller aborted request');
      }

      return new Promise<ResourceItem[]>((resolve, reject) => {
        let isSettled = false;
        const onAbort = () => {
          if (isSettled) return;
          isSettled = true;
          existingFlight.consumers.delete(consumerId);
          // Only abort upstream if all consumers have unsubscribed
          if (existingFlight.consumers.size === 0) {
            existingFlight.abortController.abort();
          }
          reject(new Error('Operation cancelled by client'));
        };

        parentSignal.addEventListener('abort', onAbort, { once: true });

        existingFlight.promise.then(
          (items) => {
            if (isSettled) return;
            isSettled = true;
            parentSignal.removeEventListener('abort', onAbort);
            resolve(items);
          },
          (err) => {
            if (isSettled) return;
            isSettled = true;
            parentSignal.removeEventListener('abort', onAbort);
            reject(err);
          }
        );
      });
    }

    // New in-flight request
    const abortController = new AbortController();
    const consumers = new Set<symbol>([consumerId]);

    const promise = (async () => {
      const start = Date.now();
      let timer: NodeJS.Timeout | null = null;
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            abortController.abort();
            reject(new Error(`The operation was aborted due to timeout (${timeoutMs}ms)`));
          }, timeoutMs);
        });

        // BUG-001: Propagate signal through activeSignalContext so fetch calls inherit it
        const items = await activeSignalContext.run(abortController.signal, () =>
          Promise.race([
            queryFn(query, abortController.signal),
            timeoutPromise
          ])
        );

        const latency = Date.now() - start;
        this.recordSuccess(providerId, latency);
        return items;
      } catch (err: any) {
        abortController.abort();
        this.recordFailure(providerId, err.message || 'Unknown provider error');
        throw err;
      } finally {
        if (timer) clearTimeout(timer);
        this.inFlightMap.delete(flightKey);
      }
    })();

    const flightRecord: InFlightRecord = {
      promise,
      abortController,
      consumers
    };
    this.inFlightMap.set(flightKey, flightRecord);

    if (!parentSignal) {
      return promise;
    }

    if (parentSignal.aborted) {
      consumers.delete(consumerId);
      if (consumers.size === 0) {
        abortController.abort();
      }
      throw new Error('Caller aborted request');
    }

    return new Promise<ResourceItem[]>((resolve, reject) => {
      let isSettled = false;
      const onAbort = () => {
        if (isSettled) return;
        isSettled = true;
        consumers.delete(consumerId);
        if (consumers.size === 0) {
          abortController.abort();
        }
        reject(new Error('Operation cancelled by client'));
      };

      parentSignal.addEventListener('abort', onAbort, { once: true });

      promise.then(
        (items) => {
          if (isSettled) return;
          isSettled = true;
          parentSignal.removeEventListener('abort', onAbort);
          resolve(items);
        },
        (err) => {
          if (isSettled) return;
          isSettled = true;
          parentSignal.removeEventListener('abort', onAbort);
          reject(err);
        }
      );
    });
  }

  /**
   * Execute multiple providers with sliding-window worker concurrency, latency-aware provider sorting,
   * fast quorum early yielding, and resilient circuit breaker protection.
   * Fast providers deliver instant UI results without being held back by slow trailing endpoints.
   */
  public async executeFederation(
    providerIds: string[],
    query: string,
    dispatchMap: Record<string, (q: string, signal?: AbortSignal) => Promise<ResourceItem[]>>,
    options: PoolExecutionOptions = {}
  ): Promise<{ results: ResourceItem[]; errors: string[] }> {
    const { 
      timeoutMs = 3200,
      overallDeadlineMs = 3800,
      fastQuorumCount,
      fastYieldMinTimeMs = 1200,
      maxConcurrency = 16,
      parentSignal,
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
    const federationAbortController = new AbortController();

    // Hook parent signal to federation controller
    if (parentSignal) {
      if (parentSignal.aborted) {
        federationAbortController.abort();
      } else {
        parentSignal.addEventListener('abort', () => federationAbortController.abort(), { once: true });
      }
    }

    let triggerEarlyQuorum: (() => void) | null = null;
    const earlyQuorumPromise = new Promise<void>((resolve) => {
      triggerEarlyQuorum = resolve;
    });

    const executeTask = async (pid: string) => {
      if (isTerminated || federationAbortController.signal.aborted) return;
      const fn = dispatchMap[pid];
      if (!fn) return;

      try {
        const items = await this.executeProvider(pid, query, fn, timeoutMs, federationAbortController.signal);
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
      while (!isTerminated && !federationAbortController.signal.aborted && index < sortedProviderIds.length) {
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
        // If no background handler is set, abort all remaining pending fetches to free resources
        if (!onBackgroundResult) {
          federationAbortController.abort();
        }
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
