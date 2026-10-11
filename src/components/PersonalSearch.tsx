/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, SlidersHorizontal, CornerDownLeft, Zap, ChevronDown, Radio, Waves, Activity, Database, Globe, Flame } from 'lucide-react';
import { ResourceCategory, FetchMethod } from '../types/resource';
import { ThemeId, THEMES } from '../types/theme';
import { prefetchResourceQuery, FETCH_METHODS } from '../services/gatewayService';

interface PersonalSearchProps {
  query: string;
  onCommitSearch: (query: string) => void;
  selectedCategory: ResourceCategory;
  onCategoryChange: (cat: ResourceCategory, queryToSearch?: string) => void;
  onToggleFilters?: () => void;
  isFilterOpen?: boolean;
  theme?: ThemeId;
  fetchMethod?: FetchMethod;
  onFetchMethodChange?: (method: FetchMethod) => void;
  latencyMs?: number | null;
  sourceSummary?: string;
}

const PRIMARY_CATEGORIES: { id: ResourceCategory; label: string }[] = [
  { id: 'all', label: 'All Media' },
  { id: 'images', label: 'Images' },
  { id: 'art', label: 'Fine Art' },
  { id: 'videos', label: 'Video' },
  { id: 'music', label: 'Music & Audio' },
  { id: 'papers', label: 'Research Papers' },
  { id: 'maps', label: 'Cartography' },
  { id: 'books', label: 'Books' },
  { id: 'news', label: 'Global News' },
  { id: 'nasa', label: 'Space & NASA' },
  { id: 'biodiversity', label: 'Nature' },
  { id: 'code', label: 'Open Code' },
  { id: 'finance', label: 'Markets' },
];

export const PersonalSearch: React.FC<PersonalSearchProps> = ({
  query,
  onCommitSearch,
  selectedCategory,
  onCategoryChange,
  onToggleFilters,
  isFilterOpen = false,
  theme = 'studio-light',
  fetchMethod = 'auto',
  onFetchMethodChange,
  latencyMs,
  sourceSummary
}) => {
  const themeDef = THEMES[theme] || THEMES['studio-light'];
  const isDark = themeDef.isDark;

  const [isMethodMenuOpen, setIsMethodMenuOpen] = useState(false);
  const methodMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (methodMenuRef.current && !methodMenuRef.current.contains(event.target as Node)) {
        setIsMethodMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Local input state for smooth typing without triggering network searches on every keystroke
  const [inputValue, setInputValue] = useState(query);

  // Sync with committed query if updated externally
  useEffect(() => {
    setInputValue(query);
  }, [query]);

  const hasUncommittedChanges = inputValue.trim() !== query.trim();

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onCommitSearch(inputValue.trim());
  };

  const handleClear = () => {
    setInputValue('');
    if (query !== '') {
      onCommitSearch('');
    }
  };

  const handleCategoryClick = (catId: ResourceCategory) => {
    onCategoryChange(catId, inputValue.trim());
  };

  const currentMethodMeta = FETCH_METHODS.find(m => m.id === fetchMethod) || FETCH_METHODS[0];

  const getMethodIcon = (id?: string) => {
    switch (id) {
      case 'auto':
      case 'streaming': return <Zap className="h-3.5 w-3.5 text-amber-500" />;
      case 'fastest': return <Flame className="h-3.5 w-3.5 text-rose-500" />;
      case 'direct': return <Radio className="h-3.5 w-3.5 text-emerald-500" />;
      case 'waterfall': return <Waves className="h-3.5 w-3.5 text-sky-500" />;
      case 'websocket': return <Activity className="h-3.5 w-3.5 text-indigo-500" />;
      case 'vault': return <Database className="h-3.5 w-3.5 text-purple-500" />;
      case 'standard':
      default: return <Globe className="h-3.5 w-3.5 text-neutral-400" />;
    }
  };

  return (
    <div className="w-full pt-8 pb-4">
      {/* Search Form: Only searches when Enter is pressed or submitted */}
      <form onSubmit={handleSubmit} className="w-full">
        <div className={`relative flex items-center border-b transition-colors pb-2.5 ${
          isDark 
            ? 'border-neutral-800 focus-within:border-neutral-300' 
            : 'border-neutral-200 focus-within:border-neutral-900'
        }`}>
          <Search className={`h-5 w-5 shrink-0 mr-3 ${themeDef.mutedTextClass}`} />
          
          <input
            id="personal-search-input"
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Search archives, photography, cinema, open manuscripts, sound... (Press Enter ↵)"
            className={`w-full bg-transparent text-lg sm:text-xl font-normal focus:outline-none ${themeDef.textClass} placeholder:${themeDef.mutedTextClass}`}
          />

          {/* Clear button if input has text */}
          {inputValue && (
            <button
              type="button"
              onClick={handleClear}
              className={`p-1.5 transition-colors cursor-pointer mr-1.5 ${themeDef.mutedTextClass} hover:${themeDef.textClass}`}
              title="Clear text"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Latency Indicator Badge */}
          {latencyMs !== undefined && latencyMs !== null && (
            <div 
              className={`hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono mr-2 shrink-0 transition-opacity ${
                isDark ? 'bg-neutral-900 text-neutral-400 border border-neutral-800' : 'bg-neutral-100 text-neutral-600 border border-neutral-200'
              }`}
              title={`Resolved in ${latencyMs}ms via ${sourceSummary || currentMethodMeta.name}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${latencyMs < 50 ? 'bg-emerald-500' : latencyMs < 300 ? 'bg-amber-500' : 'bg-blue-500'} animate-pulse`} />
              <span>{latencyMs}ms</span>
            </div>
          )}

          {/* Fetch Method Selector Trigger */}
          {onFetchMethodChange && (
            <div className="relative mr-2 shrink-0" ref={methodMenuRef}>
              <button
                type="button"
                onClick={() => setIsMethodMenuOpen(!isMethodMenuOpen)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium cursor-pointer border transition-colors ${
                  isDark
                    ? 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border-neutral-800'
                    : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border-neutral-200'
                }`}
                title={`Fetch Engine: ${currentMethodMeta.name} (${currentMethodMeta.description})`}
              >
                {getMethodIcon(fetchMethod)}
                <span className="hidden sm:inline font-medium">{currentMethodMeta.name}</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>

              {/* Fetch Method Selection Dropdown */}
              {isMethodMenuOpen && (
                <div 
                  className={`absolute right-0 top-full mt-2 w-72 rounded-xl shadow-2xl p-2 z-50 border backdrop-blur-md ${
                    isDark
                      ? 'bg-neutral-950/95 border-neutral-800 text-neutral-200'
                      : 'bg-white/95 border-neutral-200 text-neutral-900'
                  }`}
                >
                  <div className="px-2.5 py-1.5 border-b mb-1 border-neutral-800/40">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Fetching Architecture</p>
                    <p className="text-[10px] text-neutral-500">Switch engine to reduce latency or test alternate pathways</p>
                  </div>
                  <div className="space-y-0.5 max-h-72 overflow-y-auto">
                    {FETCH_METHODS.map((method) => {
                      const isSelected = fetchMethod === method.id;
                      return (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => {
                            onFetchMethodChange(method.id as FetchMethod);
                            setIsMethodMenuOpen(false);
                          }}
                          className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer flex items-start gap-2.5 ${
                            isSelected
                              ? (isDark ? 'bg-neutral-800 text-white font-medium' : 'bg-neutral-100 text-neutral-950 font-medium')
                              : (isDark ? 'hover:bg-neutral-900/80 text-neutral-400 hover:text-neutral-200' : 'hover:bg-neutral-50 text-neutral-600 hover:text-neutral-900')
                          }`}
                        >
                          <div className="mt-0.5 shrink-0">
                            {getMethodIcon(method.id)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-xs">{method.name}</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-500/10 text-neutral-400">
                                {method.typicalLatency}
                              </span>
                            </div>
                            <p className="text-[10px] opacity-75 mt-0.5 leading-snug line-clamp-2">
                              {method.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Subtle "Press Enter" hint or Submit button */}
          {hasUncommittedChanges && (
            <button
              type="submit"
              className={`hidden sm:flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md mr-2 transition-all cursor-pointer ${
                isDark 
                  ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700' 
                  : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-200'
              }`}
              title="Press Enter to search"
            >
              <span>Search</span>
              <CornerDownLeft className="h-3 w-3 opacity-60" />
            </button>
          )}

          {onToggleFilters && (
            <button
              type="button"
              onClick={onToggleFilters}
              className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md transition-colors cursor-pointer shrink-0 ${
                isFilterOpen 
                  ? (isDark ? 'text-white font-semibold bg-neutral-800' : 'text-neutral-900 font-semibold bg-neutral-100') 
                  : `${themeDef.mutedTextClass} hover:${themeDef.textClass}`
              }`}
              title="Toggle fine filters"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Refine</span>
            </button>
          )}
        </div>
      </form>

      {/* Unboxed, horizontal category navigation */}
      <div className="flex items-center gap-6 overflow-x-auto no-scrollbar pt-4 pb-1 text-xs whitespace-nowrap">
        {PRIMARY_CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.id)}
              onMouseEnter={() => prefetchResourceQuery({ category: cat.id, query: inputValue || query })}
              className={`transition-colors cursor-pointer pb-1 relative ${
                isActive
                  ? `${themeDef.textClass} font-semibold`
                  : `${themeDef.mutedTextClass} hover:${themeDef.textClass}`
              }`}
            >
              <span>{cat.label}</span>
              {isActive && (
                <span className={`absolute bottom-0 left-0 right-0 h-[2px] rounded-full ${
                  isDark ? 'bg-white' : 'bg-neutral-900'
                }`} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
