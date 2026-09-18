import { APP_CONFIG } from '../config/app_config';

/**
 * Security validation utilities to protect against SSRF, header injection,
 * and malicious parameter tampering.
 */

// Private & reserved IP range patterns
const PRIVATE_IP_PATTERNS = [
  /^localhost$/i,
  /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, // 127.0.0.0/8 Loopback
  /^0\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,   // 0.0.0.0/8 Current network
  /^::1$/,                           // IPv6 loopback
  /^\[::1\]$/,
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, // 10.0.0.0/8 Private
  /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/, // 172.16.0.0/12 Private
  /^192\.168\.\d{1,3}\.\d{1,3}$/,    // 192.168.0.0/16 Private
  /^169\.254\.\d{1,3}\.\d{1,3}$/,    // 169.254.0.0/16 Link-Local / Cloud Metadata
  /^100\.(6[4-9]|[7-9]\d|1[0-1]\d|12[0-7])\.\d{1,3}\.\d{1,3}$/, // 100.64.0.0/10 Carrier Grade NAT
  /^192\.0\.(0|2)\.\d{1,3}$/,        // IETF & TEST-NET-1
  /^198\.51\.100\.\d{1,3}$/,         // TEST-NET-2
  /^203\.0\.113\.\d{1,3}$/,          // TEST-NET-3
  /^198\.(1[8-9])\.\d{1,3}\.\d{1,3}$/, // Benchmarking
  /^(22[4-9]|23\d|24\d|25[0-5])\./,   // Multicast (224.0.0.0/4) & Reserved (240.0.0.0/4)
  /^255\.255\.255\.255$/,            // Broadcast
  /^metadata\.google\.internal$/i,   // GCP metadata
  /^metadata$/i,
  /^instance-data$/i,                // AWS metadata
  /.*\.internal$/i,
  /.*\.local$/i,
  /.*\.lan$/i,
  /.*\.corp$/i,
  /.*\.home$/i,
  /.*\.intranet$/i,
  /.*\.onion$/i
];

// Dangerous internal database, cache, and system infrastructure ports to always block
const BLOCKED_INTERNAL_PORTS = new Set([
  APP_CONFIG.port,
  21, 22, 23, 25, 53, 110, 111, 135, 137, 138, 139, 143, 445,
  1433, 1521, 2049, 2375, 2376, 3000, 3306, 5000, 5432, 6379,
  8081, 9200, 9300, 11211, 27017, 28017
]);

/**
 * Validates that a target URL is safe to fetch from the server.
 * Blocks non-HTTP/HTTPS protocols, localhosts, private IPs, cloud metadata,
 * dangerous ports, and auth credentials.
 */
export function isSafePublicUrl(targetUrl?: string): boolean {
  if (!targetUrl || typeof targetUrl !== 'string') return false;
  
  const trimmed = targetUrl.trim();
  if (trimmed.length > 2048) return false;
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return false;
  }

  try {
    const parsed = new URL(trimmed);
    const protocol = parsed.protocol.toLowerCase();
    if (protocol !== 'http:' && protocol !== 'https:') {
      return false;
    }

    // Disallow userinfo/credentials in URL to prevent URL confusion attacks
    if (parsed.username || parsed.password) {
      return false;
    }

    // Restrict ports: block dangerous internal ports, privileged system ports (< 1024 except 80/443), and self-port
    if (parsed.port) {
      const portNum = Number(parsed.port);
      if (isNaN(portNum) || portNum <= 0 || portNum > 65535) {
        return false;
      }
      if (BLOCKED_INTERNAL_PORTS.has(portNum) || portNum === APP_CONFIG.port) {
        return false;
      }
      if (portNum < 1024 && portNum !== 80 && portNum !== 443) {
        return false;
      }
    }

    let hostname = parsed.hostname.toLowerCase().trim();
    if (!hostname) return false;

    // Remove IPv6 brackets if present for pattern matching
    if (hostname.startsWith('[') && hostname.endsWith(']')) {
      hostname = hostname.slice(1, -1);
    }

    // Disallow IPv4-mapped IPv6, loopback, or unspecified IPv6 literals
    if (hostname.includes('ffff:') || hostname.startsWith('::') || hostname === '::1') {
      return false;
    }

    // Check against forbidden private / metadata patterns
    for (const pattern of PRIVATE_IP_PATTERNS) {
      if (pattern.test(hostname)) {
        return false;
      }
    }

    // Check for IPv6 link-local and unique-local
    if (hostname.startsWith('fe80:') || hostname.startsWith('fc00:') || hostname.startsWith('fd00:')) {
      return false;
    }

    // Check for integer / octal / hex IP representation bypasses (e.g. 2130706433 or 0x7f000001)
    if (/^\d+$/.test(hostname) || /^0x[0-9a-f]+$/i.test(hostname)) {
      return false;
    }

    // Must have a valid standard public hostname or domain
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitizes download filenames to prevent HTTP response splitting, CRLF injection,
 * and directory path traversal attacks.
 */
export function sanitizeSafeFilename(rawFilename?: string, fallback = 'download'): string {
  if (!rawFilename || typeof rawFilename !== 'string') return fallback;
  
  // 1. Strip CRLF, control characters and null bytes
  let cleaned = rawFilename.replace(/[\r\n\0\x00-\x1F\x7F]/g, '');
  
  // 2. Strip directory traversal tokens
  cleaned = cleaned.replace(/\.\./g, '').replace(/[/\\]/g, '_');
  
  // 3. Remove forbidden header characters
  cleaned = cleaned.replace(/["';,]/g, '_').trim();
  
  // 4. Fallback if empty or purely invalid
  return cleaned || fallback;
}

/**
 * Safe fetch wrapper with manual redirect following to prevent SSRF redirect bypasses.
 * Enforces destination validation on every hop.
 */
export async function safeFetch(
  initialUrl: string,
  options: RequestInit & { maxRedirects?: number } = {}
): Promise<globalThis.Response> {
  let currentUrl = initialUrl;
  const maxRedirects = options.maxRedirects ?? 5;

  for (let i = 0; i <= maxRedirects; i++) {
    if (!isSafePublicUrl(currentUrl)) {
      throw new Error(`SSRF Validation Failed: Destination is not an authorized public URL (${currentUrl})`);
    }

    const fetchOptions: RequestInit = {
      ...options,
      redirect: 'manual'
    };

    const response = await fetch(currentUrl, fetchOptions);

    // If not a redirect status (301, 302, 303, 307, 308), return response
    if (response.status < 300 || response.status >= 400) {
      return response;
    }

    // Extract redirect location
    const location = response.headers.get('location');
    if (!location) {
      return response;
    }

    // Resolve redirect location against current URL
    try {
      currentUrl = new URL(location, currentUrl).toString();
    } catch {
      throw new Error(`Invalid redirect Location received from upstream: ${location}`);
    }
  }

  throw new Error(`Exceeded maximum redirect limit (${maxRedirects})`);
}
