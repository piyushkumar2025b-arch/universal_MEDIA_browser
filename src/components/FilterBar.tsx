import React from 'react';
import { RotateCcw, Check } from 'lucide-react';
import { SearchFilters } from '../types/resource';

interface FilterBarProps {
  filters: SearchFilters;
  onUpdateFilter: (partial: Partial<SearchFilters>) => void;
  onResetFilters: () => void;
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
  onResetFilters
}) => {
  const toggleLicense = (lic: string) => {
    const current = filters.license || [];
    if (current.includes(lic)) {
      onUpdateFilter({ license: current.filter((item) => item !== lic) });
    } else {
      onUpdateFilter({ license: [...current, lic] });
    }
  };

  return (
    <div className="w-full border-b border-neutral-200 bg-neutral-50/60 px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {/* Quality */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5 block">
              Resolution &amp; Quality
            </label>
            <div className="flex flex-wrap gap-1.5">
              {QUALITY_OPTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => onUpdateFilter({ quality: q })}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                    filters.quality === q
                      ? 'bg-neutral-900 text-white'
                      : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* License */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5 block">
              Usage Rights &amp; License
            </label>
            <div className="flex flex-wrap gap-1.5">
              {LICENSE_OPTIONS.map((lic) => {
                const active = filters.license.includes(lic);
                return (
                  <button
                    key={lic}
                    onClick={() => toggleLicense(lic)}
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                      active
                        ? 'bg-emerald-800 text-white'
                        : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100'
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
            <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5 block">
              File Format
            </label>
            <select
              value={filters.format}
              onChange={(e) => onUpdateFilter({ format: e.target.value })}
              className="w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-neutral-800 focus:border-neutral-900 focus:outline-none"
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
            <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5 block">
              Display at a Time
            </label>
            <div className="flex flex-wrap gap-1">
              {[12, 24, 48, 96].map((num) => (
                <button
                  key={num}
                  onClick={() => onUpdateFilter({ pageSize: num, page: 1 })}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                    (filters.pageSize || 24) === num
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  {num} items
                </button>
              ))}
            </div>
          </div>

          {/* Sort By & Reset */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5 block">
              Sort By
            </label>
            <div className="flex items-center gap-2">
              <select
                value={filters.sortBy}
                onChange={(e) => onUpdateFilter({ sortBy: e.target.value as any })}
                className="w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-neutral-800 focus:border-neutral-900 focus:outline-none"
              >
                <option value="relevance">Best Match</option>
                <option value="quality">Highest Quality Score</option>
                <option value="newest">Newest Additions</option>
              </select>

              <button
                onClick={onResetFilters}
                className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 shrink-0"
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
