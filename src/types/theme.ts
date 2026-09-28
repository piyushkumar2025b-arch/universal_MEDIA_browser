/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ThemeId = 
  | 'studio-light' 
  | 'midnight-oled' 
  | 'nordic-slate' 
  | 'warm-editorial' 
  | 'obsidian-gold';

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  tagline: string;
  isDark: boolean;
  bgClass: string;
  headerBgClass: string;
  textClass: string;
  mutedTextClass: string;
  borderClass: string;
  cardBgClass: string;
  accentClass: string;
  navActiveBgClass: string;
}

export const THEMES: Record<ThemeId, ThemeDefinition> = {
  'studio-light': {
    id: 'studio-light',
    name: 'Studio Light',
    tagline: 'Clean gallery white',
    isDark: false,
    bgClass: 'bg-white',
    headerBgClass: 'bg-white/95 border-neutral-100',
    textClass: 'text-neutral-900',
    mutedTextClass: 'text-neutral-500',
    borderClass: 'border-neutral-100',
    cardBgClass: 'bg-neutral-100',
    accentClass: 'text-neutral-900',
    navActiveBgClass: 'bg-neutral-100/90 text-neutral-900'
  },
  'midnight-oled': {
    id: 'midnight-oled',
    name: 'Midnight OLED',
    tagline: 'Deep black cinema',
    isDark: true,
    bgClass: 'bg-[#050505]',
    headerBgClass: 'bg-[#050505]/95 border-neutral-800/80',
    textClass: 'text-neutral-50',
    mutedTextClass: 'text-neutral-400',
    borderClass: 'border-neutral-800/80',
    cardBgClass: 'bg-neutral-900',
    accentClass: 'text-white',
    navActiveBgClass: 'bg-neutral-800/80 text-white'
  },
  'nordic-slate': {
    id: 'nordic-slate',
    name: 'Nordic Slate',
    tagline: 'Architectural navy',
    isDark: true,
    bgClass: 'bg-[#0c1222]',
    headerBgClass: 'bg-[#0c1222]/95 border-slate-800/80',
    textClass: 'text-slate-100',
    mutedTextClass: 'text-slate-400',
    borderClass: 'border-slate-800/80',
    cardBgClass: 'bg-slate-900',
    accentClass: 'text-sky-300',
    navActiveBgClass: 'bg-slate-800/90 text-slate-100'
  },
  'warm-editorial': {
    id: 'warm-editorial',
    name: 'Warm Editorial',
    tagline: 'Parchment & linen',
    isDark: false,
    bgClass: 'bg-[#fbf9f5]',
    headerBgClass: 'bg-[#fbf9f5]/95 border-stone-200/70',
    textClass: 'text-stone-900',
    mutedTextClass: 'text-stone-500',
    borderClass: 'border-stone-200/70',
    cardBgClass: 'bg-[#f3efe8]',
    accentClass: 'text-stone-900',
    navActiveBgClass: 'bg-stone-200/80 text-stone-900'
  },
  'obsidian-gold': {
    id: 'obsidian-gold',
    name: 'Obsidian Bronze',
    tagline: 'Luxury archive',
    isDark: true,
    bgClass: 'bg-[#121214]',
    headerBgClass: 'bg-[#121214]/95 border-amber-950/40',
    textClass: 'text-neutral-100',
    mutedTextClass: 'text-neutral-400',
    borderClass: 'border-neutral-800/90',
    cardBgClass: 'bg-[#18181c]',
    accentClass: 'text-amber-400',
    navActiveBgClass: 'bg-neutral-800/80 text-amber-300'
  }
};
