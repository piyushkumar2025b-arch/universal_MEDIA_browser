import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { PROVIDER_DISPATCH_MAP, testSingleProvider } from './provider_router';
import { generateSearchPlan } from './search_planner';
import { normalizeCategory } from './normalizer';
import { resilientPool } from './pipeline/resilient_pool';
import { telemetryService } from './services/telemetry_service';
import { ResourceItem } from '../src/types/resource';

interface ClientConnection extends WebSocket {
  isAlive: boolean;
  clientId: string;
  ip: string;
  commandCount: number;
  commandResetTime: number;
  benchmarkCount: number;
  benchmarkResetTime: number;
  activeSearches: Set<string>;
  searchAbortControllers: Map<string, AbortController>;
}

export class WebSocketHub {
  private static instance: WebSocketHub;
  private wss: WebSocketServer | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  public static getInstance(): WebSocketHub {
    if (!WebSocketHub.instance) {
      WebSocketHub.instance = new WebSocketHub();
    }
    return WebSocketHub.instance;
  }

  public init(server: HttpServer): void {
    if (this.wss) return;

    this.wss = new WebSocketServer({
      server,
      path: '/ws',
      clientTracking: true,
      maxPayload: 64 * 1024 // 64 KB max payload to prevent memory exhaustion
    });

    console.log('[URMIL Gateway] WebSocket Server mounted at /ws');

    this.wss.on('connection', (ws: WebSocket, req) => {
      const client = ws as ClientConnection;
      client.isAlive = true;
      client.clientId = Math.random().toString(36).substring(2, 11);
      client.ip = (req.socket.remoteAddress || '127.0.0.1').replace(/^::ffff:/, '');
      client.commandCount = 0;
      client.commandResetTime = Date.now() + 60000;
      client.benchmarkCount = 0;
      client.benchmarkResetTime = Date.now() + 300000;
      client.activeSearches = new Set();
      client.searchAbortControllers = new Map();

      client.on('pong', () => {
        client.isAlive = true;
      });

      // Send initial welcome & connection handshake
      this.sendToClient(client, {
        type: 'CONNECTED',
        clientId: client.clientId,
        serverTime: Date.now(),
        activeClients: this.wss?.clients.size || 1,
        message: 'Connected to URMIL Federated Search WebSocket Gateway'
      });

      client.on('message', async (data: string | Buffer) => {
        try {
          if (typeof data !== 'string' && !Buffer.isBuffer(data)) {
            return;
          }
          if (data.length > 64 * 1024) {
            this.sendToClient(client, {
              type: 'ERROR',
              error: 'Payload size exceeds 64KB limit'
            });
            return;
          }

          const raw = data.toString();
          const message = JSON.parse(raw);
          if (!message || typeof message !== 'object') {
            this.sendToClient(client, {
              type: 'ERROR',
              error: 'Message payload must be a JSON object'
            });
            return;
          }
          await this.handleClientMessage(client, message);
        } catch (err: any) {
          this.sendToClient(client, {
            type: 'ERROR',
            error: `Invalid message payload: ${err.message}`
          });
        }
      });

      client.on('error', (err) => {
        console.error(`[URMIL WS] Client ${client.clientId} error:`, err.message);
      });

      client.on('close', () => {
        // Clean up in-flight search abort controllers on connection loss
        for (const ctrl of client.searchAbortControllers.values()) {
          ctrl.abort();
        }
        client.searchAbortControllers.clear();
        client.activeSearches.clear();
      });
    });

    // Setup 30s ping/pong keep-alive heartbeat
    this.heartbeatInterval = setInterval(() => {
      if (!this.wss) return;
      this.wss.clients.forEach((ws) => {
        const client = ws as ClientConnection;
        if (!client.isAlive) {
          return client.terminate();
        }
        client.isAlive = false;
        client.ping();
      });
    }, 30000);
  }

  private async handleClientMessage(client: ClientConnection, msg: any): Promise<void> {
    const type = typeof msg.type === 'string' ? msg.type.trim() : '';

    // Per-socket command rate limiter (max 60 commands/min)
    const now = Date.now();
    if (now > client.commandResetTime) {
      client.commandCount = 1;
      client.commandResetTime = now + 60000;
    } else {
      client.commandCount++;
      if (client.commandCount > 60) {
        this.sendToClient(client, {
          type: 'ERROR',
          error: 'Rate limit exceeded: maximum 60 commands per minute on WebSocket.'
        });
        return;
      }
    }

    switch (type) {
      case 'PING': {
        this.sendToClient(client, {
          type: 'PONG',
          timestamp: Date.now(),
          clientsCount: this.wss?.clients.size || 1
        });
        break;
      }

      case 'CANCEL_SEARCH': {
        const searchId = typeof msg.searchId === 'string' ? msg.searchId : '';
        if (searchId && client.searchAbortControllers.has(searchId)) {
          client.searchAbortControllers.get(searchId)?.abort();
          client.searchAbortControllers.delete(searchId);
          client.activeSearches.delete(searchId);
          this.sendToClient(client, {
            type: 'SEARCH_CANCELLED',
            searchId
          });
        }
        break;
      }

      case 'SEARCH': {
        await this.handleStreamingSearch(client, msg);
        break;
      }

      case 'TEST_PROVIDER': {
        const providerId = typeof msg.providerId === 'string' ? msg.providerId.slice(0, 80) : '';
        const query = typeof msg.query === 'string' ? msg.query.slice(0, 100) : 'space';
        if (!providerId) {
          this.sendToClient(client, { type: 'ERROR', error: 'Missing providerId' });
          return;
        }
        const result = await testSingleProvider(providerId, query);
        this.sendToClient(client, {
          type: 'TEST_PROVIDER_RESULT',
          providerId,
          result
        });
        break;
      }

      case 'BENCHMARK': {
        // Strict benchmark rate limiter (max 3 per 5 minutes per client)
        if (now > client.benchmarkResetTime) {
          client.benchmarkCount = 1;
          client.benchmarkResetTime = now + 300000;
        } else {
          client.benchmarkCount++;
          if (client.benchmarkCount > 3) {
            this.sendToClient(client, {
              type: 'ERROR',
              error: 'Benchmark rate limit exceeded: maximum 3 benchmarks per 5 minutes.'
            });
            return;
          }
        }
        await this.handleStreamingBenchmark(client, msg);
        break;
      }

      case 'GET_TELEMETRY': {
        const telemetry = telemetryService.getProvidersTelemetry();
        this.sendToClient(client, {
          type: 'TELEMETRY_UPDATE',
          telemetry
        });
        break;
      }

      default: {
        this.sendToClient(client, {
          type: 'UNKNOWN_COMMAND',
          receivedType: type
        });
      }
    }
  }

  /**
   * Real-time Concurrent Streaming Federated Search
   * Emits results progressively as each provider answers!
   */
  private async handleStreamingSearch(client: ClientConnection, msg: any): Promise<void> {
    const searchId = typeof msg.searchId === 'string' && msg.searchId.length <= 64 ? msg.searchId : Math.random().toString(36).substring(2, 10);
    const query = String(msg.query || '').trim().slice(0, 300);
    const category = normalizeCategory(msg.category || 'all');
    const limit = typeof msg.limit === 'number' ? Math.max(1, Math.min(msg.limit, 60)) : 40;
    const nasaSubCategory = msg.nasaSubCategory;

    if (!query) {
      this.sendToClient(client, {
        type: 'SEARCH_ERROR',
        searchId,
        error: 'Query string is required'
      });
      return;
    }

    // Limit maximum concurrent active searches per socket connection (max 2)
    if (client.activeSearches.size >= 2) {
      this.sendToClient(client, {
        type: 'SEARCH_ERROR',
        searchId,
        error: 'Maximum concurrent search limit reached (2 active searches). Please wait or cancel pending searches.'
      });
      return;
    }

    const abortController = new AbortController();
    client.activeSearches.add(searchId);
    client.searchAbortControllers.set(searchId, abortController);

    try {
      // Generate search plan
      const plan = generateSearchPlan({
        query,
        category,
        license: ['all'],
        quality: 'Any',
        format: 'all',
        sortBy: 'relevance',
        nasaSubCategory
      });

      // Select targeted providers
      let targetProviders: string[] = [];
      if (Array.isArray(msg.providers) && msg.providers.length > 0) {
        targetProviders = msg.providers.filter((p: string) => Boolean(PROVIDER_DISPATCH_MAP[p]));
      } else {
        const candidates = [...plan.primaryProviders, ...plan.fallbackProviders];
        targetProviders = Array.from(new Set(candidates)).filter(p => Boolean(PROVIDER_DISPATCH_MAP[p]));
      }

      // Limit maximum concurrent providers to prevent saturation (bounded to 16)
      const activeProviders = targetProviders.slice(0, 16);
      const startTime = Date.now();
      let completedCount = 0;
      let totalItemsEmitted = 0;

      // Send initial start handshake
      this.sendToClient(client, {
        type: 'SEARCH_START',
        searchId,
        query,
        category,
        planSummary: plan.planSummary,
        totalProviders: activeProviders.length,
        providerIds: activeProviders
      });

      // Broadcast real-time activity event to other connected users
      this.broadcastExcept(client, {
        type: 'LIVE_QUERY_BROADCAST',
        query: query.substring(0, 30),
        category,
        providerCount: activeProviders.length,
        timestamp: Date.now()
      });

      // Execute all providers concurrently and stream responses asynchronously
      const promises = activeProviders.map(async (providerId) => {
        if (abortController.signal.aborted) return;
        const pStart = Date.now();
        try {
          const items = await resilientPool.executeProvider(
            providerId,
            query,
            (q) => PROVIDER_DISPATCH_MAP[providerId](q),
            4000
          );

          if (abortController.signal.aborted) return;

          const latency = Date.now() - pStart;
          completedCount++;
          totalItemsEmitted += items.length;

          // Stream this provider's batch of results immediately to the client
          this.sendToClient(client, {
            type: 'PROVIDER_RESULTS',
            searchId,
            providerId,
            items,
            count: items.length,
            latencyMs: latency,
            completedProviders: completedCount,
            totalProviders: activeProviders.length,
            percent: Math.round((completedCount / activeProviders.length) * 100)
          });
        } catch (err: any) {
          if (abortController.signal.aborted) return;
          completedCount++;
          this.sendToClient(client, {
            type: 'PROVIDER_ERROR',
            searchId,
            providerId,
            error: err.message || 'Provider execution failed',
            completedProviders: completedCount,
            totalProviders: activeProviders.length,
            percent: Math.round((completedCount / activeProviders.length) * 100)
          });
        }
      });

      await Promise.allSettled(promises);

      if (abortController.signal.aborted) {
        return;
      }

      // Send completion event
      const duration = Date.now() - startTime;
      this.sendToClient(client, {
        type: 'SEARCH_COMPLETE',
        searchId,
        query,
        category,
        totalItems: totalItemsEmitted,
        durationMs: duration,
        completedProviders: completedCount,
        totalProviders: activeProviders.length
      });
    } finally {
      client.activeSearches.delete(searchId);
      client.searchAbortControllers.delete(searchId);
    }
  }

  /**
   * Real-time Streaming Provider Benchmark Probe
   */
  private async handleStreamingBenchmark(client: ClientConnection, msg: any): Promise<void> {
    const allKeys = Object.keys(PROVIDER_DISPATCH_MAP);
    const requested = Array.isArray(msg.providerIds) ? msg.providerIds : allKeys;
    const targetIds = requested.filter((id: string) => Boolean(PROVIDER_DISPATCH_MAP[id]));

    this.sendToClient(client, {
      type: 'BENCHMARK_START',
      totalProviders: targetIds.length
    });

    const start = Date.now();
    let passed = 0;
    let failed = 0;

    for (let i = 0; i < targetIds.length; i++) {
      const id = targetIds[i];
      try {
        const result = await testSingleProvider(id);
        if (result.success) passed++;
        else failed++;

        this.sendToClient(client, {
          type: 'BENCHMARK_PROGRESS',
          providerId: id,
          index: i + 1,
          total: targetIds.length,
          percent: Math.round(((i + 1) / targetIds.length) * 100),
          result
        });
      } catch (err: any) {
        failed++;
        this.sendToClient(client, {
          type: 'BENCHMARK_PROGRESS',
          providerId: id,
          index: i + 1,
          total: targetIds.length,
          percent: Math.round(((i + 1) / targetIds.length) * 100),
          result: { providerId: id, success: false, status: 'error', error: err.message, latencyMs: 0, itemCount: 0 }
        });
      }
    }

    this.sendToClient(client, {
      type: 'BENCHMARK_COMPLETE',
      total: targetIds.length,
      passed,
      failed,
      durationMs: Date.now() - start
    });
  }

  public broadcast(payload: any): void {
    if (!this.wss) return;
    const json = JSON.stringify(payload);
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(json);
      }
    });
  }

  private broadcastExcept(excludeClient: ClientConnection, payload: any): void {
    if (!this.wss) return;
    const json = JSON.stringify(payload);
    this.wss.clients.forEach((ws) => {
      if (ws !== excludeClient && ws.readyState === WebSocket.OPEN) {
        ws.send(json);
      }
    });
  }

  private sendToClient(client: ClientConnection, payload: any): void {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(payload));
    }
  }

  public close(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
  }
}

export const webSocketHub = WebSocketHub.getInstance();
