/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { RotateCcw, Check } from 'lucide-react';
import { SearchFilters } from '../types/resource';
import { ThemeId, THEMES } from '../types/theme';

interface FilterBarProps {
  filters: SearchFilters;
  onUpdateFilter: (partial: Partial<SearchFilters>) => void;
  onResetFilters: () => void;
  theme?: ThemeId;
}

const QUALITY_OPTIONS = ['Any', 'HD', 'Full HD', '4K'];

const LICENSE_OPTIONS = [
  'Free to use',
  'Commercial allowed',
  'Public Domain / CC0',
  'Attribution required'
];

const FORMAT_OPTIONS = [
  { label: 'All Formats', value: 'all' },
  { label: 'JPEG / PNG', value: 'png' },
  { label: 'WEBP', value: 'webp' },
  { label: 'MP4 Video', value: 'mp4' },
  { label: 'GIF Animation', value: 'gif' },
  { label: 'MP3 / WAV Audio', value: 'mp3' },
  { label: 'PDF Document', value: 'pdf' },
  { label: 'GeoJSON / GIS', value: 'geojson' },
  { label: 'CSV / Data', value: 'csv' }
];

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onUpdateFilter,
  onResetFilters,
  theme = 'studio-light'
}) => {
  const themeDef = THEMES[theme] || THEMES['studio-light'];
  const isDark = themeDef.isDark;

  const toggleLicense = (lic: string) => {
    const current = filters.license || [];
    if (current.includes(lic)) {
      onUpdateFilter({ license: current.filter((item) => item !== lic) });
    } else {
      onUpdateFilter({ license: [...current, lic] });
    }
  };

  return (
    <div className={`w-full border-b px-4 py-4 sm:px-6 lg:px-8 transition-colors ${
      isDark ? 'border-neutral-800 bg-neutral-900/60' : 'border-neutral-200 bg-neutral-50/70'
    }`}>
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {/* Quality */}
          <div>
            <label className={`text-[11px] font-bold uppercase tracking-wider mb-1.5 block ${themeDef.mutedTextClass}`}>
              Resolution &amp; Quality
            </label>
            <div className="flex flex-wrap gap-1.5">
              {QUALITY_OPTIONS.map((q) => {
                const isActive = (filters.quality || 'Any') === q;
                return (
                  <button
                    key={q}
                    type="button"
                    onClick={() => onUpdateFilter({ quality: q })}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                      isActive
                        ? (isDark ? 'bg-white text-neutral-950 font-bold' : 'bg-neutral-900 text-white font-semibold')
                        : (isDark ? 'bg-neutral-800/80 border border-neutral-700/80 text-neutral-300 hover:bg-neutral-700' : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100')
                    }`}
                  >
                    {q}
                  </button>
                );
              })}
            </div>
          </div>

          {/* License */}
          <div>
            <label className={`text-[11px] font-bold uppercase tracking-wider mb-1.5 block ${themeDef.mutedTextClass}`}>
              Usage Rights &amp; License
            </label>
            <div className="flex flex-wrap gap-1.5">
              {LICENSE_OPTIONS.map((lic) => {
                const active = (filters.license || []).includes(lic);
                return (
                  <button
                    key={lic}
                    type="button"
                    onClick={() => toggleLicense(lic)}
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                      active
                        ? (isDark ? 'bg-emerald-600 text-white font-semibold' : 'bg-emerald-800 text-white')
                        : (isDark ? 'bg-neutral-800/80 border border-neutral-700/80 text-neutral-300 hover:bg-neutral-700' : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100')
                    }`}
                  >
                    {active && <Check className="h-3 w-3" />}
                    <span>{lic}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Format */}
          <div>
            <label className={`text-[11px] font-bold uppercase tracking-wider mb-1.5 block ${themeDef.mutedTextClass}`}>
              File Format
            </label>
            <select
              value={filters.format || 'all'}
              onChange={(e) => onUpdateFilter({ format: e.target.value })}
              className={`w-full rounded-lg border px-2.5 py-1.5 text-xs focus:outline-none transition-colors cursor-pointer ${
                isDark 
                  ? 'border-neutral-700 bg-neutral-800 text-neutral-100 focus:border-neutral-400' 
                  : 'border-neutral-200 bg-white text-neutral-800 focus:border-neutral-900'
              }`}
            >
              {FORMAT_OPTIONS.map((fmt) => (
                <option key={fmt.value} value={fmt.value}>
                  {fmt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Display Quantity (Items per Page) */}
          <div>
            <label className={`text-[11px] font-bold uppercase tracking-wider mb-1.5 block ${themeDef.mutedTextClass}`}>
              Display at a Time
            </label>
            <div className="flex flex-wrap gap-1">
              {[12, 24, 36, 48].map((num) => {
                const isActive = (filters.pageSize || 36) === num;
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => onUpdateFilter({ pageSize: num, page: 1 })}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                      isActive
                        ? (isDark ? 'bg-indigo-500 text-white font-semibold' : 'bg-indigo-600 text-white shadow-xs font-semibold')
                        : (isDark ? 'bg-neutral-800/80 border border-neutral-700/80 text-neutral-300 hover:bg-neutral-700' : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100')
                    }`}
                  >
                    {num} items
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sort By & Reset */}
          <div>
            <label className={`text-[11px] font-bold uppercase tracking-wider mb-1.5 block ${themeDef.mutedTextClass}`}>
              Sort By
            </label>
            <div className="flex items-center gap-2">
              <select
                value={filters.sortBy || 'relevance'}
                onChange={(e) => onUpdateFilter({ sortBy: e.target.value as any })}
                className={`w-full rounded-lg border px-2.5 py-1.5 text-xs focus:outline-none transition-colors cursor-pointer ${
                  isDark 
                    ? 'border-neutral-700 bg-neutral-800 text-neutral-100 focus:border-neutral-400' 
                    : 'border-neutral-200 bg-white text-neutral-800 focus:border-neutral-900'
                }`}
              >
                <option value="relevance">Best Match</option>
                <option value="quality">Highest Quality Score</option>
                <option value="newest">Newest Additions</option>
              </select>

              <button
                type="button"
                onClick={onResetFilters}
                className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors shrink-0 cursor-pointer ${
                  isDark 
                    ? 'border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white' 
                    : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                }`}
                title="Reset all filters"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
