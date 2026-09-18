import { Request, Response, NextFunction } from 'express';
import { SearchFilters, ResourceCategory } from '../../src/types/resource';
import { searchService } from '../services/search_service';
import { APP_CONFIG } from '../config/app_config';
import { normalizeCategory } from '../normalizer';

const ALLOWED_SORT_BY = new Set(['relevance', 'newest', 'rating', 'downloads', 'title']);
const ALLOWED_QUALITY = new Set(['Any', 'High', 'Medium', 'Lossless', 'Standard']);

function sanitizeQueryString(raw: unknown, maxLen = 300): string {
  if (typeof raw !== 'string') return '';
  return raw.slice(0, maxLen).replace(/[\x00-\x1F\x7F]/g, ' ').trim();
}

function sanitizeFormatString(raw: unknown): string {
  if (typeof raw !== 'string') return 'all';
  const clean = raw.slice(0, 30).replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
  return clean || 'all';
}

function sanitizeLicenses(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, 20)
    .filter((item): item is string => typeof item === 'string')
    .map(s => s.slice(0, 50).replace(/[^a-zA-Z0-9 ._/-]/g, '').trim())
    .filter(Boolean);
}

export class SearchController {
  /**
   * POST /api/v1/search
   */
  public async searchV1(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = req.body || {};
      const query = sanitizeQueryString(body.query);
      const category = normalizeCategory(body.category);
      const page = Math.min(1000, Math.max(1, Number(body.page) || 1));
      const pageSize = Math.min(APP_CONFIG.search.maxPageSize, Math.max(6, Number(body.pageSize) || APP_CONFIG.search.defaultPageSize));
      const continuous = body.continuous !== false;

      const rawQuality = typeof body.quality === 'string' ? body.quality : 'Any';
      const quality = ALLOWED_QUALITY.has(rawQuality) ? rawQuality : 'Any';

      const rawSortBy = typeof body.sortBy === 'string' ? body.sortBy : 'relevance';
      const sortBy = (ALLOWED_SORT_BY.has(rawSortBy) ? rawSortBy : 'relevance') as any;
      const nasaSubCategory = typeof body.nasaSubCategory === 'string' ? body.nasaSubCategory : undefined;

      const filters: SearchFilters = {
        category,
        query,
        quality,
        license: sanitizeLicenses(body.license),
        format: sanitizeFormatString(body.format),
        sortBy,
        page,
        pageSize,
        continuous,
        nasaSubCategory: nasaSubCategory as any
      };

      const result = await searchService.search(filters, page, pageSize, continuous);
      res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=300');
      res.json(result);
    } catch (err: any) {
      console.error('SearchController Error in searchV1:', err);
      res.status(502).json({
        error: 'Failed to retrieve resources from upstream providers',
        message: err.message || 'Unknown network error',
        results: [],
        totalCount: 0,
        page: 1,
        pageSize: APP_CONFIG.search.defaultPageSize,
        totalPages: 0,
        providerErrors: [err.message]
      });
    }
  }

  /**
   * POST /api/v1/search/poll-background
   */
  public pollBackground(req: Request, res: Response): void {
    const { query, category, knownCount } = req.body || {};
    const q = sanitizeQueryString(query);
    const cat = normalizeCategory(category);
    const count = Math.max(0, Math.min(100000, Number(knownCount) || 0));

    const result = searchService.pollBackground(q, cat, count);
    res.json(result);
  }

  /**
   * POST /api/v1/search/fetch-deep
   */
  public fetchDeep(req: Request, res: Response): void {
    const { query, category } = req.body || {};
    const q = sanitizeQueryString(query);
    const cat = normalizeCategory(category);

    const filters: SearchFilters = {
      category: cat,
      query: q,
      quality: 'Any',
      license: [],
      format: 'all',
      sortBy: 'relevance'
    };

    searchService.triggerBackgroundHarvest(q, cat, filters);
    res.json({ status: 'initiated', query: q, category: cat });
  }

  /**
   * GET /api/search (Backward compatibility)
   */
  public async searchLegacyGet(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const q = sanitizeQueryString(req.query.q);
      const category = normalizeCategory(typeof req.query.category === 'string' ? req.query.category : undefined);
      const rawQuality = typeof req.query.quality === 'string' ? req.query.quality : 'Any';
      const quality = ALLOWED_QUALITY.has(rawQuality) ? rawQuality : 'Any';
      const licenseRaw = req.query.license;
      const license = sanitizeLicenses(Array.isArray(licenseRaw) ? licenseRaw : [licenseRaw]);
      const format = sanitizeFormatString(req.query.format);
      const rawSortBy = typeof req.query.sortBy === 'string' ? req.query.sortBy : 'relevance';
      const sortBy = (ALLOWED_SORT_BY.has(rawSortBy) ? rawSortBy : 'relevance') as any;
      const nasaSubCategory = typeof req.query.nasaSubCategory === 'string' ? req.query.nasaSubCategory : undefined;

      const filters: SearchFilters = {
        category,
        query: q,
        quality,
        license,
        format,
        sortBy,
        nasaSubCategory: nasaSubCategory as any
      };

      const result = await searchService.search(filters);
      res.json(result);
    } catch (err: any) {
      console.error('SearchController Error in searchLegacyGet:', err);
      res.status(502).json({
        error: 'Failed to retrieve resources from upstream providers',
        message: err.message || 'Unknown network error',
        results: [],
        totalCount: 0,
        providerErrors: [err.message]
      });
    }
  }
}

export const searchController = new SearchController();
