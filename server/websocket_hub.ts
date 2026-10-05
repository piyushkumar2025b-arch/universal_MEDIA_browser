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

function isAllowedWebSocketOrigin(origin: string | undefined, hostHeader: string | undefined): boolean {
  if (!origin) {
    // Direct or local non-browser test clients allowed
    return true;
  }
  try {
    const parsed = new URL(origin);
    const host = parsed.host.toLowerCase();
    const hostname = parsed.hostname.toLowerCase();

    // Allow localhost and local loopback
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true;

    // Match exact Host header (the legitimate application deployment origin)
    if (hostHeader) {
      const cleanHostHeader = hostHeader.toLowerCase().trim();
      const hostHeaderWithoutPort = cleanHostHeader.split(':')[0];
      if (host === cleanHostHeader || hostname === hostHeaderWithoutPort) {
        return true;
      }
    }

    // BUG-003: Check explicit configurable allowlist, never trust arbitrary cloud namespaces
    const configuredAllowlist = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
      : [];
    if (configuredAllowlist.some(allowed => allowed === origin.toLowerCase() || allowed === hostname)) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

export class WebSocketHub {
  private static instance: WebSocketHub;
  private wss: WebSocketServer | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  // BUG-006: IP-level abuse control & connection caps
  private static ipConnections = new Map<string, number>();
  private static ipCommands = new Map<string, { count: number; resetTime: number }>();
  private static ipActiveSearches = new Map<string, number>();

  private static MAX_CONNECTIONS_PER_IP = 50;
  private static MAX_GLOBAL_CONNECTIONS = 250;
  private static MAX_COMMANDS_PER_IP_MIN = 240;
  private static MAX_SEARCHES_PER_IP = 8;

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
      maxPayload: 64 * 1024, // 64 KB max payload to prevent memory exhaustion
      verifyClient: (info, cb) => {
        // BUG-005: Validate Origin before upgrade handshake completes
        const origin = info.origin || info.req.headers.origin;
        const host = info.req.headers.host;
        if (!isAllowedWebSocketOrigin(origin, host)) {
          console.warn(`[URMIL WS] verifyClient blocked unauthorized Origin: ${origin}`);
          cb(false, 403, 'Forbidden: Invalid or unauthorized Origin');
          return;
        }
        cb(true);
      }
    });

    console.log('[URMIL Gateway] WebSocket Server mounted at /ws');

    this.wss.on('connection', (ws: WebSocket, req) => {
      // BUG-005: Validate Origin to prevent cross-site WebSocket hijacking
      const originHeader = req.headers.origin;
      const hostHeader = req.headers.host;
      if (!isAllowedWebSocketOrigin(originHeader, hostHeader)) {
        console.warn(`[URMIL WS] Rejected unauthorized WebSocket Origin: ${originHeader}`);
        ws.close(1008, 'Forbidden: Invalid or unauthorized Origin');
        return;
      }

      // BUG-006: Check global connection capacity
      const currentGlobal = this.wss?.clients.size || 0;
      if (currentGlobal > WebSocketHub.MAX_GLOBAL_CONNECTIONS) {
        ws.close(1008, 'Server connection capacity reached');
        return;
      }

      const clientIp = (req.socket.remoteAddress || '127.0.0.1').replace(/^::ffff:/, '');
      const currentIpConns = (WebSocketHub.ipConnections.get(clientIp) || 0) + 1;
      if (currentIpConns > WebSocketHub.MAX_CONNECTIONS_PER_IP) {
        console.warn(`[URMIL WS] Rate limit exceeded: too many connections from IP ${clientIp}`);
        ws.close(1008, 'Rate limit exceeded: too many connections from this IP');
        return;
      }
      WebSocketHub.ipConnections.set(clientIp, currentIpConns);

      let ipCleanedUp = false;
      const releaseIpConnection = () => {
        if (ipCleanedUp) return;
        ipCleanedUp = true;
        const count = WebSocketHub.ipConnections.get(clientIp) || 1;
        if (count <= 1) {
          WebSocketHub.ipConnections.delete(clientIp);
        } else {
          WebSocketHub.ipConnections.set(clientIp, count - 1);
        }
      };

      ws.once('close', releaseIpConnection);
      ws.once('error', releaseIpConnection);

      const client = ws as ClientConnection;
      client.isAlive = true;
      client.clientId = Math.random().toString(36).substring(2, 11);
      client.ip = clientIp;
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
        // Decrement IP connection tracker
        releaseIpConnection();

        // Release IP active searches
        const currentSearches = WebSocketHub.ipActiveSearches.get(client.ip) || 0;
        const remainingSearches = Math.max(0, currentSearches - client.activeSearches.size);
        if (remainingSearches === 0) {
          WebSocketHub.ipActiveSearches.delete(client.ip);
        } else {
          WebSocketHub.ipActiveSearches.set(client.ip, remainingSearches);
        }

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

  private static isBenchmarkActive = false;
  private static lastBenchmarkTime = 0;

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

    // BUG-006: IP-wide command rate limiter
    const ipRecord = WebSocketHub.ipCommands.get(client.ip) || { count: 0, resetTime: now + 60000 };
    if (now > ipRecord.resetTime) {
      ipRecord.count = 1;
      ipRecord.resetTime = now + 60000;
    } else {
      ipRecord.count++;
      if (ipRecord.count > WebSocketHub.MAX_COMMANDS_PER_IP_MIN) {
        this.sendToClient(client, {
          type: 'ERROR',
          error: 'Rate limit exceeded: too many commands per minute from your IP address.'
        });
        return;
      }
    }
    WebSocketHub.ipCommands.set(client.ip, ipRecord);

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
        const token = msg.adminKey || msg.token;
        const secretKey = process.env.ADMIN_SECRET_KEY || process.env.BENCHMARK_SECRET_KEY || process.env.ADMIN_KEY || process.env.SYSTEM_API_KEY;
        const isLoopback = client.ip === '127.0.0.1' || client.ip === '::1';
        if (!isLoopback && (!secretKey || token !== secretKey)) {
          this.sendToClient(client, { type: 'ERROR', error: 'Unauthorized: Provider testing requires administrative authorization.' });
          return;
        }
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
        const token = msg.adminKey || msg.token;
        const secretKey = process.env.ADMIN_SECRET_KEY || process.env.BENCHMARK_SECRET_KEY || process.env.ADMIN_KEY || process.env.SYSTEM_API_KEY;
        if (!secretKey || token !== secretKey) {
          this.sendToClient(client, { type: 'ERROR', error: 'Unauthorized: Benchmarking requires administrative authorization.' });
          return;
        }
        if (WebSocketHub.isBenchmarkActive || (now - WebSocketHub.lastBenchmarkTime < 15000)) {
          this.sendToClient(client, { type: 'ERROR', error: 'Server busy: A benchmark is currently executing or in cooldown. Limit 1 concurrent benchmark server-wide.' });
          return;
        }
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
        WebSocketHub.isBenchmarkActive = true;
        try {
          await this.handleStreamingBenchmark(client, msg);
        } finally {
          WebSocketHub.isBenchmarkActive = false;
          WebSocketHub.lastBenchmarkTime = Date.now();
        }
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

    // BUG-006: Limit concurrent searches across all connections from this IP (max 4)
    const currentIpSearches = WebSocketHub.ipActiveSearches.get(client.ip) || 0;
    if (currentIpSearches >= WebSocketHub.MAX_SEARCHES_PER_IP) {
      this.sendToClient(client, {
        type: 'SEARCH_ERROR',
        searchId,
        error: 'IP search concurrency limit reached (4 active searches across all sockets). Please wait.'
      });
      return;
    }
    WebSocketHub.ipActiveSearches.set(client.ip, currentIpSearches + 1);

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

      // BUG-007: Broadcast anonymized activity stats to other connected users (NO raw query text)
      this.broadcastExcept(client, {
        type: 'LIVE_ACTIVITY_STATS',
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
            4000,
            abortController.signal
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
      const activeIpSearches = WebSocketHub.ipActiveSearches.get(client.ip) || 1;
      if (activeIpSearches <= 1) {
        WebSocketHub.ipActiveSearches.delete(client.ip);
      } else {
        WebSocketHub.ipActiveSearches.set(client.ip, activeIpSearches - 1);
      }
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
