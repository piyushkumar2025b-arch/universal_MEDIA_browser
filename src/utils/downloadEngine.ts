import JSZip from 'jszip';
import { ResourceItem } from '../types/resource';

export interface DownloadOptions {
  mode?: 'proxy' | 'direct' | 'metadata' | 'citation';
  fallbackToDirectWindow?: boolean;
  onProgress?: (progressPercent: number, statusText: string) => void;
}

/**
 * Returns the best downloadable binary or asset URL for a given item.
 */
export function getBestAssetUrl(item: ResourceItem): { url: string; fallbackUrl?: string } {
  const primaryCandidates = [
    item.downloadUrl,
    item.attributes?.pdfUrl,
    item.previewUrl,
    item.thumbnailUrl,
    item.source?.resourceUrl
  ].filter((u): u is string => Boolean(u && typeof u === 'string' && u.startsWith('http')));

  const url = primaryCandidates[0] || '';
  const fallbackUrl = primaryCandidates[1] || primaryCandidates[2] || undefined;

  return { url, fallbackUrl };
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
): Promise<{ success: boolean; method: string }> {
  const { url: targetUrl, fallbackUrl } = getBestAssetUrl(item);
  const filename = getSanitizedFilename(item);

  if (!targetUrl) {
    // If no target URL, download rich metadata snapshot
    downloadMetadataRecord(item);
    return { success: true, method: 'metadata_fallback' };
  }

  // Strategy 1: Gateway streaming proxy
  if (options.mode !== 'direct') {
    try {
      options.onProgress?.(30, 'Streaming through verified download gateway...');
      const proxyUrl = `/api/download-proxy?url=${encodeURIComponent(targetUrl)}&filename=${encodeURIComponent(filename)}${fallbackUrl ? `&fallback=${encodeURIComponent(fallbackUrl)}` : ''}`;
      
      // Test fetch head or stream directly via invisible anchor
      triggerBrowserDownload(proxyUrl, filename);
      options.onProgress?.(100, 'Download dispatched successfully!');
      return { success: true, method: 'gateway_proxy' };
    } catch (err) {
      console.warn('[downloadEngine] Gateway proxy failed, attempting direct tier...', err);
    }
  }

  // Strategy 2: Direct fetch -> Blob download
  try {
    options.onProgress?.(60, 'Fetching direct resource stream...');
    const resp = await fetch(targetUrl, { mode: 'cors' });
    if (resp.ok) {
      const blob = await resp.blob();
      triggerBrowserDownload(blob, filename);
      options.onProgress?.(100, 'Download complete via direct stream!');
      return { success: true, method: 'direct_blob' };
    }
  } catch (err) {
    console.warn('[downloadEngine] Direct fetch failed (likely CORS), attempting canvas or link fallback...', err);
  }

  // Strategy 3: Canvas capture for image categories
  if (['images', 'art', 'biodiversity'].includes(item.category) && (item.previewUrl || item.thumbnailUrl)) {
    try {
      options.onProgress?.(80, 'Capturing verified high-resolution render...');
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
        return { success: true, method: 'canvas_export' };
      }
    } catch {}
  }

  // Strategy 4: Guaranteed fallback - direct window open or anchor
  options.onProgress?.(100, 'Opening source file link directly...');
  triggerBrowserDownload(targetUrl, filename);
  return { success: true, method: 'direct_anchor' };
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
 * Downloads multiple items as an organized, attributed ZIP archive.
 */
export async function downloadBatchZip(
  items: ResourceItem[],
  onProgress?: (progressPercent: number, statusText: string) => void
): Promise<void> {
  const zip = new JSZip();
  const total = items.length;

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

    // Add entry to manifest
    manifestText += `[${itemNum}] ${item.title}\n`;
    manifestText += `  File:       assets/${filename}\n`;
    manifestText += `  Category:   ${item.category}\n`;
    manifestText += `  Creator:    ${item.creator?.name || item.creator?.organization || 'Unknown'}\n`;
    manifestText += `  License:    ${item.license?.type || 'Open Access'}\n`;
    manifestText += `  Origin:     ${item.source?.resourceUrl || targetUrl}\n\n`;

    // Fetch asset binary
    if (targetUrl) {
      try {
        const proxyUrl = `/api/download-proxy?url=${encodeURIComponent(targetUrl)}&filename=${encodeURIComponent(filename)}`;
        const resp = await fetch(proxyUrl);
        if (resp.ok) {
          const blob = await resp.blob();
          assetsFolder?.file(filename, blob);
          continue;
        }
      } catch (err) {
        console.warn(`[downloadBatchZip] Could not fetch ${item.title}, adding metadata stub`, err);
      }
    }

    // Fallback stub if binary couldn't be retrieved
    assetsFolder?.file(
      `${filename}.txt`,
      `Asset could not be bundled directly into zip.\nDirect URL: ${targetUrl || item.source?.resourceUrl}\nTitle: ${item.title}`
    );
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
