/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Heart, 
  Music, 
  Loader2,
  FileText,
  Code2,
  Database,
  BookOpen,
  Newspaper,
  Compass
} from 'lucide-react';
import { ResourceItem } from '../types/resource';
import { ReliableMediaImage } from './ReliableMediaImage';
import { ThemeId, THEMES } from '../types/theme';
import { isRealImage } from '../utils/contentPhotos';

interface ResourceCardProps {
  resource: ResourceItem;
  isSelected?: boolean;
  isFavorite: boolean;
  priority?: boolean;
  onToggleSelect?: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onOpenPreview: (resource: ResourceItem) => void;
  onStartDownload?: (resource: ResourceItem) => void;
  theme?: ThemeId;
}

export const ResourceCard: React.FC<ResourceCardProps> = ({
  resource,
  isFavorite,
  priority = false,
  onToggleFavorite,
  onOpenPreview,
  theme = 'studio-light'
}) => {
  const themeDef = THEMES[theme] || THEMES['studio-light'];
  const isDark = themeDef.isDark;

  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isBufferingAudio, setIsBufferingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const toggleAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rawUrl = resource.attributes?.audioStreamUrl || resource.previewUrl || resource.url;
    if (!rawUrl) {
      onOpenPreview(resource);
      return;
    }

    if (!audioRef.current) {
      const audio = new Audio(rawUrl);
      audio.preload = 'auto';
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlayingAudio(false);
        setIsBufferingAudio(false);
      };

      audio.onerror = () => {
        setIsPlayingAudio(false);
        setIsBufferingAudio(false);
      };

      audio.onwaiting = () => setIsBufferingAudio(true);
      audio.onplaying = () => setIsBufferingAudio(false);
      audio.oncanplay = () => setIsBufferingAudio(false);
    }

    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
      setIsBufferingAudio(false);
    } else {
      setIsBufferingAudio(true);
      audioRef.current.play().then(() => {
        setIsPlayingAudio(true);
        setIsBufferingAudio(false);
      }).catch(() => {
        setIsPlayingAudio(false);
        setIsBufferingAudio(false);
      });
    }
  };

  const providerName = resource.source?.providerName || 'Open Archive';

  // Strict check: only real, verified image URLs should render as photos
  const realImgUrl = isRealImage(resource.thumbnailUrl)
    ? resource.thumbnailUrl
    : (resource.category === 'images' || resource.category === 'art' || resource.category === 'nasa') && isRealImage(resource.previewUrl)
      ? resource.previewUrl
      : null;

  const isPaper = resource.category === 'papers';
  const isCode = resource.category === 'code';
  const isDataset = resource.category === 'datasets' || resource.category === 'finance';
  const isAudio = resource.category === 'music' || resource.category === 'audio';
  const isMap = resource.category === 'maps';

  return (
    <article
      id={`resource-card-${resource.id}`}
      onClick={() => onOpenPreview(resource)}
      className="group relative flex flex-col cursor-pointer transition-all duration-200"
    >
      {/* Media Visual Container */}
      <div className={`relative w-full overflow-hidden rounded-xl aspect-[4/3] ${themeDef.cardBgClass}`}>
        {/* 1. AUDIO / MUSIC PLAYER */}
        {isAudio ? (
          <div className="relative h-full w-full bg-neutral-900 text-white flex flex-col justify-between p-4">
            {realImgUrl && (
              <img
                src={realImgUrl}
                alt={resource.title}
                className="absolute inset-0 h-full w-full object-cover opacity-40 blur-xs scale-105"
                referrerPolicy="no-referrer"
              />
            )}
            <div className="relative z-10 flex items-center justify-between text-xs text-neutral-300">
              <span className="font-medium truncate">{resource.attributes?.genre || 'Audio'}</span>
              {resource.attributes?.duration && <span>{resource.attributes.duration}</span>}
            </div>
            <div className="relative z-10 flex items-center justify-center">
              <button
                type="button"
                onClick={toggleAudio}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-neutral-900 shadow-md transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                title={isPlayingAudio ? 'Pause' : 'Play'}
              >
                {isBufferingAudio ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : isPlayingAudio ? (
                  <Pause className="h-5 w-5 fill-current" />
                ) : (
                  <Play className="h-5 w-5 ml-0.5 fill-current" />
                )}
              </button>
            </div>
            <div className="relative z-10 text-[11px] text-neutral-400 truncate">
              {resource.attributes?.album || providerName}
            </div>
          </div>
        ) : isPaper ? (
          /* 2. AUTHENTIC SCHOLARLY RESEARCH PAPER CARD (Never fake photos) */
          <div className={`relative h-full w-full p-4 sm:p-5 flex flex-col justify-between rounded-xl select-none border transition-colors ${
            isDark 
              ? 'bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-950 border-neutral-800' 
              : 'bg-gradient-to-br from-neutral-50 via-white to-neutral-100/80 border-neutral-200/80 shadow-xs'
          }`}>
            {/* Academic Journal / Provider Badge */}
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                <FileText className="h-3 w-3 shrink-0" />
                <span className="truncate max-w-[140px]">{resource.attributes?.journal || providerName}</span>
              </span>
              <span className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400">
                {resource.attributes?.year || (resource.attributes?.publishedAt ? new Date(resource.attributes.publishedAt).getFullYear() : 'PDF')}
              </span>
            </div>

            {/* Paper Title & Authors */}
            <div className="my-auto space-y-1.5 py-1">
              <h4 className={`font-serif font-medium text-xs sm:text-sm leading-snug line-clamp-3 ${
                isDark ? 'text-neutral-100' : 'text-neutral-900'
              }`}>
                {resource.title}
              </h4>
              {resource.creator?.name && (
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                  {resource.creator.name}
                </p>
              )}
            </div>

            {/* Document Metadata Footer */}
            <div className="flex items-center justify-between pt-1.5 border-t border-neutral-200/60 dark:border-neutral-800 text-[10px] text-neutral-500 dark:text-neutral-400">
              <span className="font-mono truncate max-w-[150px]">
                {resource.attributes?.doi ? `DOI: ${resource.attributes.doi}` : 'Peer-Reviewed Manuscript'}
              </span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded text-[9px]">
                OPEN ACCESS
              </span>
            </div>
          </div>
        ) : isCode ? (
          /* 3. AUTHENTIC TERMINAL / CODE REPO CARD (Never fake photos) */
          <div className="relative h-full w-full bg-[#0d1117] text-neutral-200 p-4 sm:p-5 flex flex-col justify-between border border-neutral-800 rounded-xl font-mono select-none">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
              </div>
              <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
                {resource.attributes?.language || providerName}
              </span>
            </div>

            <div className="my-auto space-y-1 py-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white truncate">
                <Code2 className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                <span className="truncate">{resource.title}</span>
              </div>
              <p className="text-[11px] text-neutral-400 line-clamp-2 font-sans">
                {resource.description || 'Open source software codebase and repository assets.'}
              </p>
            </div>

            <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-1 border-t border-neutral-800">
              <span className="truncate">{providerName}</span>
              <span className="text-blue-400 font-semibold">{resource.license?.type || 'Open Source'}</span>
            </div>
          </div>
        ) : isDataset ? (
          /* 4. AUTHENTIC DATASET CARD */
          <div className={`relative h-full w-full p-4 sm:p-5 flex flex-col justify-between rounded-xl select-none border ${
            isDark ? 'bg-neutral-900 border-neutral-800 text-neutral-100' : 'bg-neutral-50/80 border-neutral-200 text-neutral-900'
          }`}>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                <Database className="h-3 w-3 shrink-0" />
                <span>Dataset</span>
              </span>
              <span className="text-[10px] font-mono text-neutral-500 uppercase">
                {resource.attributes?.format || 'DATA'}
              </span>
            </div>
            <div className="my-auto py-1">
              <h4 className="font-semibold text-xs sm:text-sm line-clamp-2">
                {resource.title}
              </h4>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-2 mt-1">
                {resource.description || 'Structured data table and telemetry records.'}
              </p>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-neutral-200 dark:border-neutral-800 text-[10px] text-neutral-500">
              <span className="truncate">{providerName}</span>
              <span className="font-mono">Open Data</span>
            </div>
          </div>
        ) : realImgUrl ? (
          /* 5. GENUINE IMAGE / VIDEO / FINE ART PHOTO */
          <>
            <ReliableMediaImage
              src={realImgUrl}
              alt={resource.title}
              providerName={providerName}
              category={resource.category}
              priority={priority}
              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            />

            {/* Video overlay indicator */}
            {resource.category === 'videos' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-xs transition-transform group-hover:scale-110">
                  <Play className="h-4 w-4 ml-0.5 fill-current" />
                </div>
              </div>
            )}
          </>
        ) : (
          /* 6. AUTHENTIC DOCUMENT / EDITORIAL FALLBACK (Never fake photos) */
          <div className={`relative h-full w-full p-4 flex flex-col justify-between rounded-xl select-none border ${
            isDark ? 'bg-neutral-900 border-neutral-800 text-neutral-200' : 'bg-neutral-50 border-neutral-200 text-neutral-900'
          }`}>
            <div className="flex items-center justify-between text-xs">
              <span className="uppercase text-[10px] font-semibold tracking-wider px-2 py-0.5 rounded bg-neutral-200/70 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                {resource.category}
              </span>
              <span className="truncate max-w-[130px] text-[10px] text-neutral-500">{providerName}</span>
            </div>
            <div className="my-auto py-1">
              <h4 className="font-medium text-xs sm:text-sm line-clamp-2">
                {resource.title}
              </h4>
              {resource.description && (
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-2 mt-1">
                  {resource.description}
                </p>
              )}
            </div>
            <div className="flex items-center justify-between text-[10px] text-neutral-500 pt-1 border-t border-neutral-200 dark:border-neutral-800">
              <span>{resource.license?.type || 'Open Archive'}</span>
              <span className="capitalize">{resource.category}</span>
            </div>
          </div>
        )}

        {/* Quiet top-right favorite heart button (visible on hover or if favorited) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(resource.id);
          }}
          className={`absolute top-2.5 right-2.5 z-10 flex h-7 w-7 items-center justify-center rounded-full backdrop-blur-md transition-all cursor-pointer ${
            isFavorite
              ? 'bg-white text-pink-600 shadow-sm opacity-100'
              : 'bg-black/30 text-white hover:bg-black/50 opacity-0 group-hover:opacity-100'
          }`}
          title={isFavorite ? 'Saved to library' : 'Save to library'}
        >
          <Heart className={`h-3.5 w-3.5 ${isFavorite ? 'fill-current text-pink-600' : ''}`} />
        </button>

        {/* Quiet duration badge for video if present */}
        {resource.attributes?.duration && resource.category === 'videos' && (
          <span className="absolute bottom-2 right-2 text-[10px] font-mono text-white/90 bg-black/60 backdrop-blur-xs px-1.5 py-0.5 rounded">
            {resource.attributes.duration}
          </span>
        )}
      </div>

      {/* Clean Unboxed Editorial Typography */}
      <div className="pt-2.5 pb-1">
        <h3 className={`text-sm font-medium leading-snug line-clamp-1 transition-colors ${themeDef.textClass} group-hover:opacity-80`}>
          {resource.title}
        </h3>

        <div className={`mt-1 flex items-center gap-1.5 text-xs truncate ${themeDef.mutedTextClass}`}>
          <span className="truncate opacity-90">{providerName}</span>
          <span aria-hidden="true">·</span>
          <span className="capitalize">{resource.category}</span>
          {resource.creator?.name && (
            <>
              <span aria-hidden="true">·</span>
              <span className="truncate">{resource.creator.name}</span>
            </>
          )}
        </div>
      </div>
    </article>
  );
};
