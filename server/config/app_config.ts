const resolvedEnv = process.env.NODE_ENV || 'production';

export const APP_CONFIG = Object.freeze({
  port: 3000,
  host: '0.0.0.0',
  environment: resolvedEnv,
  isProduction: resolvedEnv === 'production',

  // Reverse proxy trust: default to false (zero proxy trust for direct deployments),
  // unless explicitly configured via TRUST_PROXY or running in known container environment (Cloud Run / K_SERVICE)
  trustProxy: process.env.TRUST_PROXY !== undefined
    ? (process.env.TRUST_PROXY === 'true' ? true : process.env.TRUST_PROXY === 'false' ? false : isNaN(Number(process.env.TRUST_PROXY)) ? process.env.TRUST_PROXY : Number(process.env.TRUST_PROXY))
    : (Boolean(process.env.K_SERVICE || process.env.GOOGLE_CLOUD_PROJECT) ? 1 : false),

  adminSecretKey: process.env.ADMIN_SECRET_KEY || process.env.BENCHMARK_SECRET_KEY,
  
  // Rate Limiting (per IP window)
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 300,    // 300 requests per minute
  },

  // Media Proxy
  mediaProxy: {
    maxEntries: 1000,
    upstreamTimeoutMs: 20000,
    wikimediaTimeoutMs: 20000,
    browserCacheSeconds: 2592000, // 30 days
  },

  // Search Engine & Caching
  search: {
    defaultPageSize: 24,
    maxPageSize: 100,
    cacheTtlMs: 300000, // 5 minutes fresh TTL
    providerTimeoutMs: 3500,
    fastQuorumTimeoutMs: 1500,
    fastQuorumTarget: 45,
  },

  // Download & Verification
  download: {
    timeoutMs: 20000,
    maxSizeBytes: 100 * 1024 * 1024, // 100 MB max stream
  }
});
