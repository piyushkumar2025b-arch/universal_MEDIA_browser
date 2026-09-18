import { SearchFilters, ResourceCategory, ResourceItem, SearchResultEnvelope } from '../../src/types/resource';
import { executeRealSearch } from '../providers';
import { RouteExecutionResult } from '../provider_router';
import { resourceCache } from '../cache_store';
import { APP_CONFIG } from '../config/app_config';
import { normalizeCategory } from '../normalizer';

export class SearchService {
  private inFlightSearches = new Map<string, Promise<RouteExecutionResult>>();
  /**
   * Triggers a non-blocking background harvest job to crawl deeper pages
   * and append fresh resources to the cache.
   */
  public triggerBackgroundHarvest(query: string, category: ResourceCategory, filters: SearchFilters): void {
    if (!query || resourceCache.isBackgroundJobActive(query, category)) return;
    resourceCache.setBackgroundJob(query, category, true);

    // Run asynchronously
    (async () => {
      try {
        const deepFilters: SearchFilters = {
          ...filters,
          query
        };

        const deepResult = await executeRealSearch(deepFilters);
        if (deepResult && deepResult.results.length > 0) {
          resourceCache.append(query, category, deepResult.results);
        }
      } catch (err: any) {
        console.warn(`[SearchService] Background harvest notice for "${query}" (${category}):`, err?.message);
      } finally {
        resourceCache.setBackgroundJob(query, category, false);
      }
    })();
  }

  /**
   * Main search orchestration pipeline:
   * Checks L1 memory & L2 disk cache, coordinates real-time federation if needed,
   * schedules background harvest if continuous mode is enabled, and computes pagination.
   */
  public async search(
    filters: SearchFilters,
    page = 1,
    pageSize = APP_CONFIG.search.defaultPageSize,
    continuous = true
  ): Promise<SearchResultEnvelope> {
    const query = filters.query || '';
    const category = normalizeCategory(filters.category);
    filters.category = category;
    const cachedEntry = resourceCache.get(query, category);

    let allItems: ResourceItem[] = [];
    let executionTimeMs = 0;
    let primaryProviderUsed = 'Federated Pipeline';
    let fallbackUsed: string | undefined = undefined;
    let providerErrors: string[] = [];
    let categoryCounts: Record<ResourceCategory, number> = {
      all: 0, images: 0, videos: 0, gifs: 0, music: 0, audio: 0, papers: 0, books: 0,
      maps: 0, weather: 0, datasets: 0, art: 0, code: 0, finance: 0, biodiversity: 0,
      knowledge: 0, food: 0, games: 0, '3d': 0, nasa: 0
    };

    const isCacheExpired = cachedEntry && (Date.now() - cachedEntry.timestamp > APP_CONFIG.search.cacheTtlMs);
    const needsLiveSearch = !cachedEntry || cachedEntry.items.length === 0 || (page === 1 && isCacheExpired);

    if (needsLiveSearch) {
      const flightKey = `${category}::${query.trim().toLowerCase()}`;
      let liveResult: RouteExecutionResult;

      if (this.inFlightSearches.has(flightKey)) {
        liveResult = await this.inFlightSearches.get(flightKey)!;
      } else {
        const searchPromise = executeRealSearch(filters);
        this.inFlightSearches.set(flightKey, searchPromise);
        try {
          liveResult = await searchPromise;
        } finally {
          this.inFlightSearches.delete(flightKey);
        }
      }

      executionTimeMs = liveResult.executionTimeMs;
      primaryProviderUsed = liveResult.primaryProviderUsed;
      fallbackUsed = liveResult.fallbackUsed;
      providerErrors = liveResult.providerErrors;
      categoryCounts = liveResult.categoryCounts;

      const updated = resourceCache.set(query, category, liveResult.results);
      allItems = updated.items;

      if (continuous) {
        setTimeout(() => this.triggerBackgroundHarvest(query, category, filters), 100);
      }
    } else {
      allItems = cachedEntry.items;
      categoryCounts.all = allItems.length;
      for (const item of allItems) {
        if (categoryCounts[item.category] !== undefined) {
          categoryCounts[item.category]++;
        }
      }
    }

    // Compute pagination
    const totalCount = allItems.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const startIndex = (page - 1) * pageSize;
    const paginatedResults = allItems.slice(startIndex, startIndex + pageSize);

    return {
      results: paginatedResults,
      totalCount,
      page,
      pageSize,
      totalPages,
      isFetchingMore: resourceCache.isBackgroundJobActive(query, category),
      isHarvesting: resourceCache.isBackgroundJobActive(query, category),
      cachedCount: totalCount,
      executionTimeMs,
      categoryCounts,
      primaryProviderUsed,
      fallbackUsed,
      providerErrors
    };
  }

  /**
   * Polls background harvest status and slices newly arrived items.
   */
  public pollBackground(query: string, category: ResourceCategory, knownCount = 0) {
    const entry = resourceCache.get(query, category);
    if (!entry) {
      return {
        hasMore: false,
        totalCount: 0,
        newItems: [],
        isFetchingMore: false
      };
    }

    const currentTotal = entry.items.length;
    const newItems = currentTotal > knownCount ? entry.items.slice(knownCount) : [];

    return {
      hasMore: currentTotal > knownCount,
      totalCount: currentTotal,
      newItems,
      isFetchingMore: resourceCache.isBackgroundJobActive(query, category)
    };
  }
}

export const searchService = new SearchService();
