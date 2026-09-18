import fs from 'fs';
import path from 'path';
import { ResourceItem, SearchFilters } from '../src/types/resource';
import { deduplicateResources } from './deduplicator';

interface CacheEntry {
  query: string;
  category: string;
  timestamp: number;
  items: ResourceItem[];
  isFetchingBackground: boolean;
  deepPagesFetched: number;
}

class ResourceCacheStore {
  private cache: Map<string, CacheEntry> = new Map();
  private cacheDir: string;
  private cacheFile: string;
  private activeJobs: Set<string> = new Set();
  private saveTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.cacheDir = path.join(process.cwd(), '.cache');
    this.cacheFile = path.join(this.cacheDir, 'resource_catalog.json');
    this.initDiskCache();
  }

  private scheduleSaveToDisk() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    this.saveTimer = setTimeout(() => {
      this.saveToDisk();
      this.saveTimer = null;
    }, 1500);
    if (typeof this.saveTimer.unref === 'function') {
      this.saveTimer.unref();
    }
  }

  private initDiskCache() {
    try {
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true });
      }
      if (fs.existsSync(this.cacheFile)) {
        const raw = fs.readFileSync(this.cacheFile, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const entry of parsed) {
            if (entry.query && entry.items) {
              const key = this.getKey(entry.query, entry.category || 'all');
              this.cache.set(key, {
                query: entry.query,
                category: entry.category || 'all',
                timestamp: entry.timestamp || Date.now(),
                items: entry.items,
                isFetchingBackground: false,
                deepPagesFetched: entry.deepPagesFetched || 1
              });
            }
          }
        }
      }
    } catch (err) {
      console.warn('[ResourceCacheStore] Disk cache init notice:', (err as any)?.message);
    }
  }

  private saveToDisk() {
    try {
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true });
      }
      const data = Array.from(this.cache.values()).map(e => ({
        query: e.query,
        category: e.category,
        timestamp: e.timestamp,
        deepPagesFetched: e.deepPagesFetched,
        items: e.items.slice(0, 500) // Keep top 500 items per query
      }));
      fs.writeFileSync(this.cacheFile, JSON.stringify(data.slice(0, 50), null, 2), 'utf-8');
    } catch (err) {
      console.warn('[ResourceCacheStore] Failed to write cache to disk:', (err as any)?.message);
    }
  }

  public getKey(query: string, category: string): string {
    const q = (query || '').toLowerCase().trim();
    const cat = (category || 'all').toLowerCase().trim();
    return `${cat}::${q}`;
  }

  public get(query: string, category: string): CacheEntry | undefined {
    const key = this.getKey(query, category);
    return this.cache.get(key);
  }

  public set(query: string, category: string, items: ResourceItem[]): CacheEntry {
    const key = this.getKey(query, category);
    const existing = this.cache.get(key);
    const combined = existing ? [...existing.items, ...items] : items;
    const deduped = deduplicateResources(combined);

    const entry: CacheEntry = {
      query,
      category,
      timestamp: Date.now(),
      items: deduped,
      isFetchingBackground: existing ? existing.isFetchingBackground : false,
      deepPagesFetched: existing ? existing.deepPagesFetched : 1
    };

    this.cache.set(key, entry);
    // Enforce memory capacity boundary (max 500 query sets)
    if (this.cache.size > 500) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.scheduleSaveToDisk();
    return entry;
  }

  public append(query: string, category: string, newItems: ResourceItem[]): { entry: CacheEntry; addedCount: number } {
    const key = this.getKey(query, category);
    const existing = this.cache.get(key);
    const prevItems = existing ? existing.items : [];
    const prevCount = prevItems.length;

    const deduped = deduplicateResources([...prevItems, ...newItems]);
    const addedCount = deduped.length - prevCount;

    const entry: CacheEntry = {
      query,
      category,
      timestamp: Date.now(),
      items: deduped,
      isFetchingBackground: existing ? existing.isFetchingBackground : false,
      deepPagesFetched: (existing?.deepPagesFetched || 1) + 1
    };

    this.cache.set(key, entry);
    this.scheduleSaveToDisk();
    return { entry, addedCount };
  }

  public setBackgroundJob(query: string, category: string, isActive: boolean) {
    const key = this.getKey(query, category);
    const entry = this.cache.get(key);
    if (entry) {
      entry.isFetchingBackground = isActive;
    }
    if (isActive) {
      this.activeJobs.add(key);
    } else {
      this.activeJobs.delete(key);
    }
  }

  public isBackgroundJobActive(query: string, category: string): boolean {
    const key = this.getKey(query, category);
    return this.activeJobs.has(key);
  }

  public getStats() {
    let totalItems = 0;
    for (const entry of this.cache.values()) {
      totalItems += entry.items.length;
    }
    return {
      cachedQueries: this.cache.size,
      totalItemsCached: totalItems,
      activeBackgroundJobs: this.activeJobs.size,
      timestamp: new Date().toISOString()
    };
  }
}

export const resourceCache = new ResourceCacheStore();
