import React from 'react';
import { 
  Search, 
  X, 
  SlidersHorizontal,
  ArrowRight,
  Globe
} from 'lucide-react';
import { ResourceCategory } from '../types/resource';
import { getAllCategories } from '../services/gatewayService';

interface SearchBarProps {
  query: string;
  onQueryChange: (q: string) => void;
  selectedCategory: ResourceCategory;
  onCategoryChange: (cat: ResourceCategory) => void;
  categoryCounts: Record<ResourceCategory, number>;
  onToggleFilters: () => void;
  isFilterOpen: boolean;
  activeFilterCount: number;
  onSelectSuggestion: (q: string) => void;
  onOpenGoogleSearch?: () => void;
}

const POPULAR_SUGGESTIONS = [
  'Mona Lisa',
  'Frankenstein',
  'Quantum computing',
  'Tokyo weather',
  'TypeScript compiler',
  'Biodiversity Amazon',
  'Lo-Fi study beat',
  'Earthquake seismic'
];

export const SearchBar: React.FC<SearchBarProps> = ({
  query,
  onQueryChange,
  selectedCategory,
  onCategoryChange,
  categoryCounts,
  onToggleFilters,
  isFilterOpen,
  activeFilterCount,
  onSelectSuggestion,
  onOpenGoogleSearch
}) => {
  const categories = getAllCategories();

  const handleClear = () => {
    onQueryChange('');
  };

  return (
    <div className="w-full bg-gradient-to-b from-neutral-50/80 to-white py-8 px-4 sm:px-6 lg:px-8 border-b border-neutral-100">
      <div className="mx-auto max-w-4xl text-center">
        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-900 mb-2">
          What are you looking for?
        </h1>
        <p className="text-sm text-neutral-500 max-w-xl mx-auto mb-6">
          Search millions of openly accessible photos, footage, soundtrack stems, peer-reviewed papers, and cartography in one unified catalog.
        </p>

        {/* Input box */}
        <div className="relative mx-auto flex items-center rounded-2xl bg-white shadow-sm ring-1 ring-neutral-200/80 focus-within:ring-2 focus-within:ring-neutral-900 transition-all p-1.5">
          <div className="flex items-center pl-3.5 pointer-events-none text-neutral-400">
            <Search className="h-5 w-5" />
          </div>

          <input
            id="search-input-field"
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search images, videos, music, research papers, maps..."
            className="w-full border-none bg-transparent px-3 py-2.5 text-base text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-0"
          />

          {query && (
            <button
              onClick={handleClear}
              className="p-1.5 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-100 transition-colors mr-1"
              title="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Filter button */}
          <button
            id="btn-toggle-filters"
            onClick={onToggleFilters}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors shrink-0 ${
              isFilterOpen || activeFilterCount > 0
                ? 'bg-neutral-900 text-white'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200/80'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold text-neutral-900">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Quick Google Programmable Search trigger */}
          {onOpenGoogleSearch && (
            <button
              id="btn-trigger-google-cse"
              onClick={onOpenGoogleSearch}
              title="Search with Google Programmable Engine"
              className="flex items-center gap-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 transition-colors shrink-0 ml-1"
            >
              <Globe className="h-3.5 w-3.5 text-blue-600" />
              <span className="hidden sm:inline">Google</span>
            </button>
          )}
        </div>

        {/* Quick Suggestion Chips */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 text-xs text-neutral-500">
          <span className="text-neutral-400">Popular:</span>
          {POPULAR_SUGGESTIONS.map((item) => (
            <button
              key={item}
              onClick={() => onSelectSuggestion(item)}
              className="rounded-full bg-neutral-100/90 hover:bg-neutral-200/80 px-2.5 py-0.5 text-neutral-600 transition-colors cursor-pointer"
            >
              {item}
            </button>
          ))}
        </div>

        {/* Category Pills Bar */}
        <div className="mt-7 flex items-center justify-start sm:justify-center overflow-x-auto pb-1 gap-1.5 scrollbar-none">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            const count = categoryCounts[cat.id] ?? 0;

            return (
              <button
                key={cat.id}
                id={`cat-tab-${cat.id}`}
                onClick={() => onCategoryChange(cat.id)}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-neutral-900 text-white shadow-sm ring-1 ring-neutral-900'
                    : 'bg-white text-neutral-600 border border-neutral-200/80 hover:bg-neutral-50 hover:text-neutral-900'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                    isSelected ? 'bg-neutral-800 text-neutral-200' : 'bg-neutral-100 text-neutral-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
