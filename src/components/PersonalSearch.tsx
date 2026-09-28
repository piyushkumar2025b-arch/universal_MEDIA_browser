/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { ResourceCategory } from '../types/resource';
import { ThemeId, THEMES } from '../types/theme';

interface PersonalSearchProps {
  query: string;
  onQueryChange: (q: string) => void;
  selectedCategory: ResourceCategory;
  onCategoryChange: (cat: ResourceCategory) => void;
  onToggleFilters?: () => void;
  isFilterOpen?: boolean;
  theme?: ThemeId;
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
  onQueryChange,
  selectedCategory,
  onCategoryChange,
  onToggleFilters,
  isFilterOpen = false,
  theme = 'studio-light'
}) => {
  const themeDef = THEMES[theme] || THEMES['studio-light'];
  const isDark = themeDef.isDark;

  return (
    <div className="w-full pt-8 pb-4">
      {/* Clean, expansive search bar without heavy boxes */}
      <div className={`relative flex items-center border-b transition-colors pb-2 ${
        isDark ? 'border-neutral-800 focus-within:border-neutral-200' : 'border-neutral-200 focus-within:border-neutral-900'
      }`}>
        <Search className={`h-5 w-5 shrink-0 mr-3 ${themeDef.mutedTextClass}`} />
        
        <input
          id="personal-search-input"
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search archives, photography, cinema, open manuscripts, sound..."
          className={`w-full bg-transparent text-lg sm:text-xl font-normal focus:outline-none ${themeDef.textClass} placeholder:${themeDef.mutedTextClass}`}
        />

        {query && (
          <button
            onClick={() => onQueryChange('')}
            className={`p-1 transition-colors cursor-pointer mr-2 ${themeDef.mutedTextClass} hover:${themeDef.textClass}`}
            title="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {onToggleFilters && (
          <button
            onClick={onToggleFilters}
            className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded transition-colors cursor-pointer shrink-0 ${
              isFilterOpen 
                ? (isDark ? 'text-white font-semibold' : 'text-neutral-900 font-semibold') 
                : `${themeDef.mutedTextClass} hover:${themeDef.textClass}`
            }`}
            title="Toggle fine filters"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Refine</span>
          </button>
        )}
      </div>

      {/* Unboxed, horizontal category navigation */}
      <div className="flex items-center gap-6 overflow-x-auto no-scrollbar pt-4 pb-1 text-xs whitespace-nowrap">
        {PRIMARY_CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.id)}
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
