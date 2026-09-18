/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Download, 
  CheckSquare, 
  Square, 
  Loader2, 
  Info, 
  FolderHeart, 
  AlertTriangle, 
  RefreshCw, 
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Sparkles,
  Radio,
  Layers,
  Database
} from 'lucide-react';
import { 
  ResourceItem, 
  ResourceCategory, 
  SearchFilters, 
  Collection, 
  DownloadHistoryItem,
  NasaSubCategory
} from './types/resource';
import { 
  searchResources, 
  pollBackgroundIngest,
  triggerDeepSearch,
  getUserOwnedResources, 
  saveUserOwnedResource, 
  deleteUserOwnedResource 
} from './services/gatewayService';
import { wsClient, ConnectionStatus, LiveActivityEvent } from './services/websocketClient';
import { Navbar } from './components/Navbar';
import { SearchBar } from './components/SearchBar';
import { FilterBar } from './components/FilterBar';
import { ResourceCard } from './components/ResourceCard';
import { ResourceDetailModal } from './components/ResourceDetailModal';
import { DownloadModal } from './components/DownloadModal';
import { LibraryDrawer } from './components/LibraryDrawer';
import { AdminTelemetryModal } from './components/AdminTelemetryModal';
import { SourceAggregatorBar } from './components/SourceAggregatorBar';
import { GoogleSearchModal } from './components/GoogleSearchModal';
import { NasaSpaceSection } from './components/NasaSpaceSection';
import { rankClientResults } from './utils/searchRelevance';

const DEFAULT_COLLECTIONS: Collection[] = [
  {
    id: 'col-default',
    name: 'Workplace Research',
    description: 'Saved research assets',
    color: '#3b82f6',
    resourceIds: [],
    createdAt: new Date().toISOString().split('T')[0]
  }
];

export default function App() {
  // Search & Filter State
  const [filters, setFilters] = useState<SearchFilters>({
    category: 'all',
    query: 'science',
    quality: 'Any',
    license: [],
    format: 'all',
    sortBy: 'relevance',
    page: 1,
    pageSize: 24
  });

  const [results, setResults] = useState<ResourceItem[]>([]);
  const [userOwnedList, setUserOwnedList] = useState<ResourceItem[]>(() => getUserOwnedResources());
  const [isLoading, setIsLoading] = useState(true);
  const [providerErrors, setProviderErrors] = useState<string[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<ResourceCategory, number>>({
    all: 0,
    images: 0,
    videos: 0,
    gifs: 0,
    music: 0,
    audio: 0,
    papers: 0,
    books: 0,
    maps: 0,
    weather: 0,
    datasets: 0,
    art: 0,
    code: 0,
    finance: 0,
    biodiversity: 0,
    knowledge: 0,
    food: 0,
    games: 0,
    '3d': 0,
    nasa: 0
  });

  const [nasaSubCategory, setNasaSubCategory] = useState<NasaSubCategory>('all');

  // WebSocket Real-Time Gateway State
  const [wsStatus, setWsStatus] = useState<ConnectionStatus>('connecting');
  const [liveActivity, setLiveActivity] = useState<LiveActivityEvent | null>(null);
  const [wsStreamProgress, setWsStreamProgress] = useState<{
    percent: number;
    completed: number;
    total: number;
    activeProvider?: string;
  } | null>(null);
  const cancelWsRef = useRef<(() => void) | null>(null);

  // Subscribe to real-time WebSocket connection and live activity
  useEffect(() => {
    const unsubStatus = wsClient.onStatusChange((status) => {
      setWsStatus(status);
    });
    const unsubActivity = wsClient.onLiveActivity((event) => {
      setLiveActivity(event);
      const timer = setTimeout(() => {
        setLiveActivity((prev) => (prev?.timestamp === event.timestamp ? null : prev));
      }, 5000);
      return () => clearTimeout(timer);
    });
    return () => {
      unsubStatus();
      unsubActivity();
    };
  }, []);

  // Pagination & Continuous Background Ingest State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [cachedCount, setCachedCount] = useState(0);
  const [continuousIngest, setContinuousIngest] = useState(true);
  const [newlyIngestedCount, setNewlyIngestedCount] = useState(0);
  const [isHarvesting, setIsHarvesting] = useState(false);

  // UI Panels State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [libraryInitialTab, setLibraryInitialTab] = useState<'favorites' | 'collections' | 'user' | 'downloads' | 'recent'>('favorites');
  const [isTelemetryOpen, setIsTelemetryOpen] = useState(false);
  const [isGoogleSearchOpen, setIsGoogleSearchOpen] = useState(false);

  // Selection & Detail Modal State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [previewResource, setPreviewResource] = useState<ResourceItem | null>(null);
  const [downloadResources, setDownloadResources] = useState<ResourceItem[] | null>(null);

  // Filter results by selected archive if user filtered via aggregator
  const displayedResults = useMemo(() => {
    if (!selectedProvider) return results;
    return results.filter((r) => r.source?.providerId === selectedProvider);
  }, [results, selectedProvider]);

  // Library & Persistence State (loaded from localStorage)
  const [favorites, setFavorites] = useState<ResourceItem[]>(() => {
    try {
      const saved = localStorage.getItem('urmil_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [collections, setCollections] = useState<Collection[]>(() => {
    try {
      const saved = localStorage.getItem('urmil_collections');
      return saved ? JSON.parse(saved) : DEFAULT_COLLECTIONS;
    } catch {
      return DEFAULT_COLLECTIONS;
    }
  });

  const [downloadHistory, setDownloadHistory] = useState<DownloadHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('urmil_download_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [recentSearches, setRecentSearches] = useState<string[]>([
    'science',
    'quantum',
    'mountain',
    'nature',
    'tokyo'
  ]);

  // Persist favorites
  useEffect(() => {
    try {
      localStorage.setItem('urmil_favorites', JSON.stringify(favorites));
    } catch {}
  }, [favorites]);

  // Persist collections
  useEffect(() => {
    try {
      localStorage.setItem('urmil_collections', JSON.stringify(collections));
    } catch {}
  }, [collections]);

  // Persist download history
  useEffect(() => {
    try {
      localStorage.setItem('urmil_download_history', JSON.stringify(downloadHistory));
    } catch {}
  }, [downloadHistory]);

  // Fallback HTTP search function
  const executeHttpSearch = useCallback(async (currentFilters: SearchFilters) => {
    try {
      const resp = await searchResources({
        ...currentFilters,
        page: currentFilters.page ?? page,
        pageSize: currentFilters.pageSize ?? pageSize,
        continuous: continuousIngest
      });
      setResults(resp.results);
      setCategoryCounts(resp.categoryCounts);
      setPage(resp.page || 1);
      setPageSize(resp.pageSize || 24);
      setTotalPages(resp.totalPages || 1);
      setTotalCount(resp.totalCount || resp.results.length);
      setCachedCount(resp.cachedCount || resp.results.length);
      setIsHarvesting(Boolean(resp.isHarvesting));

      if (resp.providerErrors && resp.providerErrors.length > 0 && (!resp.results || resp.results.length === 0)) {
        setProviderErrors(resp.providerErrors);
      } else {
        setProviderErrors([]);
      }
    } catch (err: any) {
      console.error('Search query execution error:', err);
      setProviderErrors([err.message || 'Retrieval failed across upstream providers.']);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, continuousIngest]);

  // Execute Real-time Search with WebSocket Streaming & HTTP Fallback
  const runSearch = useCallback(async (currentFilters: SearchFilters) => {
    setIsLoading(true);
    setProviderErrors([]);

    if (cancelWsRef.current) {
      cancelWsRef.current();
      cancelWsRef.current = null;
    }

    if (currentFilters.query.trim()) {
      setRecentSearches((prev) => {
        const trimmed = currentFilters.query.trim();
        const filtered = prev.filter((s) => s.toLowerCase() !== trimmed.toLowerCase());
        return [trimmed, ...filtered].slice(0, 8);
      });
    }

    // Real-Time Streaming Search over WebSocket
    if (wsClient.getStatus() === 'connected') {
      let accumulated: ResourceItem[] = [];
      const seen = new Set<string>();

      cancelWsRef.current = wsClient.searchStream(currentFilters, {
        onStart: (data) => {
          setWsStreamProgress({ percent: 0, completed: 0, total: data.totalProviders });
          setResults([]);
        },
        onProviderResults: (data) => {
          if (data.items && data.items.length > 0) {
            const fresh = data.items.filter((item) => {
              if (seen.has(item.id)) return false;
              seen.add(item.id);
              return true;
            });
            accumulated = rankClientResults([...accumulated, ...fresh], currentFilters.query);
            setResults([...accumulated]);
            setIsLoading(false); // First provider results pop in instantly!
          }
          setWsStreamProgress({
            percent: data.percent,
            completed: data.completedProviders,
            total: data.totalProviders,
            activeProvider: data.providerId
          });
        },
        onProviderError: (data) => {
          setWsStreamProgress({
            percent: data.percent,
            completed: data.completedProviders,
            total: data.totalProviders
          });
        },
        onComplete: (data) => {
          accumulated = rankClientResults(accumulated, currentFilters.query);
          setResults([...accumulated]);
          setWsStreamProgress(null);
          setIsLoading(false);
          setTotalCount(accumulated.length);
          setCachedCount(accumulated.length);
          setTotalPages(Math.max(1, Math.ceil(accumulated.length / pageSize)));
          const counts: Partial<Record<ResourceCategory, number>> = {};
          accumulated.forEach((item) => {
            counts[item.category] = (counts[item.category] || 0) + 1;
          });
          counts['all'] = accumulated.length;
          setCategoryCounts((prev) => ({ ...prev, ...counts } as Record<ResourceCategory, number>));
        },
        onError: async (err) => {
          console.warn('WS search error, falling back to HTTP search:', err);
          setWsStreamProgress(null);
          await executeHttpSearch(currentFilters);
        }
      });
      return;
    }

    // Fallback to HTTP API
    await executeHttpSearch(currentFilters);
  }, [pageSize, continuousIngest, executeHttpSearch]);

  // Search when filters change (with debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      runSearch(filters);
    }, 250);
    return () => clearTimeout(timer);
  }, [filters, runSearch]);

  // Continuous Background Ingest Polling Loop
  useEffect(() => {
    if (!continuousIngest || !filters.query.trim()) return;

    const timer = setInterval(async () => {
      try {
        const poll = await pollBackgroundIngest(filters.query, filters.category, cachedCount);
        if (poll && poll.hasMore && poll.newItems && poll.newItems.length > 0) {
          setNewlyIngestedCount((prev) => prev + poll.newItems.length);
          setTotalCount(poll.totalCount);
          setCachedCount(poll.totalCount);
          setTotalPages(Math.ceil(poll.totalCount / pageSize));
        }
      } catch (e) {
        // Silently continue polling loop
      }
    }, 4500);

    return () => clearInterval(timer);
  }, [continuousIngest, filters.query, filters.category, cachedCount, pageSize]);

  // High-performance media preheater: pre-fetches top thumbnails into browser cache
  useEffect(() => {
    if (displayedResults && displayedResults.length > 0) {
      const urls = displayedResults
        .slice(0, 16)
        .map((r) => r.thumbnailUrl || r.previewUrl)
        .filter((url): url is string => Boolean(url && url.startsWith('http')));

      urls.forEach((url) => {
        const img = new Image();
        img.referrerPolicy = 'no-referrer';
        img.decoding = 'async';
        img.src = url;
      });
    }
  }, [displayedResults]);

  // Deep Search Trigger across 100+ open sources
  const handleTriggerDeepSearch = async () => {
    setIsHarvesting(true);
    try {
      await triggerDeepSearch(filters.query, filters.category);
      // Quickly re-run search after a moment to load freshly harvested media
      setTimeout(() => {
        runSearch(filters);
      }, 1500);
    } catch (e) {
      console.error('Deep search error:', e);
    }
  };

  // Apply newly harvested background items to view
  const handleApplyNewlyIngested = () => {
    setNewlyIngestedCount(0);
    handleUpdateFilter({ page: 1 });
  };

  // Handlers
  const handleQueryChange = (q: string) => {
    setSelectedProvider(null);
    setNewlyIngestedCount(0);
    setFilters((prev) => ({ ...prev, query: q, page: 1 }));
  };

  const handleCategoryChange = (cat: ResourceCategory) => {
    setSelectedProvider(null);
    setNewlyIngestedCount(0);
    setFilters((prev) => ({ ...prev, category: cat, page: 1 }));
  };

  const handleUpdateFilter = (partial: Partial<SearchFilters>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setFilters((prev) => ({ ...prev, page: newPage }));
    window.scrollTo({ top: 280, behavior: 'smooth' });
  };

  const handlePageSizeChange = (newSize: number) => {
    setFilters((prev) => ({ ...prev, pageSize: newSize, page: 1 }));
  };

  const handleResetFilters = () => {
    setSelectedProvider(null);
    setFilters({
      category: 'all',
      query: '',
      quality: 'Any',
      license: [],
      format: 'all',
      sortBy: 'relevance',
      page: 1,
      pageSize: 24
    });
  };

  // Selection Handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === displayedResults.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(displayedResults.map((r) => r.id));
    }
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  // Favorite Handlers
  const handleToggleFavorite = (id: string) => {
    const item = results.find((r) => r.id === id) || userOwnedList.find((r) => r.id === id);
    if (!item) return;

    setFavorites((prev) => {
      const exists = prev.some((f) => f.id === id);
      if (exists) {
        return prev.filter((f) => f.id !== id);
      } else {
        return [...prev, item];
      }
    });
  };

  const handleRemoveFavorite = (id: string) => {
    setFavorites((prev) => prev.filter((f) => f.id !== id));
  };

  // User Owned Content Handlers
  const handleAddUserResource = (resource: ResourceItem) => {
    saveUserOwnedResource(resource);
    setUserOwnedList(getUserOwnedResources());
    runSearch(filters);
  };

  const handleDeleteUserResource = (id: string) => {
    deleteUserOwnedResource(id);
    setUserOwnedList(getUserOwnedResources());
    setFavorites((prev) => prev.filter((f) => f.id !== id));
    runSearch(filters);
  };

  // Download Trigger Handlers
  const handleStartSingleDownload = (resource: ResourceItem) => {
    setDownloadResources([resource]);
  };

  const handleStartBatchDownload = () => {
    const items = results.filter((r) => selectedIds.includes(r.id));
    if (items.length > 0) {
      setDownloadResources(items);
    }
  };

  const handleRecordDownload = (downloadedItems: ResourceItem[]) => {
    const newRecords: DownloadHistoryItem[] = downloadedItems.map((item) => ({
      id: `dl-${Date.now()}-${item.id}`,
      resourceId: item.id,
      resourceTitle: item.title,
      category: item.category,
      format: item.attributes?.format || 'file',
      fileSize: item.attributes?.fileSize || 'Standard stream',
      downloadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }));

    setDownloadHistory((prev) => [...newRecords, ...prev].slice(0, 50));
  };

  // Collections Handlers
  const handleCreateCollection = (name: string, description: string) => {
    const colors = ['#3b82f6', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b', '#06b6d4'];
    const newCol: Collection = {
      id: `col-${Date.now()}`,
      name,
      description,
      color: colors[collections.length % colors.length],
      resourceIds: [],
      createdAt: new Date().toISOString().split('T')[0]
    };
    setCollections((prev) => [...prev, newCol]);
  };

  const handleDeleteCollection = (id: string) => {
    setCollections((prev) => prev.filter((c) => c.id !== id));
  };

  const handleAddToCollection = (colId: string, resourceId: string) => {
    setCollections((prev) =>
      prev.map((c) => {
        if (c.id === colId) {
          const exists = c.resourceIds.includes(resourceId);
          return {
            ...c,
            resourceIds: exists ? c.resourceIds : [...c.resourceIds, resourceId]
          };
        }
        return c;
      })
    );
  };

  const activeFilterCount =
    (filters.quality !== 'Any' ? 1 : 0) +
    filters.license.length +
    (filters.format !== 'all' ? 1 : 0);

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col antialiased selection:bg-neutral-900 selection:text-white">
      {/* Top Universal Navbar */}
      <Navbar
        favoriteCount={favorites.length}
        downloadCount={downloadHistory.length}
        wsStatus={wsStatus}
        liveActivity={liveActivity}
        onOpenLibrary={() => {
          setLibraryInitialTab('favorites');
          setIsLibraryOpen(true);
        }}
        onOpenDownloads={() => {
          setLibraryInitialTab('downloads');
          setIsLibraryOpen(true);
        }}
        onOpenTelemetry={() => setIsTelemetryOpen(true)}
        onOpenGoogleSearch={() => setIsGoogleSearchOpen(true)}
      />

      {/* Hero Universal Search Experience */}
      <SearchBar
        query={filters.query}
        onQueryChange={handleQueryChange}
        selectedCategory={filters.category}
        onCategoryChange={handleCategoryChange}
        categoryCounts={categoryCounts}
        onToggleFilters={() => setIsFilterOpen(!isFilterOpen)}
        isFilterOpen={isFilterOpen}
        activeFilterCount={activeFilterCount}
        onSelectSuggestion={(suggestion) => handleQueryChange(suggestion)}
        onOpenGoogleSearch={() => setIsGoogleSearchOpen(true)}
      />

      {/* Expandable Filter Drawer */}
      {isFilterOpen && (
        <FilterBar
          filters={filters}
          onUpdateFilter={handleUpdateFilter}
          onResetFilters={handleResetFilters}
        />
      )}

      {/* Main Resource Browsing Canvas */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Real-time Provider Error Notification if no results could be retrieved */}
        {providerErrors.length > 0 && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 flex items-start justify-between gap-3 animate-fade-in">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Provider Notice:</span>
                <p className="text-amber-800 leading-normal mt-0.5">
                  {providerErrors.join(' · ')}
                </p>
                <p className="text-amber-700/80 text-[11px] mt-1">
                  Automatic fallback providers were queried to retrieve available matches.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => runSearch(filters)}
                className="flex items-center gap-1 rounded-lg bg-amber-200/80 hover:bg-amber-300 px-2.5 py-1 text-xs font-semibold text-amber-900 transition-colors cursor-pointer"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Retry</span>
              </button>
              <button
                onClick={() => setProviderErrors([])}
                aria-label="Dismiss notice"
                className="p-1 rounded-lg text-amber-700 hover:text-amber-900 hover:bg-amber-200/60 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Real-time WebSocket Streaming Progress Banner */}
        {wsStreamProgress && (
          <div 
            id="banner-ws-streaming"
            className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-xs text-emerald-900 shadow-xs animate-fade-in"
          >
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              <span className="font-bold tracking-tight text-emerald-950">WebSocket Real-Time Stream:</span>
              <span className="text-emerald-800">
                Federating {wsStreamProgress.completed}/{wsStreamProgress.total} providers
                {wsStreamProgress.activeProvider ? ` (active: ${wsStreamProgress.activeProvider})` : ''}...
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-bold text-emerald-800">{wsStreamProgress.percent}%</span>
              <div className="h-2 w-28 overflow-hidden rounded-full bg-emerald-200/80">
                <div 
                  className="h-full bg-emerald-600 transition-all duration-300 ease-out"
                  style={{ width: `${wsStreamProgress.percent}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Unified Media Sources & Modality Aggregator Bar */}
        <SourceAggregatorBar
          resources={results}
          selectedProvider={selectedProvider}
          onSelectProvider={setSelectedProvider}
          selectedCategory={filters.category}
          onSelectCategory={handleCategoryChange}
        />

        {/* Dedicated NASA Space Observatory Section */}
        {filters.category === 'nasa' && (
          <NasaSpaceSection
            activeSubCategory={nasaSubCategory}
            onSelectSubCategory={(sub) => {
              setNasaSubCategory(sub);
              setSelectedProvider(null);
              setFilters((prev) => ({
                ...prev,
                category: 'nasa',
                nasaSubCategory: sub,
                page: 1
              }));
            }}
            onSelectQueryPrompt={(promptQuery) => {
              setSelectedProvider(null);
              setFilters((prev) => ({
                ...prev,
                category: 'nasa',
                query: promptQuery,
                page: 1
              }));
            }}
            currentQuery={filters.query}
            totalNasaCount={categoryCounts.nasa || results.filter((r) => r.category === 'nasa' || r.source?.providerId?.startsWith('nasa') || r.source?.providerId?.startsWith('archive_nasa')).length}
          />
        )}

        {/* Results Bar Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-neutral-200">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-neutral-900">
                {filters.category === 'all'
                  ? 'All Retrieved Discoveries'
                  : filters.category === 'nasa'
                  ? `NASA Deep Space Observatory — ${nasaSubCategory === 'all' ? 'All Missions' : nasaSubCategory.toUpperCase()}`
                  : filters.category.charAt(0).toUpperCase() + filters.category.slice(1)}
              </h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-neutral-200/80 text-neutral-700">
                {displayedResults.length} {selectedProvider ? `filtered (${selectedProvider})` : `on page ${page} of ${totalPages}`}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                {totalCount} total verified in repository
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Queried across 100+ open global repositories and scientific archives. Zero fabricated data.
            </p>
          </div>

          {/* Crawler / Ingestion & Batch Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Auto-Ingest Stream Toggle */}
            <button
              onClick={() => setContinuousIngest((prev) => !prev)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium border transition-colors cursor-pointer ${
                continuousIngest
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-sm'
                  : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
              }`}
              title="Continuously ingest real media from 100+ sources in the background"
            >
              <Radio className={`h-3.5 w-3.5 ${continuousIngest ? 'text-emerald-600 animate-pulse' : 'text-neutral-400'}`} />
              <span>Auto-Ingest: {continuousIngest ? 'LIVE' : 'PAUSED'}</span>
            </button>

            {/* Deep Ingest Trigger */}
            <button
              onClick={handleTriggerDeepSearch}
              disabled={isHarvesting}
              className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/80 hover:bg-indigo-100 px-3 py-1.5 text-xs font-medium text-indigo-900 transition-colors cursor-pointer disabled:opacity-50"
              title="Trigger deep multi-page crawl across all 100+ sources"
            >
              {isHarvesting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              )}
              <span>{isHarvesting ? 'Crawling...' : 'Deep Ingest'}</span>
            </button>

            <button
              onClick={() => setIsLibraryOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 text-neutral-500" />
              <span>Add Own</span>
            </button>

            {displayedResults.length > 0 && (
              <button
                onClick={handleSelectAll}
                className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:text-neutral-900 transition-colors cursor-pointer"
              >
                {selectedIds.length === displayedResults.length ? (
                  <>
                    <CheckSquare className="h-3.5 w-3.5 text-neutral-900" />
                    <span>Deselect ({displayedResults.length})</span>
                  </>
                ) : (
                  <>
                    <Square className="h-3.5 w-3.5 text-neutral-400" />
                    <span>Select All ({displayedResults.length})</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Live Ingest Alert Banner */}
        {newlyIngestedCount > 0 && (
          <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50/90 p-3.5 shadow-sm flex items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shrink-0">
                <Sparkles className="h-4 w-4 animate-spin" />
              </div>
              <div>
                <span className="text-xs font-bold text-indigo-950">
                  Background Crawler Active: +{newlyIngestedCount} new real resources cached from open web!
                </span>
                <p className="text-[11px] text-indigo-700">
                  Continuous ingestion is harvesting verified media without duplicates.
                </p>
              </div>
            </div>
            <button
              onClick={handleApplyNewlyIngested}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer shrink-0"
            >
              View Newest Results
            </button>
          </div>
        )}

        {/* Loading Spinner */}
        {isLoading && (
          <div className="py-20 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-neutral-900 mb-3" />
            <p className="text-sm font-medium text-neutral-700">
              Querying real-time open repositories...
            </p>
            <p className="text-xs text-neutral-400 mt-1">
              Aggregating live metadata from 100+ open scientific, cultural, visual, cartographic &amp; academic providers
            </p>
          </div>
        )}

        {/* Empty State: No matching resources found */}
        {!isLoading && displayedResults.length === 0 && (
          <div className="py-24 text-center max-w-md mx-auto">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-200/60 mx-auto mb-4 text-neutral-600">
              <Info className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold text-neutral-900">
              {selectedProvider ? `No items in currently selected source` : 'No matching resources found.'}
            </h3>
            <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
              {selectedProvider 
                ? `The selected archive didn't return matches for "${filters.query || 'this query'}". Try viewing all connected sources.`
                : `No results were returned by open repository providers for "${filters.query || 'this query'}". Try another search term, selecting a different category, or triggering a deep ingest.`}
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              {selectedProvider ? (
                <button
                  onClick={() => setSelectedProvider(null)}
                  className="rounded-xl bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  View All Sources ({results.length})
                </button>
              ) : (
                <button
                  onClick={handleResetFilters}
                  className="rounded-xl bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  Reset Filters
                </button>
              )}
              <button
                onClick={handleTriggerDeepSearch}
                className="rounded-xl border border-indigo-300 bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-800 hover:bg-indigo-100 transition-colors cursor-pointer"
              >
                Trigger Deep Search
              </button>
            </div>
          </div>
        )}

        {/* Resource Cards Grid */}
        {!isLoading && displayedResults.length > 0 && (
          <>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {displayedResults.map((resource, index) => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  isSelected={selectedIds.includes(resource.id)}
                  onToggleSelect={handleToggleSelect}
                  isFavorite={favorites.some((f) => f.id === resource.id)}
                  onToggleFavorite={handleToggleFavorite}
                  onOpenPreview={(res) => setPreviewResource(res)}
                  onStartDownload={(res) => handleStartSingleDownload(res)}
                  priority={index < 8}
                />
              ))}
            </div>

            {/* Pagination Navigation & Batch Tools */}
            {totalCount > 0 && (
              <div className="mt-10 pt-6 border-t border-neutral-200 flex flex-col md:flex-row items-center justify-between gap-4">
                {/* Range & Source Telemetry */}
                <div className="text-xs text-neutral-600">
                  Showing <span className="font-semibold text-neutral-900">{(page - 1) * pageSize + 1}</span>–
                  <span className="font-semibold text-neutral-900">{Math.min(page * pageSize, totalCount)}</span> of{' '}
                  <span className="font-semibold text-neutral-900">{totalCount}</span> verified open resources
                  {isHarvesting && (
                    <span className="ml-2 inline-flex items-center gap-1 text-[11px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md font-medium">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Crawling 100+ sources...
                    </span>
                  )}
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={page <= 1}
                    className="rounded-lg border border-neutral-200 bg-white p-2 text-xs font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="First Page"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page <= 1}
                    className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Prev</span>
                  </button>

                  {/* Numbered Page Buttons */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let p = page;
                      if (totalPages <= 5) {
                        p = i + 1;
                      } else if (page <= 3) {
                        p = i + 1;
                      } else if (page >= totalPages - 2) {
                        p = totalPages - 4 + i;
                      } else {
                        p = page - 2 + i;
                      }
                      return (
                        <button
                          key={p}
                          onClick={() => handlePageChange(p)}
                          className={`h-8 w-8 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                            page === p
                              ? 'bg-neutral-900 text-white'
                              : 'border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100'
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page >= totalPages}
                    className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    disabled={page >= totalPages}
                    className="rounded-lg border border-neutral-200 bg-white p-2 text-xs font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="Last Page"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </button>
                </div>

                {/* Page Size Selector & Download Page Button */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-xs text-neutral-600">
                    <span className="text-[11px] uppercase font-bold text-neutral-400">Items:</span>
                    {[12, 24, 48, 96].map((num) => (
                      <button
                        key={num}
                        onClick={() => handlePageSizeChange(num)}
                        className={`rounded-md px-2 py-1 text-xs font-medium transition-colors cursor-pointer ${
                          pageSize === num
                            ? 'bg-neutral-900 text-white shadow-sm'
                            : 'border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setDownloadResources(results)}
                    className="flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-50 transition-colors cursor-pointer ml-2"
                    title="Download all media currently displayed on this page"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download Page ({results.length})</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Floating Bottom Action Bar for Multi-Selection */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 inset-x-0 z-40 flex justify-center px-4 pointer-events-none animate-slide-up">
          <div className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-neutral-900 px-5 py-3 text-white shadow-2xl ring-1 ring-white/10">
            <div className="flex items-center gap-2 pr-3 border-r border-neutral-700">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-neutral-950 text-xs font-bold">
                {selectedIds.length}
              </span>
              <span className="text-xs font-semibold">Selected</span>
            </div>

            <button
              id="btn-batch-download"
              onClick={handleStartBatchDownload}
              className="flex items-center gap-2 rounded-xl bg-white px-3.5 py-1.5 text-xs font-semibold text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Selected ({selectedIds.length})</span>
            </button>

            <button
              onClick={() => {
                selectedIds.forEach((id) => {
                  const item = results.find((r) => r.id === id);
                  if (item && !favorites.some((f) => f.id === id)) {
                    setFavorites((prev) => [...prev, item]);
                  }
                });
                setIsLibraryOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-xl border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <FolderHeart className="h-3.5 w-3.5 text-pink-400" />
              <span>Save to Library</span>
            </button>

            <button
              onClick={handleClearSelection}
              className="text-xs font-medium text-neutral-400 hover:text-white px-2 py-1 cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Resource Detail & Full Preview Modal */}
      {previewResource && (
        <ResourceDetailModal
          resource={previewResource}
          onClose={() => setPreviewResource(null)}
          isFavorite={favorites.some((f) => f.id === previewResource.id)}
          onToggleFavorite={handleToggleFavorite}
          onStartDownload={handleStartSingleDownload}
          collections={collections}
          onAddToCollection={handleAddToCollection}
        />
      )}

      {/* Real Download Preparation Modal */}
      {downloadResources && (
        <DownloadModal
          resources={downloadResources}
          onClose={() => setDownloadResources(null)}
          onRecordDownload={handleRecordDownload}
        />
      )}

      {/* My Library & Collections Drawer with User Uploads */}
      <LibraryDrawer
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        favorites={favorites}
        collections={collections}
        downloadHistory={downloadHistory}
        recentSearches={recentSearches}
        userOwnedResources={userOwnedList}
        initialTab={libraryInitialTab}
        onSelectResource={(res) => {
          setIsLibraryOpen(false);
          setPreviewResource(res);
        }}
        onRemoveFavorite={handleRemoveFavorite}
        onCreateCollection={handleCreateCollection}
        onDeleteCollection={handleDeleteCollection}
        onSelectSearchQuery={(q) => {
          handleQueryChange(q);
        }}
        onDownloadMultiple={(items) => {
          setIsLibraryOpen(false);
          setDownloadResources(items);
        }}
        onDownloadSingle={(item) => {
          setIsLibraryOpen(false);
          setDownloadResources([item]);
        }}
        onAddUserResource={handleAddUserResource}
        onDeleteUserResource={handleDeleteUserResource}
      />

      {/* Live Gateway Telemetry & Health Modal */}
      <AdminTelemetryModal
        isOpen={isTelemetryOpen}
        onClose={() => setIsTelemetryOpen(false)}
      />

      {/* Google Programmable Search Modal */}
      <GoogleSearchModal
        isOpen={isGoogleSearchOpen}
        onClose={() => setIsGoogleSearchOpen(false)}
        cx="30821318e53074c88"
        initialQuery={filters.query}
      />

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-white py-6 text-center text-xs text-neutral-500">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-neutral-800">URMIL</span>
            <span>·</span>
            <span>Universal Resource Media &amp; Intelligence Layer</span>
          </div>
          <div className="flex items-center gap-4 text-neutral-400">
            <span>Live Real-Time Query Architecture</span>
            <span>·</span>
            <button
              onClick={() => setIsTelemetryOpen(true)}
              className="hover:text-neutral-700 underline cursor-pointer"
            >
              Engine Diagnostics &amp; Telemetry
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
