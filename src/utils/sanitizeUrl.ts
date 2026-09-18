/**
 * Client-side URL sanitizer to prevent XSS via javascript: or data: URIs in anchor tags.
 * Only allows valid http: and https: protocols.
 */
export function sanitizeSafeLink(rawUrl?: string): string | undefined {
  if (!rawUrl || typeof rawUrl !== 'string') return undefined;

  const trimmed = rawUrl.trim();
  // Check for harmless empty or relative paths (if any)
  if (trimmed.startsWith('/')) return trimmed;

  try {
    const parsed = new URL(trimmed);
    const protocol = parsed.protocol.toLowerCase();
    if (protocol === 'http:' || protocol === 'https:') {
      return trimmed;
    }
  } catch {
    // Malformed URL
    return undefined;
  }

  return undefined;
}
