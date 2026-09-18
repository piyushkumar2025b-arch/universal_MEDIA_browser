import { ResourceItem, ResourceCategory, SearchFilters, ProviderHealth, ProviderStatus } from '../types/resource';
export type { ProviderHealth, ProviderStatus };

const USER_RESOURCES_STORAGE_KEY = 'urmil_user_owned_resources_v1';

// Load user-owned resources from client storage
export function getUserOwnedResources(): ResourceItem[] {
  try {
    const raw = localStorage.getItem(USER_RESOURCES_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load user resources:', err);
    return [];
  }
}

// Save a new user-owned resource
export function saveUserOwnedResource(
  data: Omit<ResourceItem, 'id' | 'isUserOwned' | 'source'>
): ResourceItem {
  const current = getUserOwnedResources();
  const id = `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const newItem: ResourceItem = {
    ...data,
    id,
    isUserOwned: true,
    source: {
      providerId: 'user_vault',
      providerName: 'User Vault (Local)',
      resourceUrl: data.previewUrl || data.downloadUrl || ''
    },
    verification: {
      metadataVerified: true,
      resourceReachable: true,
      integrityVerified: false
    }
  };

  const updated = [newItem, ...current];
  try {
    localStorage.setItem(USER_RESOURCES_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to persist user resource:', err);
  }
  return newItem;
}

// Delete a user-owned resource
export function deleteUserOwnedResource(id: string): void {
  const current = getUserOwnedResources();
  const filtered = current.filter((item) => item.id !== id);
  try {
    localStorage.setItem(USER_RESOURCES_STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error('Failed to update user resources:', err);
  }
}

// -------------------------------------------------------------
// Robust API Error Classification & Feedback Types
// -------------------------------------------------------------
export type ApiErrorType = 'auth' | 'rate_limit' | 'server_error' | 'timeout' | 'network' | 'unknown';

export interface ApiErrorDetails {
  providerId: string;
  statusCode?: number;
  errorType: ApiErrorType;
  message: string;
  diagnosticFeedback: string;
  recommendedAction: string;
  timestamp: string;
  url?: string;
}

export interface ClientProviderHealthRecord {
  id: string;
  name: string;
  category: string;
  status: 'healthy' | 'degraded' | 'rate_limited' | 'offline' | 'auth_failed' | 'server_error';
  lastError?: ApiErrorDetails;
  lastSuccess?: string;
  requests: number;
  errors: number;
  lastLatencyMs?: number;
}

// Client-side telemetry registry to track errors and enrich AdminTelemetryModal
const clientTelemetryRegistry: Map<string, ClientProviderHealthRecord> = new Map();

function formatProviderName(providerId: string): string {
  return providerId
    .split(/[_-]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Robust error classifier for external APIs.
 * Categorizes 401/403 (invalid keys), 429 (rate limits), 5xx (server errors), and timeouts.
 */
export function classifyApiError(
  status: number,
  providerId: string,
  rawMessage?: string,
  url?: string
): ApiErrorDetails {
  const name = formatProviderName(providerId);
  const timestamp = new Date().toISOString();

  // 1. Catch 401/403: Invalid Keys, Expired Tokens, or Access Forbidden
  if (status === 401 || status === 403) {
    return {
      providerId,
      statusCode: status,
      errorType: 'auth',
      message: rawMessage || (status === 401 ? 'Unauthorized: Invalid API Key' : 'Forbidden: Access Denied'),
      diagnosticFeedback: `Authentication Failure (HTTP ${status}): Invalid, expired, or missing API credentials for ${name}. Provider skipped gracefully without interrupting search.`,
      recommendedAction: `Inspect environment API keys or Settings. Ensure valid token for ${name}.`,
      timestamp,
      url
    };
  }

  // 2. Catch 429: Rate Limits Exceeded
  if (status === 429) {
    return {
      providerId,
      statusCode: 429,
      errorType: 'rate_limit',
      message: rawMessage || 'Too Many Requests: Rate limit exceeded',
      diagnosticFeedback: `Rate Limit Exceeded (HTTP 429): ${name} has throttled requests due to high query volume. Provider skipped to prevent further rate penalties.`,
      recommendedAction: `Wait for upstream quota window reset or increase API rate tier.`,
      timestamp,
      url
    };
  }

  // 3. Catch 5xx: Upstream Server Outages or Gateway Failures
  if (status >= 500 && status < 600) {
    return {
      providerId,
      statusCode: status,
      errorType: 'server_error',
      message: rawMessage || `Upstream Server Error (HTTP ${status})`,
      diagnosticFeedback: `Upstream Outage (HTTP ${status}): ${name} server encountered an internal error. Safely bypassed; remaining sources continue serving.`,
      recommendedAction: `External upstream provider issue. System will automatically retry on future queries.`,
      timestamp,
      url
    };
  }

  // 4. Client-side errors (400, 404, etc.)
  return {
    providerId,
    statusCode: status,
    errorType: 'unknown',
    message: rawMessage || `HTTP ${status}`,
    diagnosticFeedback: `Request Error (HTTP ${status}) from ${name}. Provider bypassed.`,
    recommendedAction: `Check query parameters and syntax for ${name}.`,
    timestamp,
    url
  };
}

/**
 * Classifies network errors, AbortError, or connection timeouts.
 */
export function classifyNetworkOrTimeoutError(
  err: any,
  providerId: string,
  url?: string
): ApiErrorDetails {
  const name = formatProviderName(providerId);
  const msg = err?.message || String(err);
  const isTimeout = msg.includes('timeout') || msg.includes('aborted') || err?.name === 'TimeoutError' || err?.name === 'AbortError';

  return {
    providerId,
    statusCode: 0,
    errorType: isTimeout ? 'timeout' : 'network',
    message: msg,
    diagnosticFeedback: isTimeout
      ? `Request Timeout: ${name} failed to respond within latency deadline. Provider skipped to protect search speed.`
      : `Network Failure: Unable to establish connection to ${name}. Safely skipped.`,
    recommendedAction: isTimeout
      ? `Network latency spike observed. Provider will be re-attempted on subsequent searches.`
      : `Check internet connection and remote domain reachability.`,
    timestamp: new Date().toISOString(),
    url
  };
}

/**
 * Register provider failure into client telemetry so AdminTelemetryModal receives immediate feedback.
 */
export function recordClientProviderError(error: ApiErrorDetails): void {
  let record = clientTelemetryRegistry.get(error.providerId);
  if (!record) {
    record = {
      id: error.providerId,
      name: formatProviderName(error.providerId),
      category: 'External API',
      status: 'healthy',
      requests: 0,
      errors: 0
    };
    clientTelemetryRegistry.set(error.providerId, record);
  }

  record.requests += 1;
  record.errors += 1;
  record.lastError = error;

  if (error.errorType === 'auth') {
    record.status = 'auth_failed';
  } else if (error.errorType === 'rate_limit') {
    record.status = 'rate_limited';
  } else if (error.errorType === 'server_error') {
    record.status = 'server_error';
  } else {
    record.status = 'degraded';
  }
}

/**
 * Register provider success in client telemetry.
 */
export function recordClientProviderSuccess(providerId: string, latencyMs?: number): void {
  let record = clientTelemetryRegistry.get(providerId);
  if (!record) {
    record = {
      id: providerId,
      name: formatProviderName(providerId),
      category: 'External API',
      status: 'healthy',
      requests: 0,
      errors: 0
    };
    clientTelemetryRegistry.set(providerId, record);
  }

  record.requests += 1;
  record.lastLatencyMs = latencyMs;
  record.lastSuccess = new Date().toISOString();
  // Clear transient error status if previous errors were not fatal auth issues
  if (record.status !== 'auth_failed') {
    record.status = 'healthy';
  }
}

/**
 * Retrieve active diagnostic advisories for all providers currently experiencing 401/403, 429, or 5xx issues.
 */
export function getClientDiagnosticAdvisories(): ApiErrorDetails[] {
  const advisories: ApiErrorDetails[] = [];
  clientTelemetryRegistry.forEach((rec) => {
    if (rec.lastError && rec.status !== 'healthy') {
      advisories.push(rec.lastError);
    }
  });
  return advisories;
}

/**
 * Robust wrapper for external API calls with specific catch blocks for:
 * - 401/403: Invalid Keys / Unauthorized
 * - 429: Rate Limits
 * - 5xx: Server Outages
 * - Network / Timeout Errors
 *
 * Ensures providers fail safely and are skipped without crashing the calling process.
 */
export async function safeExternalApiFetch<T>(
  providerId: string,
  url: string,
  options?: RequestInit & { timeoutMs?: number }
): Promise<{ ok: boolean; data: T | null; error?: ApiErrorDetails; skipped: boolean }> {
  const timeoutMs = options?.timeoutMs || 8000;
  const start = performance.now();

  try {
    const res = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(timeoutMs)
    });

    if (!res.ok) {
      // Specific Catch Block 1: 401/403 (Invalid Keys / Unauthorized)
      if (res.status === 401 || res.status === 403) {
        const errorText = await res.text().catch(() => '');
        const errorDetails = classifyApiError(res.status, providerId, errorText, url);
        recordClientProviderError(errorDetails);
        console.warn(`[Gateway Service] 401/403 Invalid Key/Auth: ${providerId}`, errorDetails.diagnosticFeedback);
        return { ok: false, data: null, error: errorDetails, skipped: true };
      }

      // Specific Catch Block 2: 429 (Rate Limits)
      if (res.status === 429) {
        const errorText = await res.text().catch(() => '');
        const errorDetails = classifyApiError(429, providerId, errorText, url);
        recordClientProviderError(errorDetails);
        console.warn(`[Gateway Service] 429 Rate Limit Exceeded: ${providerId}`, errorDetails.diagnosticFeedback);
        return { ok: false, data: null, error: errorDetails, skipped: true };
      }

      // Specific Catch Block 3: 5xx (Server Outages)
      if (res.status >= 500 && res.status < 600) {
        const errorText = await res.text().catch(() => '');
        const errorDetails = classifyApiError(res.status, providerId, errorText, url);
        recordClientProviderError(errorDetails);
        console.warn(`[Gateway Service] 5xx Server Outage: ${providerId}`, errorDetails.diagnosticFeedback);
        return { ok: false, data: null, error: errorDetails, skipped: true };
      }

      // Specific Catch Block 4: Other HTTP Errors (400, 404, etc.)
      const errorText = await res.text().catch(() => '');
      const errorDetails = classifyApiError(res.status, providerId, errorText, url);
      recordClientProviderError(errorDetails);
      return { ok: false, data: null, error: errorDetails, skipped: true };
    }

    // Success: 200 OK
    const data = await res.json();
    recordClientProviderSuccess(providerId, Math.round(performance.now() - start));
    return { ok: true, data, skipped: false };
  } catch (err: any) {
    // Specific Catch Block 5: Network / Connection / Timeout Errors
    const errorDetails = classifyNetworkOrTimeoutError(err, providerId, url);
    recordClientProviderError(errorDetails);
    console.warn(`[Gateway Service] Network/Timeout Failure: ${providerId}`, errorDetails.diagnosticFeedback);
    return { ok: false, data: null, error: errorDetails, skipped: true };
  }
}

/**
 * Parse upstream provider error strings (e.g., "unsplash: HTTP 401", "freesound: HTTP 429")
 * and register structured error feedback for AdminTelemetryModal.
 */
function parseAndRecordProviderErrorString(errorStr: string): void {
  if (!errorStr) return;

  // Pattern: "providerId: HTTP 401..." or "[providerId] 429..."
  const parts = errorStr.split(/:\s*/);
  const rawProvider = parts[0]?.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'unknown';
  const rest = parts.slice(1).join(': ') || errorStr;

  let statusCode = 0;
  const match = rest.match(/HTTP\s+(\d{3})/i) || rest.match(/status[:\s]+(\d{3})/i);
  if (match) {
    statusCode = parseInt(match[1], 10);
  }

  if (statusCode > 0) {
    const classification = classifyApiError(statusCode, rawProvider, rest);
    recordClientProviderError(classification);
  } else if (rest.toLowerCase().includes('timeout') || rest.toLowerCase().includes('aborted')) {
    const classification = classifyNetworkOrTimeoutError(new Error('timeout'), rawProvider);
    recordClientProviderError(classification);
  } else {
    recordClientProviderError({
      providerId: rawProvider,
      statusCode: 0,
      errorType: 'unknown',
      message: rest,
      diagnosticFeedback: `Provider ${formatProviderName(rawProvider)} encountered an issue: ${rest}. Provider skipped.`,
      recommendedAction: `Inspect upstream service logs.`,
      timestamp: new Date().toISOString()
    });
  }
}

export interface SearchResponse {
  results: ResourceItem[];
  totalCount: number;
  executionTimeMs: number;
  categoryCounts: Record<ResourceCategory, number>;
  sourceSummary: string;
  providerErrors?: string[];
  fallbackUsed?: string;
  primaryProviderUsed?: string;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  isFetchingMore?: boolean;
  isHarvesting?: boolean;
  cachedCount?: number;
}

/**
 * Universal Search Client with Multi-Tier Error Catch Blocks
 * Sends requests directly to backend API Gateway (POST /api/v1/search).
 * Catches 401/403, 429, 5xx with specific recovery handlers to guarantee zero crashes.
 */
export async function searchResources(filters: SearchFilters): Promise<SearchResponse> {
  const startTime = performance.now();
  const trimmedQuery = (filters.query || '').trim();

  // If query is empty and no specific category selected, return empty cleanly
  if (!trimmedQuery) {
    const userOwned = getUserOwnedResources();
    return {
      results: userOwned,
      totalCount: userOwned.length,
      executionTimeMs: 0,
      categoryCounts: computeCategoryCounts(userOwned),
      sourceSummary: userOwned.length > 0 ? 'User Content Vault' : 'No query specified',
      providerErrors: [],
      page: 1,
      pageSize: filters.pageSize || 24,
      totalPages: 1
    };
  }

  try {
    const res = await fetch('/api/v1/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...filters,
        page: filters.page || 1,
        pageSize: filters.pageSize || 24
      }),
      signal: AbortSignal.timeout(25000)
    });

    // Specific Catch Block: Gateway HTTP Status Evaluation
    if (!res.ok) {
      // 1. Specific catch for 401/403 (Invalid Keys / Unauthorized)
      if (res.status === 401 || res.status === 403) {
        const errorDetails = classifyApiError(res.status, 'api_gateway', `API Gateway Authentication Error (HTTP ${res.status})`);
        recordClientProviderError(errorDetails);
        console.warn('[Gateway Service] 401/403 Gateway Authentication Error:', errorDetails.diagnosticFeedback);

        const userOwned = getUserOwnedResources();
        return {
          results: userOwned,
          totalCount: userOwned.length,
          executionTimeMs: Math.round(performance.now() - startTime),
          categoryCounts: computeCategoryCounts(userOwned),
          sourceSummary: 'Authentication Required (HTTP 401/403)',
          providerErrors: [errorDetails.diagnosticFeedback],
          page: 1,
          pageSize: filters.pageSize || 24,
          totalPages: 1
        };
      }

      // 2. Specific catch for 429 (Rate Limits)
      if (res.status === 429) {
        const errorDetails = classifyApiError(429, 'api_gateway', 'API Gateway Rate Limit Exceeded');
        recordClientProviderError(errorDetails);
        console.warn('[Gateway Service] 429 Rate Limit Exceeded:', errorDetails.diagnosticFeedback);

        const userOwned = getUserOwnedResources();
        return {
          results: userOwned,
          totalCount: userOwned.length,
          executionTimeMs: Math.round(performance.now() - startTime),
          categoryCounts: computeCategoryCounts(userOwned),
          sourceSummary: 'Gateway Throttled (HTTP 429)',
          providerErrors: [errorDetails.diagnosticFeedback],
          page: 1,
          pageSize: filters.pageSize || 24,
          totalPages: 1
        };
      }

      // 3. Specific catch for 5xx (Server Errors)
      if (res.status >= 500 && res.status < 600) {
        const errorDetails = classifyApiError(res.status, 'api_gateway', `API Gateway Server Error (HTTP ${res.status})`);
        recordClientProviderError(errorDetails);
        console.warn(`[Gateway Service] 5xx Server Error (${res.status}):`, errorDetails.diagnosticFeedback);

        const userOwned = getUserOwnedResources();
        return {
          results: userOwned,
          totalCount: userOwned.length,
          executionTimeMs: Math.round(performance.now() - startTime),
          categoryCounts: computeCategoryCounts(userOwned),
          sourceSummary: `Gateway Unavailable (HTTP ${res.status})`,
          providerErrors: [errorDetails.diagnosticFeedback],
          page: 1,
          pageSize: filters.pageSize || 24,
          totalPages: 1
        };
      }

      throw new Error(`API Gateway returned HTTP ${res.status}`);
    }

    const data = await res.json();
    const retrieved: ResourceItem[] = data.results || [];

    // Parse and register provider-level errors reported by upstream federator
    if (Array.isArray(data.providerErrors)) {
      data.providerErrors.forEach((errStr: string) => {
        parseAndRecordProviderErrorString(errStr);
      });
    }

    // Also merge matching user-owned assets on page 1
    const userOwned = getUserOwnedResources();
    const matchingUserItems = (filters.page === 1 || !filters.page)
      ? userOwned.filter((item) => {
          if (filters.category !== 'all' && item.category !== filters.category) return false;
          const q = trimmedQuery.toLowerCase();
          const text = `${item.title} ${item.description || ''} ${item.creator?.name || ''}`.toLowerCase();
          return text.includes(q);
        })
      : [];

    const combined = [...matchingUserItems, ...retrieved];
    const categoryCounts = data.categoryCounts || computeCategoryCounts(combined);

    return {
      results: combined,
      totalCount: data.totalCount !== undefined ? data.totalCount + matchingUserItems.length : combined.length,
      executionTimeMs: data.executionTimeMs || Math.round(performance.now() - startTime),
      categoryCounts,
      sourceSummary: data.primaryProviderUsed || 'Live Upstream Providers',
      providerErrors: data.providerErrors || [],
      fallbackUsed: data.fallbackUsed,
      primaryProviderUsed: data.primaryProviderUsed,
      page: data.page || filters.page || 1,
      pageSize: data.pageSize || filters.pageSize || 24,
      totalPages: data.totalPages || 1,
      isFetchingMore: data.isFetchingMore,
      cachedCount: data.cachedCount
    };
  } catch (err: any) {
    // Specific catch block for network failures or client timeouts
    const errorDetails = classifyNetworkOrTimeoutError(err, 'api_gateway');
    recordClientProviderError(errorDetails);
    console.error('Failed to query search API:', errorDetails.diagnosticFeedback);

    const userOwned = getUserOwnedResources();
    return {
      results: userOwned,
      totalCount: userOwned.length,
      executionTimeMs: Math.round(performance.now() - startTime),
      categoryCounts: computeCategoryCounts(userOwned),
      sourceSummary: 'Network Error',
      providerErrors: [errorDetails.diagnosticFeedback],
      page: 1,
      pageSize: filters.pageSize || 24,
      totalPages: 1
    };
  }
}

export async function pollBackgroundIngest(query: string, category: string, knownCount: number) {
  try {
    const res = await fetch('/api/v1/search/poll-background', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, category, knownCount }),
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403 || res.status === 429 || res.status >= 500) {
        const error = classifyApiError(res.status, 'background_ingest');
        recordClientProviderError(error);
      }
      return null;
    }
    return await res.json();
  } catch (err: any) {
    const error = classifyNetworkOrTimeoutError(err, 'background_ingest');
    recordClientProviderError(error);
    return null;
  }
}

export async function triggerDeepSearch(query: string, category: string) {
  try {
    const res = await fetch('/api/v1/search/fetch-deep', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, category }),
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403 || res.status === 429 || res.status >= 500) {
        const error = classifyApiError(res.status, 'deep_search');
        recordClientProviderError(error);
      }
      return false;
    }
    return true;
  } catch (err: any) {
    const error = classifyNetworkOrTimeoutError(err, 'deep_search');
    recordClientProviderError(error);
    return false;
  }
}

export async function getCacheTelemetry() {
  try {
    const res = await fetch('/api/v1/system/cache-stats', { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Real telemetry from backend merged with client-side error classification.
 * Provides high-fidelity diagnostics to AdminTelemetryModal.
 */
export async function getLiveProviderHealth(): Promise<ProviderHealth[]> {
  try {
    const res = await fetch('/api/v1/system/providers', {
      signal: AbortSignal.timeout(5000)
    });

    if (!res.ok) {
      // Specific catch block for 401/403, 429, 5xx on telemetry endpoint
      if (res.status === 401 || res.status === 403) {
        console.warn('[Telemetry] Telemetry endpoint requires authentication (HTTP 401/403)');
        return getSynthesizedClientHealth();
      }
      if (res.status === 429) {
        console.warn('[Telemetry] Telemetry endpoint throttled (HTTP 429)');
        return getSynthesizedClientHealth();
      }
      if (res.status >= 500) {
        console.warn(`[Telemetry] Telemetry endpoint server error (HTTP ${res.status})`);
        return getSynthesizedClientHealth();
      }
      throw new Error(`Telemetry endpoint returned HTTP ${res.status}`);
    }

    const data = await res.json();
    const serverList: ProviderHealth[] = data.providers || [];

    // Merge server telemetry with client-side error tracking
    return serverList.map((p) => {
      const clientEntry = clientTelemetryRegistry.get(p.id);
      if (!clientEntry) return p;

      // If client caught a 401/403, 429, or 5xx, preserve that critical diagnostic feedback
      if (clientEntry.status !== 'healthy') {
        return {
          ...p,
          status: clientEntry.status,
          statusCode: clientEntry.lastError?.statusCode || p.statusCode,
          diagnosticFeedback: clientEntry.lastError?.diagnosticFeedback || p.diagnosticFeedback,
          recommendedAction: clientEntry.lastError?.recommendedAction || p.recommendedAction,
          lastErrorMessage: clientEntry.lastError?.message || p.lastErrorMessage,
          errors: Math.max(p.errors, clientEntry.errors)
        };
      }
      return p;
    });
  } catch (err: any) {
    console.warn('Failed to fetch server provider telemetry, utilizing client registry:', err.message);
    return getSynthesizedClientHealth();
  }
}

/**
 * Fallback generator for client telemetry if server telemetry endpoint is unreachable.
 */
function getSynthesizedClientHealth(): ProviderHealth[] {
  if (clientTelemetryRegistry.size === 0) {
    return [
      {
        id: 'wikimedia',
        name: 'Wikimedia Commons',
        category: 'Media & Documents',
        status: 'healthy',
        requests: 1,
        errors: 0,
        rateLimit: 'Open API'
      },
      {
        id: 'openalex',
        name: 'OpenAlex Scholarly',
        category: 'Research Papers',
        status: 'healthy',
        requests: 1,
        errors: 0,
        rateLimit: '100k/day'
      },
      {
        id: 'archive_books',
        name: 'Internet Archive Books',
        category: 'Digital Books',
        status: 'healthy',
        requests: 1,
        errors: 0,
        rateLimit: 'Public Access'
      }
    ];
  }

  return Array.from(clientTelemetryRegistry.values()).map((rec) => ({
    id: rec.id,
    name: rec.name,
    category: rec.category,
    status: rec.status,
    latencyMs: rec.lastLatencyMs,
    lastSuccess: rec.lastSuccess,
    lastFailure: rec.lastError?.timestamp,
    requests: rec.requests,
    errors: rec.errors,
    statusCode: rec.lastError?.statusCode,
    diagnosticFeedback: rec.lastError?.diagnosticFeedback,
    recommendedAction: rec.lastError?.recommendedAction,
    lastErrorMessage: rec.lastError?.message
  }));
}

// Download real asset through backend stream
export async function downloadRealAsset(
  url: string,
  filename: string
): Promise<{ blob: Blob; realSha256?: string }> {
  try {
    const res = await fetch(`/api/v1/resources/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, filename }),
      signal: AbortSignal.timeout(30000)
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403 || res.status === 429 || res.status >= 500) {
        const error = classifyApiError(res.status, 'download_stream', `Download failed with HTTP ${res.status}`);
        recordClientProviderError(error);
      }

      // Fallback to proxy
      const fallbackRes = await fetch(`/api/download-proxy?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`, {
        signal: AbortSignal.timeout(30000)
      });
      if (!fallbackRes.ok) {
        throw new Error(`Download failed with status ${fallbackRes.status}`);
      }
      const blob = await fallbackRes.blob();
      return { blob };
    }

    const sha256 = res.headers.get('X-URMIL-SHA256') || undefined;
    const blob = await res.blob();
    return { blob, realSha256: sha256 };
  } catch (err: any) {
    const error = classifyNetworkOrTimeoutError(err, 'download_stream');
    recordClientProviderError(error);
    throw err;
  }
}

function computeCategoryCounts(items: ResourceItem[]): Record<ResourceCategory, number> {
  return {
    all: items.length,
    images: items.filter((i) => i.category === 'images').length,
    videos: items.filter((i) => i.category === 'videos').length,
    gifs: items.filter((i) => i.category === 'gifs').length,
    music: items.filter((i) => i.category === 'music').length,
    audio: items.filter((i) => i.category === 'audio').length,
    papers: items.filter((i) => i.category === 'papers').length,
    books: items.filter((i) => i.category === 'books').length,
    maps: items.filter((i) => i.category === 'maps').length,
    weather: items.filter((i) => i.category === 'weather').length,
    datasets: items.filter((i) => i.category === 'datasets').length,
    art: items.filter((i) => i.category === 'art').length,
    code: items.filter((i) => i.category === 'code').length,
    finance: items.filter((i) => i.category === 'finance').length,
    biodiversity: items.filter((i) => i.category === 'biodiversity').length,
    knowledge: items.filter((i) => i.category === 'knowledge').length,
    food: items.filter((i) => i.category === 'food').length,
    games: items.filter((i) => i.category === 'games').length,
    '3d': items.filter((i) => i.category === '3d').length,
    nasa: items.filter((i) => i.category === 'nasa').length
  };
}

export function getAllCategories(): { id: ResourceCategory; label: string; icon: string }[] {
  return [
    { id: 'all', label: 'All Resources', icon: '✨' },
    { id: 'nasa', label: 'NASA Space', icon: '🚀' },
    { id: 'images', label: 'Images', icon: '🖼️' },
    { id: 'videos', label: 'Videos', icon: '🎬' },
    { id: '3d', label: '3D Assets', icon: '🧊' },
    { id: 'gifs', label: 'GIFs', icon: '🎞️' },
    { id: 'music', label: 'Music', icon: '🎵' },
    { id: 'audio', label: 'Audio', icon: '🔊' },
    { id: 'papers', label: 'Research', icon: '📚' },
    { id: 'books', label: 'Books', icon: '📖' },
    { id: 'maps', label: 'Maps', icon: '🗺️' },
    { id: 'weather', label: 'Weather', icon: '🌤️' },
    { id: 'datasets', label: 'Datasets', icon: '📊' },
    { id: 'art', label: 'Art', icon: '🎨' },
    { id: 'code', label: 'Code', icon: '💻' },
    { id: 'finance', label: 'Finance', icon: '📈' },
    { id: 'biodiversity', label: 'Biodiversity', icon: '🌿' },
    { id: 'knowledge', label: 'Knowledge', icon: '🌐' },
    { id: 'food', label: 'Food', icon: '🍳' },
    { id: 'games', label: 'Games', icon: '🎮' }
  ];
}

export interface SingleProviderTestResult {
  providerId: string;
  success: boolean;
  status: 'healthy' | 'empty' | 'error';
  latencyMs: number;
  itemCount: number;
  sampleTitle?: string;
  error?: string;
}

export interface BenchmarkSuiteResult {
  totalTested: number;
  passed: number;
  empty: number;
  errors: number;
  executionTimeMs: number;
  results: SingleProviderTestResult[];
}

export async function testProviderCanary(providerId: string, query?: string): Promise<SingleProviderTestResult> {
  const res = await fetch(`/api/v1/system/test-provider/${encodeURIComponent(providerId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  if (!res.ok) {
    throw new Error(`Canary test failed with status ${res.status}`);
  }
  return await res.json();
}

export async function runSystemBenchmarkSuite(providerIds?: string[]): Promise<BenchmarkSuiteResult> {
  const res = await fetch('/api/v1/system/benchmark', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ providerIds })
  });
  if (!res.ok) {
    throw new Error(`Benchmark failed with status ${res.status}`);
  }
  return await res.json();
}
