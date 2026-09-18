export interface ProviderTracker {
  id: string;
  name: string;
  category: string;
  requests: number;
  errors: number;
  lastLatencyMs?: number;
  lastSuccess: string | null;
  lastFailure: string | null;
  status: 'healthy' | 'degraded' | 'rate_limited' | 'offline' | 'auth_failed' | 'server_error';
  rateLimit: string;
  authRequired: boolean;
  authConfigured: boolean;
  lastErrorMessage?: string;
  lastStatusCode?: number;
  diagnosticFeedback?: string;
  recommendedAction?: string;
}

export const PROVIDER_TRACKERS: Record<string, ProviderTracker> = {};

export function registerTracker(config: {
  id: string;
  name: string;
  category: string;
  rateLimit: string;
  authRequired: boolean;
  authConfigured: boolean;
}): ProviderTracker {
  if (!PROVIDER_TRACKERS[config.id]) {
    PROVIDER_TRACKERS[config.id] = {
      ...config,
      requests: 0,
      errors: 0,
      lastSuccess: null,
      lastFailure: null,
      status: 'healthy'
    };
  } else {
    // Keep updated status
    PROVIDER_TRACKERS[config.id].authConfigured = config.authConfigured;
  }
  return PROVIDER_TRACKERS[config.id];
}

export function recordProviderSuccess(id: string, latencyMs: number): void {
  const tracker = PROVIDER_TRACKERS[id];
  if (!tracker) return;
  tracker.requests += 1;
  tracker.lastLatencyMs = latencyMs;
  tracker.lastSuccess = new Date().toISOString();
  if (tracker.status === 'offline' || tracker.status === 'degraded' || tracker.status === 'server_error' || tracker.status === 'rate_limited') {
    tracker.status = 'healthy';
  }
}

export function recordProviderFailure(id: string, errorMsg: string, statusCode?: number): void {
  const tracker = PROVIDER_TRACKERS[id];
  if (!tracker) return;
  tracker.requests += 1;
  tracker.errors += 1;
  tracker.lastFailure = new Date().toISOString();

  // Extract HTTP status code from message if not explicitly provided
  let code = statusCode;
  if (!code && errorMsg) {
    const match = errorMsg.match(/HTTP\s+(\d{3})/i) || errorMsg.match(/status[:\s]+(\d{3})/i);
    if (match) code = parseInt(match[1], 10);
  }

  tracker.lastErrorMessage = errorMsg;
  tracker.lastStatusCode = code;

  // Specific classification for 401/403 (Invalid Keys), 429 (Rate Limits), and 5xx (Server Errors)
  if (code === 401 || code === 403) {
    tracker.status = 'auth_failed';
    tracker.diagnosticFeedback = `Invalid API Key or Unauthorized (HTTP ${code}). Provider skipped without crashing search pipeline.`;
    tracker.recommendedAction = `Verify API credentials in environment settings.`;
  } else if (code === 429) {
    tracker.status = 'rate_limited';
    tracker.diagnosticFeedback = `Rate Limit Reached (HTTP 429). Provider temporarily throttled. Safely skipped.`;
    tracker.recommendedAction = `Requests are throttled. Wait for provider quota reset.`;
  } else if (code && code >= 500 && code < 600) {
    tracker.status = 'server_error';
    tracker.diagnosticFeedback = `Upstream Server Error (HTTP ${code}). External service is experiencing outages. Gracefully skipped.`;
    tracker.recommendedAction = `External upstream failure. System will retry on subsequent searches.`;
  } else if (errorMsg.includes('timeout') || errorMsg.includes('aborted')) {
    tracker.status = 'offline';
    tracker.diagnosticFeedback = `Request timed out. Provider skipped to maintain fast client response time.`;
    tracker.recommendedAction = `Network latency spike detected.`;
  } else if (tracker.errors > 5 && tracker.errors / tracker.requests > 0.5) {
    tracker.status = 'degraded';
    tracker.diagnosticFeedback = `High error frequency (${tracker.errors}/${tracker.requests} failed).`;
    tracker.recommendedAction = `Provider stability degraded.`;
  } else {
    tracker.diagnosticFeedback = errorMsg;
  }
}
