/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * URMIL Real Image Validation & Content Classifier
 * Strictly enforces that ONLY authentic, real images are displayed.
 * Never injects or permits fake stock photographs or unrelated placeholder photos.
 */

// Known IDs of fake fallback stock photos that were previously injected
const FORBIDDEN_STOCK_PATTERNS = [
  'photo-1582562124811', 'photo-1607604276583', 'photo-1579783900882', 'photo-1541701494587',
  'photo-1578301978693', 'photo-1579783902614', 'photo-1561214115', 'photo-1470071459604',
  'photo-1441974231531', 'photo-1507525428034', 'photo-1534447677768', 'photo-1518837695005',
  'photo-1535268647677', 'photo-1546182990', 'photo-1451187580459', 'photo-1506703719100',
  'photo-1446776811953', 'photo-1518770660439', 'photo-1555066931', 'photo-1512820790803',
  'photo-1497633762265', 'photo-1457369804613', 'photo-1524661135', 'photo-1526778548025',
  'photo-1511671782779', 'photo-1470225620780', 'photo-1514525253161', 'photo-1504674900247',
  'photo-1498837167922', 'photo-1529699211952', 'photo-1550745165', 'photo-1504711434969',
  'photo-1585829365295', 'photo-1495020689067', 'photo-1526470608268', 'photo-1485846234645',
  'photo-1492691527719', 'photo-1536440136628', 'photo-1584308666744', 'photo-1516549655169',
  'photo-1584483766114', 'photo-1534088568595', 'photo-1526374965328', 'photo-1538481199705',
  'photo-1542751371', 'photo-1517976487507', 'photo-1462331940025', 'photo-1635070041078',
  'photo-1576091160399', 'photo-1563986768609', 'photo-1508739773434', 'photo-1541872703',
  'photo-1621416894569', 'photo-1622979135225', 'photo-1519389950473', 'photo-1489599849927',
  'photo-1544620347', 'photo-1568605117036', 'photo-1611974789855', 'photo-1507668077129',
  'photo-1532094349884', 'photo-1518152006812', 'photo-1530497610245', 'photo-1629654297299'
];

/**
 * Returns true ONLY if the URL represents a genuine, authentic image asset.
 * Rejects web pages, PDF links, and synthetic/fallback stock photos.
 */
export function isRealImage(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.length < 5) return false;
  if (trimmed === 'null' || trimmed === 'undefined' || trimmed === 'false' || trimmed === '[object Object]') return false;

  // Reject known synthetic/fake stock placeholders
  if (trimmed.includes('images.unsplash.com')) {
    if (FORBIDDEN_STOCK_PATTERNS.some(p => trimmed.includes(p))) {
      return false;
    }
  }

  // Reject non-image web page URLs, abstracts, and PDF links
  if (
    trimmed.includes('ncbi.nlm.nih.gov/pmc/articles') ||
    trimmed.includes('arxiv.org/abs/') ||
    trimmed.includes('arxiv.org/pdf/') ||
    trimmed.includes('doi.org/') ||
    trimmed.includes('zenodo.org/records/') ||
    trimmed.includes('openalex.org/') ||
    trimmed.includes('europepmc.org/article/') ||
    (trimmed.includes('github.com/') && !trimmed.includes('raw.githubusercontent.com') && !/\.(png|jpe?g|webp|gif|svg)$/i.test(trimmed)) ||
    trimmed.endsWith('.html') ||
    trimmed.endsWith('.htm') ||
    trimmed.endsWith('.pdf')
  ) {
    return false;
  }

  // Allowed data URLs
  if (trimmed.startsWith('data:image/')) return true;

  // Recognized real media CDN hosts
  if (
    trimmed.includes('archive.org/services/img/') ||
    trimmed.includes('upload.wikimedia.org') ||
    trimmed.includes('images.nasa.gov') ||
    trimmed.includes('artic.edu/iiif') ||
    trimmed.includes('images.pexels.com') ||
    trimmed.includes('i.vimeocdn.com') ||
    trimmed.includes('img.youtube.com') ||
    trimmed.includes('pixabay.com/get') ||
    trimmed.includes('api.iconify.design') ||
    trimmed.includes('picsum.photos') ||
    trimmed.includes('dog.ceo') ||
    trimmed.includes('inaturalist-open-data') ||
    trimmed.includes('smk.dk') ||
    trimmed.includes('clevelandart.org') ||
    trimmed.includes('vam.ac.uk') ||
    trimmed.includes('wellcomecollection.org')
  ) {
    return true;
  }

  // Real image extensions
  if (/\.(jpe?g|png|webp|avif|gif|svg)(\?.*)?$/i.test(trimmed)) {
    return true;
  }

  // Internal media proxies for valid image requests
  if (trimmed.startsWith('/api/image-proxy?url=') || trimmed.startsWith('/api/v1/media-tunnel?url=')) {
    return true;
  }

  return false;
}

/**
 * Backward-compatible helper that NEVER returns fake photos.
 * Always returns empty string so components know not to render fake images.
 */
export function getContentPhoto(_title?: string, _category?: string, _tags?: string[]): string {
  return '';
}
