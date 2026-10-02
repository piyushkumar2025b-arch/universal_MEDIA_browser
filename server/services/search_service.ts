import { SearchFilters, ResourceCategory, ResourceItem, SearchResultEnvelope } from '../../src/types/resource';
import { executeRealSearch } from '../providers';
import { RouteExecutionResult } from '../provider_router';
import { resourceCache } from '../cache_store';
import { APP_CONFIG } from '../config/app_config';
import { normalizeCategory } from '../normalizer';

export class SearchService {
  private inFlightSearches = new Map<string, Promise<RouteExecutionResult>>();

  // BUG-002: Bounded global background harvest queue and concurrency controls
  private static MAX_ACTIVE_BACKGROUND_HARVESTS = 4;
  private static MAX_QUEUED_BACKGROUND_HARVESTS = 25;
  private static HARVEST_JOB_TIMEOUT_MS = 15000;

  private harvestQueue: Array<{
    query: string;
    category: ResourceCategory;
    filters: SearchFilters;
    key: string;
    enqueuedAt: number;
  }> = [];
  private queuedJobKeys = new Set<string>();
  private activeHarvestJobs = new Set<string>();

  /**
   * Triggers a non-blocking background harvest job to crawl deeper pages
   * and append fresh resources to the cache with strict global concurrency bounds.
   */
  public triggerBackgroundHarvest(query: string, category: ResourceCategory, filters: SearchFilters): void {
    if (!query) return;
    const key = `${category}::${query.trim().toLowerCase()}`;

    // Deduplicate against active and already queued jobs
    if (this.activeHarvestJobs.has(key) || this.queuedJobKeys.has(key) || resourceCache.isBackgroundJobActive(query, category)) {
      return;
    }

    // Enforce global queue length cap
    if (this.harvestQueue.length >= SearchService.MAX_QUEUED_BACKGROUND_HARVESTS) {
      console.warn(`[SearchService] Background harvest queue full (${this.harvestQueue.length} jobs). Shedding harvest for "${query}" (${category}).`);
      return;
    }

    this.queuedJobKeys.add(key);
    this.harvestQueue.push({
      query,
      category,
      filters,
      key,
      enqueuedAt: Date.now()
    });

    this.processBackgroundQueue();
  }

  /**
   * Processes queued background harvest jobs respecting the global concurrency ceiling.
   */
  private processBackgroundQueue(): void {
    while (
      this.activeHarvestJobs.size < SearchService.MAX_ACTIVE_BACKGROUND_HARVESTS &&
      this.harvestQueue.length > 0
    ) {
      const job = this.harvestQueue.shift();
      if (!job) break;

      this.queuedJobKeys.delete(job.key);

      // Discard stale jobs that waited too long in queue
      if (Date.now() - job.enqueuedAt > 20000) {
        continue;
      }

      this.activeHarvestJobs.add(job.key);
      resourceCache.setBackgroundJob(job.query, job.category, true);

      (async () => {
        const abortCtrl = new AbortController();
        const timeout = setTimeout(() => abortCtrl.abort(), SearchService.HARVEST_JOB_TIMEOUT_MS);
        if (typeof timeout.unref === 'function') timeout.unref();

        try {
          const deepFilters: SearchFilters = {
            ...job.filters,
            query: job.query
          };

          const deepResult = await executeRealSearch(deepFilters);
          if (deepResult && deepResult.results.length > 0) {
            resourceCache.append(job.query, job.category, deepResult.results);
          }
        } catch (err: any) {
          console.warn(`[SearchService] Background harvest notice for "${job.query}" (${job.category}):`, err?.message);
        } finally {
          clearTimeout(timeout);
          this.activeHarvestJobs.delete(job.key);
          resourceCache.setBackgroundJob(job.query, job.category, false);
          // Kick the queue for next awaiting job
          this.processBackgroundQueue();
        }
      })();
    }
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
      knowledge: 0, food: 0, games: 0, '3d': 0, nasa: 0, news: 0
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
