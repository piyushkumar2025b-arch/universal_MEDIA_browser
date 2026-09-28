/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Search, X, SlidersHorizontal, CornerDownLeft } from 'lucide-react';
import { ResourceCategory } from '../types/resource';
import { ThemeId, THEMES } from '../types/theme';

interface PersonalSearchProps {
  query: string;
  onCommitSearch: (query: string) => void;
  selectedCategory: ResourceCategory;
  onCategoryChange: (cat: ResourceCategory, queryToSearch?: string) => void;
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
  onCommitSearch,
  selectedCategory,
  onCategoryChange,
  onToggleFilters,
  isFilterOpen = false,
  theme = 'studio-light'
}) => {
  const themeDef = THEMES[theme] || THEMES['studio-light'];
  const isDark = themeDef.isDark;

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
    // If user typed something new and then clicked category, commit with current input
    onCategoryChange(catId, inputValue.trim());
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
