/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Palette, ChevronDown, Check } from 'lucide-react';
import { ThemeId, THEMES } from '../types/theme';

interface PersonalHeaderProps {
  activeView: 'discover' | 'saved' | 'downloads';
  onSelectView: (view: 'discover' | 'saved' | 'downloads') => void;
  savedCount: number;
  downloadCount: number;
  viewDensity: 'spacious' | 'grid';
  onToggleDensity: () => void;
  walletAddress?: string | null;
  onOpenWallet?: () => void;
  activeTheme: ThemeId;
  onSelectTheme: (theme: ThemeId) => void;
}

export const PersonalHeader: React.FC<PersonalHeaderProps> = ({
  activeView,
  onSelectView,
  savedCount,
  downloadCount,
  viewDensity,
  onToggleDensity,
  walletAddress,
  onOpenWallet,
  activeTheme,
  onSelectTheme,
}) => {
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement | null>(null);

  // Close theme dropdown when clicked outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target as Node)) {
        setIsThemeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentThemeDef = THEMES[activeTheme] || THEMES['studio-light'];
  const isDark = currentThemeDef.isDark;

  return (
    <header className={`w-full border-b sticky top-0 z-30 transition-colors duration-200 backdrop-blur-md ${currentThemeDef.headerBgClass}`}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Personalized Studio Title */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => onSelectView('discover')}
            className="text-left group cursor-pointer"
          >
            <span className={`text-base font-semibold tracking-tight transition-colors ${currentThemeDef.textClass}`}>
              Personal Studio
            </span>
            <span className={`hidden sm:inline-block ml-3 text-xs font-normal ${currentThemeDef.mutedTextClass}`}>
              Visual Archive &amp; Explorer
            </span>
          </button>

          {/* Navigation views (unboxed clean typography) */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => onSelectView('discover')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer rounded-lg ${
                activeView === 'discover'
                  ? currentThemeDef.navActiveBgClass
                  : `${currentThemeDef.mutedTextClass} hover:${currentThemeDef.textClass}`
              }`}
            >
              Discover
            </button>

            <button
              onClick={() => onSelectView('saved')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer rounded-lg ${
                activeView === 'saved'
                  ? currentThemeDef.navActiveBgClass
                  : `${currentThemeDef.mutedTextClass} hover:${currentThemeDef.textClass}`
              }`}
            >
              <span>Saved</span>
              {savedCount > 0 && (
                <span className="text-[11px] font-mono opacity-80">
                  {savedCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onSelectView('downloads')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer rounded-lg ${
                activeView === 'downloads'
                  ? currentThemeDef.navActiveBgClass
                  : `${currentThemeDef.mutedTextClass} hover:${currentThemeDef.textClass}`
              }`}
            >
              <span>Downloads</span>
              {downloadCount > 0 && (
                <span className="text-[11px] font-mono opacity-80">
                  {downloadCount}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Right: Theme Selector, Density & Wallet */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs">
          {/* Professional Theme Picker */}
          <div className="relative" ref={themeMenuRef}>
            <button
              onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
              className={`flex items-center gap-1.5 py-1 px-2.5 rounded-lg transition-colors cursor-pointer ${
                isDark 
                  ? 'hover:bg-neutral-800 text-neutral-300' 
                  : 'hover:bg-neutral-100 text-neutral-600'
              }`}
              title="Select theme style"
            >
              <Palette className="h-3.5 w-3.5 opacity-80" />
              <span className="hidden md:inline">{currentThemeDef.name}</span>
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>

            {isThemeMenuOpen && (
              <div 
                className={`absolute right-0 mt-2 w-52 rounded-xl shadow-xl border p-1.5 z-50 text-xs animate-scale-up ${
                  isDark 
                    ? 'bg-neutral-900 border-neutral-800 text-neutral-200' 
                    : 'bg-white border-neutral-200 text-neutral-800'
                }`}
              >
                <div className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${currentThemeDef.mutedTextClass}`}>
                  Studio Themes
                </div>

                {Object.values(THEMES).map((th) => {
                  const isSelected = th.id === activeTheme;
                  return (
                    <button
                      key={th.id}
                      onClick={() => {
                        onSelectTheme(th.id);
                        setIsThemeMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-colors cursor-pointer text-left ${
                        isSelected 
                          ? (isDark ? 'bg-neutral-800 font-semibold' : 'bg-neutral-100 font-semibold')
                          : (isDark ? 'hover:bg-neutral-800/60' : 'hover:bg-neutral-50')
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span 
                          className="h-3 w-3 rounded-full border border-neutral-500/30 shrink-0" 
                          style={{
                            backgroundColor: th.id === 'studio-light' 
                              ? '#ffffff' 
                              : th.id === 'midnight-oled' 
                              ? '#000000' 
                              : th.id === 'nordic-slate' 
                              ? '#0f172a' 
                              : th.id === 'warm-editorial' 
                              ? '#fbf9f5' 
                              : '#121214'
                          }} 
                        />
                        <div>
                          <div className="leading-tight">{th.name}</div>
                          <div className={`text-[10px] opacity-70`}>{th.tagline}</div>
                        </div>
                      </div>

                      {isSelected && (
                        <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Density Switcher */}
          <button
            onClick={onToggleDensity}
            title={`Switch to ${viewDensity === 'spacious' ? 'compact grid' : 'spacious editorial'} view`}
            className={`transition-colors cursor-pointer py-1 px-2.5 rounded-lg ${
              isDark 
                ? 'hover:bg-neutral-800 text-neutral-300' 
                : 'hover:bg-neutral-100 text-neutral-600'
            }`}
          >
            {viewDensity === 'spacious' ? 'View: Spacious' : 'View: Grid'}
          </button>

          {/* Web3 / Wallet quiet indicator (if present) */}
          {onOpenWallet && (
            <button
              onClick={onOpenWallet}
              title={walletAddress ? `Connected: ${walletAddress}` : 'Connect Web3 / MetaMask'}
              className={`transition-colors cursor-pointer py-1 px-2.5 rounded-lg flex items-center gap-1.5 ${
                isDark 
                  ? 'hover:bg-neutral-800 text-neutral-300' 
                  : 'hover:bg-neutral-100 text-neutral-600'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${walletAddress ? 'bg-emerald-500' : 'bg-neutral-400'}`} />
              <span className="hidden sm:inline">
                {walletAddress ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-3)}` : 'Wallet'}
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
