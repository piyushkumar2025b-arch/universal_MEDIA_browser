export const APP_CONFIG = Object.freeze({
  port: 3000,
  host: '0.0.0.0',
  environment: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  
  // Rate Limiting (per IP window)
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 300,    // 300 requests per minute
  },

  // Media Proxy
  mediaProxy: {
    maxEntries: 1000,
    upstreamTimeoutMs: 6000,
    wikimediaTimeoutMs: 8000,
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
