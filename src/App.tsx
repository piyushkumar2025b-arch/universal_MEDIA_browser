/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Loader2, 
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { 
  ResourceItem, 
  ResourceCategory, 
  SearchFilters, 
  Collection, 
  DownloadHistoryItem
} from './types/resource';
import { 
  searchResources, 
  getUserOwnedResources 
} from './services/gatewayService';
import { wsClient } from './services/websocketClient';
import { PersonalHeader } from './components/PersonalHeader';
import { PersonalSearch } from './components/PersonalSearch';
import { FilterBar } from './components/FilterBar';
import { ResourceCard } from './components/ResourceCard';
import { ResourceDetailModal } from './components/ResourceDetailModal';
import { DownloadModal } from './components/DownloadModal';
import { WalletModal } from './components/WalletModal';
import { useWeb3Wallet } from './services/web3Wallet';
import { rankClientResults } from './utils/searchRelevance';
import { ThemeId, THEMES } from './types/theme';

const DEFAULT_COLLECTIONS: Collection[] = [
  {
    id: 'col-default',
    name: 'Saved Curations',
    description: 'Personal research & media assets',
    color: '#3b82f6',
    resourceIds: [],
    createdAt: new Date().toISOString().split('T')[0]
  }
];

export default function App() {
  // Theme State
  const [activeTheme, setActiveTheme] = useState<ThemeId>(() => {
    try {
      const saved = localStorage.getItem('personal_studio_theme');
      if (saved && ['studio-light', 'midnight-oled', 'nordic-slate', 'warm-editorial', 'obsidian-gold'].includes(saved)) {
        return saved as ThemeId;
      }
    } catch {}
    return 'studio-light';
  });

  useEffect(() => {
    try {
      localStorage.setItem('personal_studio_theme', activeTheme);
    } catch {}
  }, [activeTheme]);

  const currentThemeDef = THEMES[activeTheme] || THEMES['studio-light'];
  const isDark = currentThemeDef.isDark;

  // Navigation & View State (Personalized)
  const [activeView, setActiveView] = useState<'discover' | 'saved' | 'downloads'>('discover');
  const [viewDensity, setViewDensity] = useState<'spacious' | 'grid'>('spacious');

  // Search & Filter State
  const [filters, setFilters] = useState<SearchFilters>({
    category: 'all',
    query: 'science',
    quality: 'Any',
    license: [],
    format: 'all',
    sortBy: 'relevance',
    page: 1,
    pageSize: 36
  });

  const [results, setResults] = useState<ResourceItem[]>([]);
  const [userOwnedList] = useState<ResourceItem[]>(() => getUserOwnedResources());
  const [isLoading, setIsLoading] = useState(true);

  // Pagination & Results State
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Panels & Modals State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [previewResource, setPreviewResource] = useState<ResourceItem | null>(null);
  const [downloadResources, setDownloadResources] = useState<ResourceItem[] | null>(null);
  const [isWalletOpen, setIsWalletOpen] = useState(false);

  // Web3 Wallet
  const { isConnected: isWalletConnected, address: walletAddress } = useWeb3Wallet();

  // Search Abort Controller ref for in-flight cancellation
  const searchAbortControllerRef = useRef<AbortController | null>(null);
  const cancelWsRef = useRef<(() => void) | null>(null);

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

  // Stable HTTP search execution
  const executeHttpSearch = useCallback(async (currentFilters: SearchFilters, signal?: AbortSignal) => {
    try {
      const resp = await searchResources(currentFilters, signal);
      if (signal?.aborted) return;
      setResults(resp.results || []);
      setTotalPages(resp.totalPages || 1);
      setTotalCount(resp.totalCount || (resp.results ? resp.results.length : 0));
    } catch (err: any) {
      if (err?.name === 'AbortError' || signal?.aborted) return;
      console.error('Search query execution error:', err);
      setResults([]);
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  // Execute Search: Aborts any in-flight requests to eliminate race conditions
  const runSearch = useCallback(async (currentFilters: SearchFilters) => {
    setIsLoading(true);

    if (searchAbortControllerRef.current) {
      searchAbortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    searchAbortControllerRef.current = abortController;

    if (cancelWsRef.current) {
      cancelWsRef.current();
      cancelWsRef.current = null;
    }

    await executeHttpSearch(currentFilters, abortController.signal);
  }, [executeHttpSearch]);

  // Execute search when filters are committed (on Enter, category select, or pagination)
  useEffect(() => {
    runSearch(filters);
    return () => {
      if (searchAbortControllerRef.current) {
        searchAbortControllerRef.current.abort();
      }
    };
  }, [filters, runSearch]);

  // Committed search handlers (Only searches on Enter / explicit submit)
  const handleCommitSearch = (newQuery: string) => {
    const trimmed = newQuery.trim();
    if (activeView !== 'discover') {
      setActiveView('discover');
    }
    setFilters((prev) => {
      if (prev.query.trim() === trimmed && prev.page === 1) {
        return prev;
      }
      return { ...prev, query: trimmed, page: 1 };
    });
  };

  const handleCategoryChange = (category: ResourceCategory, queryToSearch?: string) => {
    const nextQuery = queryToSearch !== undefined ? queryToSearch.trim() : filters.query.trim();
    if (activeView !== 'discover') {
      setActiveView('discover');
    }
    setFilters((prev) => {
      if (prev.category === category && prev.query.trim() === nextQuery && prev.page === 1) {
        return prev;
      }
      return {
        ...prev,
        category,
        query: nextQuery,
        page: 1
      };
    });
  };

  const handleUpdateFilter = (key: keyof SearchFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleResetFilters = () => {
    setFilters({
      category: 'all',
      query: '',
      quality: 'Any',
      license: [],
      format: 'all',
      sortBy: 'relevance',
      page: 1,
      pageSize: 36
    });
  };

  const handlePageChange = (newPage: number) => {
    setFilters((prev) => {
      if (prev.page === newPage) return prev;
      return { ...prev, page: newPage };
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Favorites Handlers
  const handleToggleFavorite = (id: string) => {
    const existing = favorites.find((f) => f.id === id);
    if (existing) {
      setFavorites((prev) => prev.filter((f) => f.id !== id));
    } else {
      const item = results.find((r) => r.id === id) || userOwnedList.find((r) => r.id === id);
      if (item) {
        setFavorites((prev) => [item, ...prev]);
      }
    }
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

  // Download Handlers
  const handleStartSingleDownload = (resource: ResourceItem) => {
    setDownloadResources([resource]);
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

    setDownloadHistory((prev) => [...newRecords, ...prev].slice(0, 100));
  };

  // Determine items to display based on active personalized view
  const itemsToDisplay = useMemo(() => {
    if (activeView === 'saved') {
      return favorites;
    }
    if (activeView === 'downloads') {
      const dlIds = new Set(downloadHistory.map((d) => d.resourceId));
      const matched = [...favorites, ...results, ...userOwnedList].filter((r) => dlIds.has(r.id));
      return matched.length > 0 ? matched : favorites;
    }
    return results;
  }, [activeView, favorites, downloadHistory, results, userOwnedList]);

  return (
    <div className={`min-h-screen ${currentThemeDef.bgClass} ${currentThemeDef.textClass} flex flex-col antialiased transition-colors duration-200`}>
      {/* Personalized Clean Header with Themes & View Preferences */}
      <PersonalHeader
        activeView={activeView}
        onSelectView={setActiveView}
        savedCount={favorites.length}
        downloadCount={downloadHistory.length}
        viewDensity={viewDensity}
        onToggleDensity={() => setViewDensity((prev) => (prev === 'spacious' ? 'grid' : 'spacious'))}
        walletAddress={walletAddress}
        onOpenWallet={() => setIsWalletOpen(true)}
        activeTheme={activeTheme}
        onSelectTheme={setActiveTheme}
      />

      {/* Main Content Area: Maximum Focus on Media View */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* VIEW: DISCOVER */}
        {activeView === 'discover' && (
          <>
            {/* Clean Unboxed Search & Inline Categories */}
            <PersonalSearch
              query={filters.query}
              onCommitSearch={handleCommitSearch}
              selectedCategory={filters.category}
              onCategoryChange={handleCategoryChange}
              onToggleFilters={() => setIsFilterOpen(!isFilterOpen)}
              isFilterOpen={isFilterOpen}
              theme={activeTheme}
            />

            {/* Optional Collapsible Filter Bar */}
            {isFilterOpen && (
              <div className={`py-4 border-b mb-6 ${currentThemeDef.borderClass}`}>
                <FilterBar
                  filters={filters}
                  onUpdateFilter={handleUpdateFilter}
                  onResetFilters={handleResetFilters}
                />
              </div>
            )}
          </>
        )}

        {/* VIEW: SAVED LIBRARY */}
        {activeView === 'saved' && (
          <div className="pt-6 pb-4">
            <h1 className={`text-xl font-medium tracking-tight ${isDark ? 'text-white' : 'text-neutral-900'}`}>
              Personal Saved Library
            </h1>
            <p className={`text-xs mt-1 ${currentThemeDef.mutedTextClass}`}>
              {favorites.length} {favorites.length === 1 ? 'item' : 'items'} saved for study and reference
            </p>
          </div>
        )}

        {/* VIEW: DOWNLOADS */}
        {activeView === 'downloads' && (
          <div className="pt-6 pb-4">
            <h1 className={`text-xl font-medium tracking-tight ${isDark ? 'text-white' : 'text-neutral-900'}`}>
              Downloaded Assets
            </h1>
            <p className={`text-xs mt-1 ${currentThemeDef.mutedTextClass}`}>
              {downloadHistory.length} {downloadHistory.length === 1 ? 'asset' : 'assets'} recorded in your session
            </p>
          </div>
        )}

        {/* Loading State: Clean minimal indicator */}
        {isLoading && activeView === 'discover' && (
          <div className="py-24 text-center">
            <Loader2 className={`h-6 w-6 animate-spin mx-auto mb-3 opacity-60`} />
            <p className={`text-xs ${currentThemeDef.mutedTextClass}`}>Loading open visual media...</p>
          </div>
        )}

        {/* Empty State: Saved */}
        {activeView === 'saved' && favorites.length === 0 && (
          <div className="py-28 text-center max-w-sm mx-auto">
            <p className={`text-sm font-medium ${isDark ? 'text-neutral-200' : 'text-neutral-800'}`}>
              Your personal library is empty
            </p>
            <p className={`text-xs mt-1 leading-relaxed ${currentThemeDef.mutedTextClass}`}>
              Hover over any artwork, photograph, or document and tap the heart to save it here.
            </p>
            <button
              onClick={() => setActiveView('discover')}
              className={`mt-4 text-xs font-medium underline cursor-pointer ${isDark ? 'text-white' : 'text-neutral-900'}`}
            >
              Explore media
            </button>
          </div>
        )}

        {/* Empty State: Downloads */}
        {activeView === 'downloads' && downloadHistory.length === 0 && (
          <div className="py-28 text-center max-w-sm mx-auto">
            <p className={`text-sm font-medium ${isDark ? 'text-neutral-200' : 'text-neutral-800'}`}>
              No downloads logged
            </p>
            <p className={`text-xs mt-1 leading-relaxed ${currentThemeDef.mutedTextClass}`}>
              Open any media item to download high-resolution files and citations.
            </p>
            <button
              onClick={() => setActiveView('discover')}
              className={`mt-4 text-xs font-medium underline cursor-pointer ${isDark ? 'text-white' : 'text-neutral-900'}`}
            >
              Discover media
            </button>
          </div>
        )}

        {/* Empty State: Discover search no results */}
        {!isLoading && activeView === 'discover' && itemsToDisplay.length === 0 && (
          <div className="py-28 text-center max-w-sm mx-auto">
            <p className={`text-sm font-medium ${isDark ? 'text-neutral-200' : 'text-neutral-800'}`}>
              No matching media found
            </p>
            <p className={`text-xs mt-1 leading-relaxed ${currentThemeDef.mutedTextClass}`}>
              Try a different keyword or select another category above.
            </p>
            <button
              onClick={handleResetFilters}
              className={`mt-4 text-xs font-medium underline cursor-pointer ${isDark ? 'text-white' : 'text-neutral-900'}`}
            >
              Reset search
            </button>
          </div>
        )}

        {/* View-First Gallery: Edge-to-Edge, Clean, No Boxes */}
        {itemsToDisplay.length > 0 && (!isLoading || activeView !== 'discover') && (
          <>
            <div
              className={`mt-4 grid transition-all duration-300 ${
                viewDensity === 'spacious'
                  ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10'
                  : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6'
              }`}
            >
              {itemsToDisplay.map((resource, index) => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  isSelected={false}
                  onToggleSelect={() => {}}
                  isFavorite={favorites.some((f) => f.id === resource.id)}
                  onToggleFavorite={handleToggleFavorite}
                  onOpenPreview={(res) => setPreviewResource(res)}
                  onStartDownload={(res) => handleStartSingleDownload(res)}
                  priority={index < 8}
                  theme={activeTheme}
                />
              ))}
            </div>

            {/* Quiet Pagination for Discover View */}
            {activeView === 'discover' && totalPages > 1 && (
              <div className={`mt-14 pt-6 border-t flex items-center justify-between text-xs ${currentThemeDef.borderClass} ${currentThemeDef.mutedTextClass}`}>
                <span>
                  Page {filters.page || 1} of {totalPages}
                </span>

                <div className="flex items-center gap-6">
                  <button
                    onClick={() => handlePageChange((filters.page || 1) - 1)}
                    disabled={(filters.page || 1) <= 1}
                    className={`flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors ${
                      isDark ? 'text-neutral-300 hover:text-white' : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    <span>Previous</span>
                  </button>

                  <button
                    onClick={() => handlePageChange((filters.page || 1) + 1)}
                    disabled={(filters.page || 1) >= totalPages}
                    className={`flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors ${
                      isDark ? 'text-neutral-300 hover:text-white' : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    <span>Next</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* High-Resolution View & Media Inspection Modal */}
      {previewResource && (
        <ResourceDetailModal
          resource={previewResource}
          onClose={() => setPreviewResource(null)}
          isFavorite={favorites.some((f) => f.id === previewResource.id)}
          onToggleFavorite={handleToggleFavorite}
          onStartDownload={handleStartSingleDownload}
          collections={collections}
          onAddToCollection={handleAddToCollection}
          relatedResources={results.filter((r) => r.id !== previewResource.id)}
          onSelectRelated={(res) => setPreviewResource(res)}
          theme={activeTheme}
        />
      )}

      {/* Real Download Modal */}
      {downloadResources && (
        <DownloadModal
          resources={downloadResources}
          onClose={() => setDownloadResources(null)}
          onRecordDownload={handleRecordDownload}
        />
      )}

      {/* Web3 / MetaMask Wallet Modal */}
      <WalletModal
        isOpen={isWalletOpen}
        onClose={() => setIsWalletOpen(false)}
        favoritesCount={favorites.length}
        collectionsCount={collections.length}
      />

      {/* Clean Minimalist Footer */}
      <footer className={`mt-auto border-t py-8 text-center text-xs ${currentThemeDef.borderClass} ${currentThemeDef.mutedTextClass}`}>
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Personal Visual Studio · Curated Open Media</span>
          <span>Fast, distraction-free viewing</span>
        </div>
      </footer>
    </div>
  );
}
