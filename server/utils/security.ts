import dns from 'dns';
import http from 'http';
import https from 'https';
import { Readable } from 'stream';
import { APP_CONFIG } from '../config/app_config';

/**
 * Security validation utilities to protect against SSRF, DNS-rebinding,
 * header injection, and malicious parameter tampering.
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
 * Checks whether an IP address belongs to private, loopback, link-local,
 * multicast, carrier-grade NAT, or reserved networks.
 */
export function isPrivateIpAddress(ip: string): boolean {
  if (!ip || typeof ip !== 'string') return true;
  let cleanIp = ip.trim().toLowerCase();

  // Strip IPv6 brackets if present
  if (cleanIp.startsWith('[') && cleanIp.endsWith(']')) {
    cleanIp = cleanIp.slice(1, -1);
  }

  // Handle IPv4-mapped IPv6 addresses (e.g. ::ffff:127.0.0.1 or ::ffff:7f00:1)
  if (cleanIp.startsWith('::ffff:')) {
    cleanIp = cleanIp.substring(7);
  }

  // Check IPv4 ranges
  const ipv4Parts = cleanIp.split('.');
  if (ipv4Parts.length === 4 && ipv4Parts.every(p => /^\d+$/.test(p) && Number(p) >= 0 && Number(p) <= 255)) {
    const [b0, b1] = ipv4Parts.map(Number);
    if (b0 === 0) return true; // 0.0.0.0/8
    if (b0 === 10) return true; // 10.0.0.0/8 Private
    if (b0 === 127) return true; // 127.0.0.0/8 Loopback
    if (b0 === 169 && b1 === 254) return true; // 169.254.0.0/16 Link-local / Cloud metadata
    if (b0 === 172 && b1 >= 16 && b1 <= 31) return true; // 172.16.0.0/12 Private
    if (b0 === 192 && b1 === 168) return true; // 192.168.0.0/16 Private
    if (b0 === 100 && b1 >= 64 && b1 <= 127) return true; // 100.64.0.0/10 CG-NAT
    if (b0 === 192 && b1 === 0) return true; // 192.0.0.0/24 & 192.0.2.0/24 TEST-NET-1
    if (b0 === 198 && (b1 === 18 || b1 === 19)) return true; // 198.18.0.0/15
    if (b0 === 198 && b1 === 51) return true; // 198.51.100.0/24 TEST-NET-2
    if (b0 === 203 && b1 === 0) return true; // 203.0.113.0/24 TEST-NET-3
    if (b0 >= 224 && b0 <= 239) return true; // 224.0.0.0/4 Multicast
    if (b0 >= 240) return true; // 240.0.0.0/4 Reserved
    return false;
  }

  // Check IPv6 ranges
  if (cleanIp.includes(':')) {
    if (cleanIp === '::' || cleanIp === '::1') return true; // Unspecified or Loopback
    if (cleanIp.startsWith('fe80:')) return true; // Link-local
    if (cleanIp.startsWith('fc00:') || cleanIp.startsWith('fd00:')) return true; // Unique local
    if (cleanIp.startsWith('ff00:') || cleanIp.startsWith('ff02:')) return true; // Multicast
    if (cleanIp.startsWith('2001:db8:')) return true; // Documentation
    return false;
  }

  return false;
}

/**
 * Synchronously validates that a target URL has a safe syntax, valid protocol,
 * authorized port, and no obvious private IP strings.
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

    // If literal IP address, verify using IP checker
    if (isPrivateIpAddress(hostname)) {
      return false;
    }

    // Must have a valid standard public hostname or domain
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolves the hostname via DNS and verifies that NONE of the resolved IP addresses
 * are private, loopback, link-local, multicast, or metadata endpoints.
 * Closes the time-of-check / time-of-use DNS rebinding window by verifying DNS immediately
 * without reusing stale positive cache entries on arbitrary hosts.
 */
export async function isSafePublicUrlAsync(targetUrl?: string): Promise<boolean> {
  if (!isSafePublicUrl(targetUrl)) {
    return false;
  }

  try {
    const parsed = new URL(targetUrl!.trim());
    let hostname = parsed.hostname.toLowerCase().trim();
    if (hostname.startsWith('[') && hostname.endsWith(']')) {
      hostname = hostname.slice(1, -1);
    }

    // If it's a literal IP
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || hostname.includes(':')) {
      return !isPrivateIpAddress(hostname);
    }

    // Immediately resolve all IPv4 and IPv6 addresses for the hostname
    const records = await dns.promises.lookup(hostname, { all: true });
    if (!records || records.length === 0) {
      return false;
    }

    // If ANY resolved IP address is private or reserved, reject destination immediately
    for (const record of records) {
      if (isPrivateIpAddress(record.address)) {
        return false;
      }
    }

    return true;
  } catch {
    // DNS resolution failure
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

// Connection-time socket DNS lookup hook to eliminate DNS rebinding TOCTOU window (BUG-005)
function safeSocketLookup(
  hostname: string,
  options: any,
  callback: (err: Error | null, address?: any, family?: number) => void
) {
  dns.lookup(hostname, { all: true }, (err, addresses) => {
    if (err) return callback(err);
    if (!addresses || addresses.length === 0) {
      return callback(new Error(`DNS resolution returned no records for host: ${hostname}`));
    }
    // Verify that EVERY resolved address for this hostname is non-private and non-reserved
    for (const record of addresses) {
      if (isPrivateIpAddress(record.address)) {
        return callback(new Error(`SSRF Blocked: Host ${hostname} resolved to private/reserved IP ${record.address}`));
      }
    }
    if (options && options.all) {
      return callback(null, addresses);
    }
    callback(null, addresses[0].address, addresses[0].family);
  });
}

const safeHttpAgent = new http.Agent({
  keepAlive: false,
  lookup: safeSocketLookup
});

const safeHttpsAgent = new https.Agent({
  keepAlive: false,
  lookup: safeSocketLookup
});

async function executeBoundHttpRequest(
  targetUrl: string,
  options: RequestInit = {}
): Promise<globalThis.Response> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(targetUrl);
    const isHttps = parsed.protocol === 'https:';
    const client = isHttps ? https : http;
    const agent = isHttps ? safeHttpsAgent : safeHttpAgent;

    const headers: Record<string, string> = {};
    if (options.headers) {
      if (typeof (options.headers as any).forEach === 'function') {
        (options.headers as any).forEach((value: string, key: string) => {
          headers[key] = value;
        });
      } else if (Array.isArray(options.headers)) {
        for (const [k, v] of options.headers) {
          headers[k] = v;
        }
      } else {
        Object.assign(headers, options.headers);
      }
    }

    const req = client.request(
      parsed,
      {
        method: options.method || 'GET',
        headers,
        agent,
        signal: options.signal as any
      },
      (res) => {
        const resHeaders = new Headers();
        for (const [key, val] of Object.entries(res.headers)) {
          if (Array.isArray(val)) {
            for (const v of val) resHeaders.append(key, v);
          } else if (val !== undefined) {
            resHeaders.set(key, val);
          }
        }

        const webStream = Readable.toWeb(res);
        const response = new Response(webStream as any, {
          status: res.statusCode || 200,
          statusText: res.statusMessage || '',
          headers: resHeaders
        });

        resolve(response);
      }
    );

    req.on('error', (err) => reject(err));

    if (options.body) {
      if (typeof options.body === 'string' || Buffer.isBuffer(options.body)) {
        req.write(options.body);
      }
    }

    req.end();
  });
}

/**
 * Safe fetch wrapper with manual redirect following to prevent SSRF redirect bypasses.
 * Enforces destination DNS and IP validation upfront and at TCP socket connect time.
 */
export async function safeFetch(
  initialUrl: string,
  options: RequestInit & { maxRedirects?: number } = {}
): Promise<globalThis.Response> {
  let currentUrl = initialUrl;
  const maxRedirects = options.maxRedirects ?? 5;

  for (let i = 0; i <= maxRedirects; i++) {
    const isSafe = await isSafePublicUrlAsync(currentUrl);
    if (!isSafe) {
      throw new Error(`SSRF Validation Failed: Destination is not an authorized public URL or resolved to a private/internal IP (${currentUrl})`);
    }

    const fetchOptions: RequestInit = {
      ...options,
      redirect: 'manual'
    };

    // Connect via bound agents that validate destination IP right at socket creation time
    const response = await executeBoundHttpRequest(currentUrl, fetchOptions);

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
