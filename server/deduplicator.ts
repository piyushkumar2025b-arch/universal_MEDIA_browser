import { ResourceItem } from '../src/types/resource';

function cleanUrl(rawUrl?: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  try {
    const parsed = new URL(rawUrl);
    // Remove transient tracking and resizing query params
    const stripParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'token', 'access_token',
      'ts', 'timestamp', 'cache', 'nocache', 'rand', 'rnd', 'session'
    ];
    stripParams.forEach((p) => parsed.searchParams.delete(p));
    // Normalize protocol
    parsed.protocol = 'https:';
    // Remove trailing slash
    let res = parsed.toString().toLowerCase();
    if (res.endsWith('/')) res = res.slice(0, -1);
    return res;
  } catch {
    return rawUrl.toLowerCase().trim().replace(/^http:\/\//, 'https://').replace(/\/+$/, '');
  }
}

function cleanTitle(rawTitle?: string): string {
  if (!rawTitle || typeof rawTitle !== 'string') return '';
  return rawTitle
    .toLowerCase()
    .replace(/^file:/i, '')
    .replace(/\.(jpg|jpeg|png|gif|webp|svg|mp4|webm|mp3|wav|pdf|csv|json|zip)$/i, '')
    .replace(/\[[^\]]*\]|\([^\)]*\)/g, '') // remove bracketed metadata tags
    .replace(/[^\w\s]/gi, ' ') // replace punctuation with space
    .replace(/\s+/g, ' ')
    .trim();
}

export function deduplicateResources(items: ResourceItem[]): ResourceItem[] {
  const seenCanonicalUrls = new Set<string>();
  const seenMediaUrls = new Set<string>();
  const seenDois = new Set<string>();
  const seenExternalIds = new Set<string>();
  const seenTitleFingerprints = new Set<string>();
  const output: ResourceItem[] = [];

  for (const item of items) {
    if (!item || !item.id) continue;

    // 1. DOI check for scientific papers & datasets
    const rawDoi = item.attributes?.doi?.toLowerCase().trim();
    if (rawDoi) {
      if (seenDois.has(rawDoi)) continue;
      seenDois.add(rawDoi);
    }

    // 2. External ID within provider
    if (item.source?.providerId && item.source?.externalId) {
      const extKey = `${item.source.providerId}::${String(item.source.externalId).trim()}`;
      if (seenExternalIds.has(extKey)) continue;
      seenExternalIds.add(extKey);
    }

    // 3. Media Download URL check
    const canonicalDownload = cleanUrl(item.downloadUrl);
    if (canonicalDownload && canonicalDownload.startsWith('http')) {
      if (seenCanonicalUrls.has(canonicalDownload)) continue;
      seenCanonicalUrls.add(canonicalDownload);
    }

    // 4. Media Preview / Thumbnail URL check (especially for images, videos, GIFs)
    const canonicalPreview = cleanUrl(item.previewUrl || item.thumbnailUrl);
    if (canonicalPreview && canonicalPreview.startsWith('http')) {
      if (seenMediaUrls.has(canonicalPreview)) continue;
      seenMediaUrls.add(canonicalPreview);
    }

    // 5. Title + Category + Creator Fingerprint
    const normalizedTitle = cleanTitle(item.title);
    if (normalizedTitle.length >= 4) {
      const creator = cleanTitle(item.creator?.name || '');
      const titleKey = `${item.category}::${normalizedTitle}::${creator}`;
      if (seenTitleFingerprints.has(titleKey)) continue;
      seenTitleFingerprints.add(titleKey);
    }

    output.push(item);
  }

  return output;
}

