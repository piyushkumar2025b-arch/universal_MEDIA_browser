import JSZip from 'jszip';
import { ResourceItem } from '../types/resource';

export type DownloadStatus = 'confirmed' | 'dispatched' | 'failed';

export interface DownloadResult {
  success: boolean;
  status: DownloadStatus;
  method: string;
}

export const MAX_BATCH_ITEMS = 50;
export const MAX_BATCH_BYTES = 250 * 1024 * 1024; // 250 MB

export interface DownloadOptions {
  mode?: 'proxy' | 'direct' | 'metadata' | 'citation';
  fallbackToDirectWindow?: boolean;
  onProgress?: (progressPercent: number, statusText: string) => void;
}

export interface AssetUrlResult {
  url: string;
  fallbackUrl?: string;
  isDirectDownloadable: boolean;
}

/**
 * Returns the best downloadable binary or asset URL for a given item.
 * Strictly separates authentic binary files from web pages and low-res thumbnails.
 */
export function getBestAssetUrl(item: ResourceItem): AssetUrlResult {
  const isDirectImage = (u?: string | null) => Boolean(u && /\.(jpe?g|png|webp|avif|gif|svg|tiff?)(\?.*)?$/i.test(u));
  const isDirectMedia = (u?: string | null) => Boolean(u && /\.(mp3|mp4|webm|wav|ogg|flac|m4a|zip|gz|tar|csv|json|pdf|epub)(\?.*)?$/i.test(u));

  // 1. Explicit direct download URL or PDF
  if (item.downloadUrl && item.downloadUrl.startsWith('http')) {
    return {
      url: item.downloadUrl,
      fallbackUrl: item.attributes?.pdfUrl || undefined,
      isDirectDownloadable: true
    };
  }

  if (item.attributes?.pdfUrl && item.attributes.pdfUrl.startsWith('http')) {
    return {
      url: item.attributes.pdfUrl,
      fallbackUrl: undefined,
      isDirectDownloadable: true
    };
  }

  // 2. Direct full-resolution preview ONLY if it is an actual media binary file (not HTML or low-res thumbnail)
  if (item.previewUrl && item.previewUrl.startsWith('http') && (isDirectImage(item.previewUrl) || isDirectMedia(item.previewUrl))) {
    return {
      url: item.previewUrl,
      fallbackUrl: undefined,
      isDirectDownloadable: true
    };
  }

  // 3. No direct binary download exists (e.g. paper manuscript page, code repo, or online dataset record)
  // Low-resolution thumbnails are NEVER masqueraded as original downloads.
  const externalSourceUrl = (item.source?.resourceUrl && item.source.resourceUrl.startsWith('http'))
    ? item.source.resourceUrl
    : (item.previewUrl && item.previewUrl.startsWith('http')) ? item.previewUrl : '';

  return {
    url: externalSourceUrl,
    fallbackUrl: undefined,
    isDirectDownloadable: false
  };
}

/**
 * Generates an appropriate file extension for the resource based on category and attributes.
 */
export function getAssetExtension(item: ResourceItem): string {
  const rawFormat = (item.attributes?.format || '').toLowerCase().trim();
  if (rawFormat.includes('pdf')) return 'pdf';
  if (rawFormat.includes('jpeg') || rawFormat.includes('jpg')) return 'jpg';
  if (rawFormat.includes('png')) return 'png';
  if (rawFormat.includes('webp')) return 'webp';
  if (rawFormat.includes('gif')) return 'gif';
  if (rawFormat.includes('mp3')) return 'mp3';
  if (rawFormat.includes('wav')) return 'wav';
  if (rawFormat.includes('ogg')) return 'ogg';
  if (rawFormat.includes('mp4')) return 'mp4';
  if (rawFormat.includes('webm')) return 'webm';
  if (rawFormat.includes('zip')) return 'zip';
  if (rawFormat.includes('csv')) return 'csv';
  if (rawFormat.includes('json') || rawFormat.includes('geojson')) return 'json';

  // Fallback by category
  switch (item.category) {
    case 'images':
    case 'art':
    case 'biodiversity':
      return 'jpg';
    case 'gifs':
      return 'gif';
    case 'videos':
      return 'mp4';
    case 'music':
    case 'audio':
      return 'mp3';
    case 'papers':
    case 'books':
      return item.attributes?.pdfUrl ? 'pdf' : 'epub';
    case 'code':
      return 'zip';
    case 'datasets':
    case 'maps':
    case 'weather':
    case 'finance':
    case 'food':
    case 'games':
    case 'knowledge':
      return 'json';
    default:
      return 'bin';
  }
}

/**
 * Produces a filesystem-safe sanitized filename.
 */
export function getSanitizedFilename(item: ResourceItem, extension?: string): string {
  const ext = extension || getAssetExtension(item);
  const cleanTitle = (item.title || 'resource')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 50)
    .replace(/^_|_$/g, '');

  return `${cleanTitle || 'resource'}.${ext}`;
}

/**
 * Triggers a native browser file download from a Blob or URL.
 */
export function triggerBrowserDownload(urlOrBlob: string | Blob, filename: string): void {
  if (typeof document === 'undefined') {
    return;
  }
  const a = document.createElement('a');
  let objectUrl: string | null = null;

  if (urlOrBlob instanceof Blob) {
    objectUrl = URL.createObjectURL(urlOrBlob);
    a.href = objectUrl;
  } else {
    a.href = urlOrBlob;
  }

  a.download = filename;
  a.rel = 'noopener noreferrer';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    try {
      document.body.removeChild(a);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    } catch {}
  }, 2000);
}

/**
 * Downloads a resource asset using multi-tiered fallback strategies:
 * Tier 1: Gateway streaming proxy with Content-Disposition
 * Tier 2: Direct browser fetch with Blob creation
 * Tier 3: Offscreen image canvas capture (for visual assets)
 * Tier 4: Direct browser navigation / target=_blank download
 */
export async function downloadResourceAsset(
  item: ResourceItem, 
  options: DownloadOptions = {}
): Promise<DownloadResult> {
  const assetInfo = getBestAssetUrl(item);
  const targetUrl = assetInfo.url;
  const fallbackUrl = assetInfo.fallbackUrl;
  const filename = getSanitizedFilename(item);

  // If no direct downloadable binary asset exists, download structured metadata
  if (!targetUrl || !assetInfo.isDirectDownloadable) {
    downloadMetadataRecord(item);
    return { success: true, status: 'confirmed', method: 'metadata_fallback' };
  }

  // Strategy 1: Gateway streaming proxy
  if (options.mode !== 'direct') {
    try {
      options.onProgress?.(25, 'Connecting to download gateway...');
      const proxyUrl = `/api/download-proxy?url=${encodeURIComponent(targetUrl)}&filename=${encodeURIComponent(filename)}${fallbackUrl ? `&fallback=${encodeURIComponent(fallbackUrl)}` : ''}`;
      
      // BUG-008: Accurate progress wording without false cryptographic claims on streaming path
      options.onProgress?.(50, 'Streaming asset via gateway...');
      const proxyResp = await fetch(proxyUrl);
      if (!proxyResp.ok) {
        throw new Error(`Download gateway returned HTTP ${proxyResp.status}`);
      }

      const contentType = proxyResp.headers.get('content-type') || '';
      // BUG-009: Reject HTML error documents received by the client
      if (contentType.includes('application/json') || contentType.includes('text/html')) {
        throw new Error('Remote provider returned an error message or HTML document instead of file binary');
      }

      const blob = await proxyResp.blob();
      if (blob.size === 0) {
        throw new Error('Downloaded asset is empty (0 bytes)');
      }

      triggerBrowserDownload(blob, filename);
      options.onProgress?.(100, 'Download complete!');
      return { success: true, status: 'confirmed', method: 'gateway_proxy' };
    } catch (err: any) {
      console.warn('[downloadEngine] Gateway proxy failed, attempting direct tier...', err?.message || err);
    }
  }

  // Strategy 2: Direct fetch -> Blob download
  try {
    options.onProgress?.(60, 'Fetching direct resource stream...');
    const resp = await fetch(targetUrl, { mode: 'cors' });
    if (resp.ok) {
      const contentType = resp.headers.get('content-type') || '';
      if (contentType.includes('application/json') || contentType.includes('text/html')) {
        throw new Error('Direct target returned HTML or JSON instead of an asset file');
      }
      const blob = await resp.blob();
      if (blob.size === 0) {
        throw new Error('Direct stream returned 0 bytes');
      }
      triggerBrowserDownload(blob, filename);
      options.onProgress?.(100, 'Download complete via direct stream!');
      return { success: true, status: 'confirmed', method: 'direct_blob' };
    }
  } catch (err: any) {
    console.warn('[downloadEngine] Direct fetch failed (likely CORS), attempting canvas or link fallback...', err?.message || err);
  }

  // Strategy 3: Canvas capture for image categories
  if (['images', 'art', 'biodiversity'].includes(item.category) && (item.previewUrl || item.thumbnailUrl)) {
    try {
      options.onProgress?.(80, 'Capturing high-resolution image render...');
      const img = new Image();
      img.crossOrigin = 'anonymous';
      const imgSrc = item.previewUrl || item.thumbnailUrl || targetUrl;
      
      const blob = await new Promise<Blob | null>((resolve) => {
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || 1200;
            canvas.height = img.naturalHeight || 800;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.95);
            } else {
              resolve(null);
            }
          } catch {
            resolve(null);
          }
        };
        img.onerror = () => resolve(null);
        img.src = imgSrc;
      });

      if (blob) {
        triggerBrowserDownload(blob, filename);
        options.onProgress?.(100, 'Render captured and downloaded!');
        return { success: true, status: 'confirmed', method: 'canvas_export' };
      }
    } catch {}
  }

  // Strategy 4: Fallback - direct browser navigation / anchor
  // BUG-010: Return status 'dispatched' rather than claiming verified/confirmed success
  options.onProgress?.(100, 'Opening source file link directly...');
  triggerBrowserDownload(targetUrl, filename);
  return { success: true, status: 'dispatched', method: 'direct_anchor' };
}

/**
 * Generates and downloads full metadata in JSON format.
 */
export function downloadMetadataRecord(item: ResourceItem): void {
  const data = {
    urmilVersion: '2.0.0',
    exportedAt: new Date().toISOString(),
    resource: {
      id: item.id,
      title: item.title,
      category: item.category,
      description: item.description,
      creator: item.creator,
      source: item.source,
      license: item.license,
      attributes: item.attributes,
      directUrls: {
        download: item.downloadUrl,
        preview: item.previewUrl,
        thumbnail: item.thumbnailUrl,
        sourceOrigin: item.source?.resourceUrl
      }
    }
  };

  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const filename = `${(item.title || 'resource').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40)}_metadata.json`;
  triggerBrowserDownload(blob, filename);
}

/**
 * Generates and downloads an academic / attribution citation card.
 */
export function downloadAttributionCitation(item: ResourceItem): void {
  const creator = item.creator?.name || item.creator?.organization || item.source?.providerName || 'Unknown Creator';
  const year = item.attributes?.year || new Date().getFullYear();
  const title = item.title || 'Untitled Work';
  const source = item.source?.providerName || 'Universal Open Repository';
  const url = item.source?.resourceUrl || item.downloadUrl || '';
  const license = item.license?.type || 'Open Access / Creative Commons';

  const textContent = `================================================================================
URMIL CITATION & ATTRIBUTION MANIFEST
================================================================================
Title:       ${title}
Creator:     ${creator}
Year:        ${year}
Repository:  ${source}
License:     ${license}
License URL: ${item.license?.url || 'N/A'}
Origin URL:  ${url}
Resource ID: ${item.id}

APA Citation:
${creator} (${year}). ${title}. ${source}. Retrieved from ${url}

BibTeX:
@misc{urmil_${item.id.replace(/[^a-zA-Z0-9]/g, '_')},
  title = {${title}},
  author = {${creator}},
  year = {${year}},
  publisher = {${source}},
  howpublished = {\\url{${url}}},
  note = {Licensed under ${license}}
}
================================================================================
`;

  const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
  const filename = `${(item.title || 'resource').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40)}_citation.txt`;
  triggerBrowserDownload(blob, filename);
}

/**
 * Downloads multiple items as an organized, attributed ZIP archive with aggregate memory caps.
 */
export async function downloadBatchZip(
  items: ResourceItem[],
  onProgress?: (progressPercent: number, statusText: string) => void
): Promise<void> {
  const total = items.length;
  // BUG-012: Enforce item count limit to prevent browser memory crashes
  if (total > MAX_BATCH_ITEMS) {
    throw new Error(`Batch export exceeds maximum limit of ${MAX_BATCH_ITEMS} items at a time (requested ${total}). Please reduce selection.`);
  }

  const zip = new JSZip();
  let cumulativeBytes = 0;

  onProgress?.(5, `Preparing batch archive for ${total} items...`);

  // Create subfolders
  const assetsFolder = zip.folder('assets');
  let manifestText = `================================================================================
URMIL BATCH ARCHIVE MANIFEST
Exported: ${new Date().toLocaleString()}
Total Assets: ${total}
================================================================================\n\n`;

  for (let i = 0; i < total; i++) {
    const item = items[i];
    const itemNum = i + 1;
    const progress = Math.round(10 + (i / total) * 75);
    onProgress?.(progress, `Fetching asset [${itemNum}/${total}]: ${item.title.slice(0, 30)}...`);

    const { url: targetUrl } = getBestAssetUrl(item);
    const filename = `${String(itemNum).padStart(2, '0')}_${getSanitizedFilename(item)}`;

    let isSuccess = false;

    // Fetch asset binary
    if (targetUrl) {
      try {
        const proxyUrl = `/api/download-proxy?url=${encodeURIComponent(targetUrl)}&filename=${encodeURIComponent(filename)}`;
        const resp = await fetch(proxyUrl);
        if (resp.ok) {
          const blob = await resp.blob();
          // BUG-012: Enforce cumulative byte limit across the batch
          cumulativeBytes += blob.size;
          if (cumulativeBytes > MAX_BATCH_BYTES) {
            throw new Error(`Batch export exceeded maximum allowable total size of ${Math.round(MAX_BATCH_BYTES / (1024 * 1024))}MB (reached ${Math.round(cumulativeBytes / (1024 * 1024))}MB). Please download items individually.`);
          }
          assetsFolder?.file(filename, blob);
          isSuccess = true;
        }
      } catch (err: any) {
        if (err.message && err.message.includes('exceeded maximum allowable total size')) {
          throw err;
        }
        console.warn(`[downloadBatchZip] Could not fetch ${item.title}, adding metadata stub`, err);
      }
    }

    if (isSuccess) {
      // Add success entry to manifest
      manifestText += `[${itemNum}] ${item.title}\n`;
      manifestText += `  Status:     DOWNLOADED_SUCCESSFULLY\n`;
      manifestText += `  File:       assets/${filename}\n`;
      manifestText += `  Category:   ${item.category}\n`;
      manifestText += `  Creator:    ${item.creator?.name || item.creator?.organization || 'Unknown'}\n`;
      manifestText += `  License:    ${item.license?.type || 'Open Access'}\n`;
      manifestText += `  Origin:     ${item.source?.resourceUrl || targetUrl}\n\n`;
    } else {
      // Fallback stub if binary couldn't be retrieved
      assetsFolder?.file(
        `${filename}.txt`,
        `Asset could not be bundled directly into zip.\nDirect URL: ${targetUrl || item.source?.resourceUrl}\nTitle: ${item.title}`
      );

      // BUG-008: Explicitly record stub file and failed status in manifest
      manifestText += `[${itemNum}] ${item.title}\n`;
      manifestText += `  Status:     FAILED_DOWNLOAD (Stub Created)\n`;
      manifestText += `  File:       assets/${filename}.txt\n`;
      manifestText += `  Category:   ${item.category}\n`;
      manifestText += `  Creator:    ${item.creator?.name || item.creator?.organization || 'Unknown'}\n`;
      manifestText += `  License:    ${item.license?.type || 'Open Access'}\n`;
      manifestText += `  Origin:     ${item.source?.resourceUrl || targetUrl}\n\n`;
    }
  }

  onProgress?.(88, 'Finalizing manifest and compressing ZIP archive...');
  zip.file('ATTRIBUTION_AND_LICENSES.txt', manifestText);
  zip.file('METADATA.json', JSON.stringify(items, null, 2));

  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  onProgress?.(100, 'Batch ZIP download starting!');
  triggerBrowserDownload(zipBlob, `URMIL_Export_${Date.now()}.zip`);
}
