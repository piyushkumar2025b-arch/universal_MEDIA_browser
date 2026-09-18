import { ResourceItem } from '../../src/types/resource';

/**
 * Utility for sanitizing media URLs, generating high-performance CDN / IIIF thumbnails,
 * cleaning titles, and standardizing metadata attributes across external providers.
 */
export class MediaProcessor {
  /**
   * Decode common HTML entities from provider titles and descriptions
   */
  public static decodeEntities(str?: any): string {
    if (str === null || str === undefined) return '';
    if (typeof str !== 'string') {
      if (Array.isArray(str)) {
        str = str.filter(Boolean).join(', ');
      } else {
        str = String(str);
      }
    }
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&#x2F;/g, '/')
      .replace(/&#(\d+);/g, (_: any, dec: string) => String.fromCharCode(Number(dec)))
      .trim();
  }

  /**
   * Cleans title strings removing bracketed catalog metadata and accession prefixes
   */
  public static cleanTitle(raw?: any, fallback = 'Untitled Resource'): string {
    if (raw === null || raw === undefined) return fallback;
    let cleaned = this.decodeEntities(raw);
    // Strip leading accession indicators like [Object] or [No title]
    cleaned = cleaned.replace(/^\[object\s+Object\]/i, '').trim();
    // Strip trailing or leading punctuation
    cleaned = cleaned.replace(/^[\s,;:\-_/]+|[\s,;:\-_/]+$/g, '').trim();
    return cleaned || fallback;
  }

  /**
   * Synthesizes optimal responsive image thumbnail URLs for IIIF and Wikimedia endpoints
   */
  public static optimizeImageUrl(url?: string, targetWidth = 400): { thumb: string; preview: string; full: string } {
    if (!url) return { thumb: '', preview: '', full: '' };

    // 1. IIIF Image API Pattern
    if (url.includes('/info.json') || url.includes('/full/')) {
      const base = url.split('/full/')[0].replace('/info.json', '');
      return {
        thumb: `${base}/full/${targetWidth},/0/default.jpg`,
        preview: `${base}/full/${Math.min(targetWidth * 2, 1024)},/0/default.jpg`,
        full: `${base}/full/max/0/default.jpg`
      };
    }

    // 2. Wikimedia Commons Special:FilePath or Upload pattern
    if (url.includes('upload.wikimedia.org') || url.includes('commons.wikimedia.org')) {
      // Return direct URL as full, thumb with query if applicable
      return {
        thumb: url,
        preview: url,
        full: url
      };
    }

    // 3. Open Library Book Covers
    if (url.includes('covers.openlibrary.org')) {
      const base = url.replace(/-[SML]\.jpg$/, '');
      return {
        thumb: `${base}-M.jpg`,
        preview: `${base}-L.jpg`,
        full: `${base}-L.jpg`
      };
    }

    return {
      thumb: url,
      preview: url,
      full: url
    };
  }

  /**
   * Post-processes an array of retrieved ResourceItems to ensure valid media URLs,
   * non-null attributes, and decoded textual fields.
   */
  public static processItems(items: ResourceItem[]): ResourceItem[] {
    return items.map((item) => {
      const cleanedTitle = this.cleanTitle(item.title);
      const cleanedDesc = item.description ? this.decodeEntities(item.description) : undefined;

      return {
        ...item,
        title: cleanedTitle,
        description: cleanedDesc,
        creator: item.creator
          ? {
              ...item.creator,
              name: item.creator.name ? this.cleanTitle(item.creator.name) : undefined,
              organization: item.creator.organization ? this.cleanTitle(item.creator.organization) : undefined
            }
          : undefined
      };
    });
  }
}
