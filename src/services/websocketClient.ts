import { ResourceItem, SearchFilters } from '../types/resource';

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'reconnecting';

export interface LiveActivityEvent {
  query: string;
  category: string;
  providerCount: number;
  timestamp: number;
}

export interface StreamingSearchCallbacks {
  onStart?: (data: { searchId: string; totalProviders: number; planSummary?: string }) => void;
  onProviderResults?: (data: {
    providerId: string;
    items: ResourceItem[];
    count: number;
    latencyMs: number;
    completedProviders: number;
    totalProviders: number;
    percent: number;
  }) => void;
  onProviderError?: (data: {
    providerId: string;
    error: string;
    completedProviders: number;
    totalProviders: number;
    percent: number;
  }) => void;
  onComplete?: (data: {
    totalItems: number;
    durationMs: number;
    completedProviders: number;
    totalProviders: number;
  }) => void;
  onError?: (err: string) => void;
}

export class WebSocketClient {
  private static instance: WebSocketClient;
  private ws: WebSocket | null = null;
  private status: ConnectionStatus = 'disconnected';
  private reconnectTimer: any = null;
  private reconnectAttempts = 0;
  private statusListeners = new Set<(status: ConnectionStatus) => void>();
  private activityListeners = new Set<(event: LiveActivityEvent) => void>();
  private activeSearchCallbacks: Map<string, StreamingSearchCallbacks> = new Map();
  private pingInterval: any = null;

  public static getInstance(): WebSocketClient {
    if (!WebSocketClient.instance) {
      WebSocketClient.instance = new WebSocketClient();
    }
    return WebSocketClient.instance;
  }

  constructor() {
    if (typeof window !== 'undefined') {
      this.connect();
    }
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  public onStatusChange(listener: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => this.statusListeners.delete(listener);
  }

  public onLiveActivity(listener: (event: LiveActivityEvent) => void): () => void {
    this.activityListeners.add(listener);
    return () => this.activityListeners.delete(listener);
  }

  public connect(): void {
    if (typeof window === 'undefined') return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.setStatus('connecting');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.setStatus('connected');
        this.reconnectAttempts = 0;
        this.startPing();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleMessage(msg);
        } catch (e) {
          console.error('[URMIL WS Client] Failed to parse incoming message:', e);
        }
      };

      this.ws.onclose = () => {
        this.stopPing();
        this.setStatus('disconnected');
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.warn('[URMIL WS Client] Socket warning:', err);
      };
    } catch (err) {
      console.warn('[URMIL WS Client] Connection failed:', err);
      this.setStatus('disconnected');
      this.scheduleReconnect();
    }
  }

  private setStatus(status: ConnectionStatus): void {
    this.status = status;
    this.statusListeners.forEach((fn) => fn(status));
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.setStatus('reconnecting');
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 10000);
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private startPing(): void {
    this.stopPing();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'PING' }));
      }
    }, 25000);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private handleMessage(msg: any): void {
    const searchId = msg.searchId;
    const callbacks = searchId ? this.activeSearchCallbacks.get(searchId) : null;

    switch (msg.type) {
      case 'LIVE_QUERY_BROADCAST': {
        this.activityListeners.forEach((fn) =>
          fn({
            query: msg.query,
            category: msg.category,
            providerCount: msg.providerCount,
            timestamp: msg.timestamp
          })
        );
        break;
      }

      case 'SEARCH_START': {
        if (callbacks?.onStart) {
          callbacks.onStart({
            searchId: msg.searchId,
            totalProviders: msg.totalProviders,
            planSummary: msg.planSummary
          });
        }
        break;
      }

      case 'PROVIDER_RESULTS': {
        if (callbacks?.onProviderResults) {
          callbacks.onProviderResults({
            providerId: msg.providerId,
            items: msg.items || [],
            count: msg.count || 0,
            latencyMs: msg.latencyMs || 0,
            completedProviders: msg.completedProviders,
            totalProviders: msg.totalProviders,
            percent: msg.percent || 0
          });
        }
        break;
      }

      case 'PROVIDER_ERROR': {
        if (callbacks?.onProviderError) {
          callbacks.onProviderError({
            providerId: msg.providerId,
            error: msg.error,
            completedProviders: msg.completedProviders,
            totalProviders: msg.totalProviders,
            percent: msg.percent || 0
          });
        }
        break;
      }

      case 'SEARCH_COMPLETE': {
        if (callbacks?.onComplete) {
          callbacks.onComplete({
            totalItems: msg.totalItems,
            durationMs: msg.durationMs,
            completedProviders: msg.completedProviders,
            totalProviders: msg.totalProviders
          });
        }
        if (searchId) {
          this.activeSearchCallbacks.delete(searchId);
        }
        break;
      }

      case 'SEARCH_ERROR': {
        if (callbacks?.onError) {
          callbacks.onError(msg.error);
        }
        if (searchId) {
          this.activeSearchCallbacks.delete(searchId);
        }
        break;
      }
    }
  }

  /**
   * Initiates a real-time streaming search over WebSocket.
   * Returns a cancel function.
   */
  public searchStream(
    filters: SearchFilters,
    callbacks: StreamingSearchCallbacks
  ): () => void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.connect();
    }

    const searchId = `ws-s-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    this.activeSearchCallbacks.set(searchId, callbacks);

    const payload = {
      type: 'SEARCH',
      searchId,
      query: filters.query,
      category: filters.category || 'all',
      limit: filters.pageSize || 40,
      nasaSubCategory: filters.nasaSubCategory
    };

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    } else {
      // If still connecting, wait up to 1.5s for open
      const checkTimer = setInterval(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          clearInterval(checkTimer);
          this.ws.send(JSON.stringify(payload));
        }
      }, 100);
      setTimeout(() => clearInterval(checkTimer), 2000);
    }

    return () => {
      this.activeSearchCallbacks.delete(searchId);
    };
  }
}

export const wsClient = WebSocketClient.getInstance();
