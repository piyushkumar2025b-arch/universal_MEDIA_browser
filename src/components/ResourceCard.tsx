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
  Loader2
} from 'lucide-react';
import { ResourceItem } from '../types/resource';
import { ReliableMediaImage } from './ReliableMediaImage';
import { ThemeId, THEMES } from '../types/theme';

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

  return (
    <article
      id={`resource-card-${resource.id}`}
      onClick={() => onOpenPreview(resource)}
      className="group relative flex flex-col cursor-pointer transition-all duration-200"
    >
      {/* Media Visual Container (Border-free, Maximum Preference to VIEW) */}
      <div className={`relative w-full overflow-hidden rounded-xl aspect-[4/3] ${themeDef.cardBgClass}`}>
        {/* Visual Render by Category */}
        {(resource.category === 'music' || resource.category === 'audio') ? (
          <div className="relative h-full w-full bg-neutral-900 text-white flex flex-col justify-between p-4">
            {resource.thumbnailUrl && (
              <img
                src={resource.thumbnailUrl}
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
        ) : (
          <>
            <ReliableMediaImage
              src={resource.thumbnailUrl || resource.previewUrl}
              alt={resource.title}
              providerName={providerName}
              category={resource.category}
              lqip={resource.attributes?.lqip}
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
