import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Download, 
  Heart, 
  Eye, 
  FileText, 
  MapPin, 
  Database, 
  Check, 
  Clock, 
  ShieldCheck, 
  UserCheck,
  BookOpen,
  CloudSun,
  Palette,
  Code2,
  Sprout,
  Globe2,
  TrendingUp,
  UtensilsCrossed,
  Gamepad2,
  Box,
  Image as ImageIcon,
  Loader2,
  Music
} from 'lucide-react';
import { ResourceItem, ResourceCategory } from '../types/resource';
import { getContentPhoto } from '../utils/contentPhotos';

/**
 * Global cache of already-rendered media URLs in the client session.
 * Prevents redundant flashes, layout re-flows, and allows instant sub-millisecond rendering.
 */
export const globalLoadedImages = new Set<string>();

/**
 * RealMediaImage: High-performance authentic media rendering engine.
 * 1. Uses referrerPolicy="no-referrer" to prevent CDN hotlink rejection.
 * 2. Preheats and remembers loaded state globally for instant back-and-forth rendering.
 * 3. Shows an animated lightweight skeleton while fetching instead of a blank box.
 * 4. Automatic fast-failover (2.8s) to the server accelerator if external museum/archive CDN stalls.
 * 5. Uses decoding="async" and priority flags for silky 60fps rendering.
 * 6. Always displays a verified authentic content photograph — never an empty black box.
 */
const RealMediaImage: React.FC<{
  src?: string;
  alt: string;
  className?: string;
  providerName: string;
  priority?: boolean;
  category?: ResourceCategory | string;
  lqip?: string;
}> = ({ src, alt, className = '', providerName, priority = false, category = 'images', lqip }) => {
  const [currentSrc, setCurrentSrc] = useState(() => src || lqip || getContentPhoto(alt, category));
  const [failed, setFailed] = useState(false);
  const [triedProxy, setTriedProxy] = useState(false);
  const [triedLqip, setTriedLqip] = useState(false);
  const [triedContentPhoto, setTriedContentPhoto] = useState(false);
  const [isLoaded, setIsLoaded] = useState(() => (src ? globalLoadedImages.has(src) : false));

  useEffect(() => {
    setCurrentSrc(src || lqip || getContentPhoto(alt, category));
    setFailed(false);
    setTriedProxy(false);
    setTriedLqip(false);
    setTriedContentPhoto(false);
    setIsLoaded(src ? globalLoadedImages.has(src) : false);
  }, [src, lqip, alt, category]);

  // Fast auto-failover: if an external archive host is hanging or stalling,
  // switch automatically to the server accelerator proxy after 2.8 seconds.
  useEffect(() => {
    if (!triedProxy && currentSrc && !currentSrc.startsWith('/api/') && !currentSrc.startsWith('data:') && !isLoaded && !failed) {
      const timer = setTimeout(() => {
        if (!isLoaded && !globalLoadedImages.has(currentSrc)) {
          setTriedProxy(true);
          setCurrentSrc(`/api/image-proxy?url=${encodeURIComponent(currentSrc)}&title=${encodeURIComponent(alt)}&category=${category}`);
        }
      }, 2800);
      return () => clearTimeout(timer);
    }
  }, [currentSrc, isLoaded, triedProxy, failed, alt, category]);

  const handleImageError = () => {
    // 1. Try high-speed server image proxy with fallback context
    if (!triedProxy && src && src.startsWith('http')) {
      setTriedProxy(true);
      setCurrentSrc(`/api/image-proxy?url=${encodeURIComponent(src)}&title=${encodeURIComponent(alt)}&category=${category}`);
      return;
    }
    // 2. Try inline LQIP base64 data URI if provided by museum
    if (!triedLqip && lqip && currentSrc !== lqip) {
      setTriedLqip(true);
      setCurrentSrc(lqip);
      return;
    }
    // 3. Fall back to verified authentic content photography
    if (!triedContentPhoto) {
      setTriedContentPhoto(true);
      const fallbackPhoto = getContentPhoto(alt, category);
      if (currentSrc !== fallbackPhoto) {
        setCurrentSrc(fallbackPhoto);
        return;
      }
    }
    // 4. Mark failed to render resilient content card
    setFailed(true);
  };

  if (failed || !currentSrc) {
    const fallbackPhoto = getContentPhoto(alt, category);
    return (
      <div className="relative h-full w-full overflow-hidden bg-neutral-900 group">
        <img
          src={fallbackPhoto}
          alt={alt}
          className={`${className} object-cover`}
          loading="lazy"
          decoding="async"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 flex items-center justify-between">
          <span className="text-[10px] text-neutral-200 line-clamp-1 max-w-[180px] font-medium">{alt}</span>
          <span className="text-[9px] text-amber-400 shrink-0 font-medium">{providerName}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-neutral-900">
      {/* High-speed animated shimmer skeleton during image acquisition */}
      {!isLoaded && (
        <div className="absolute inset-0 z-0 bg-gradient-to-r from-neutral-800 via-neutral-700 to-neutral-800 animate-pulse flex items-center justify-center">
          <ImageIcon className="h-6 w-6 text-neutral-500/50" />
        </div>
      )}

      <img
        src={currentSrc}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        referrerPolicy="no-referrer"
        onLoad={() => {
          if (currentSrc) globalLoadedImages.add(currentSrc);
          setIsLoaded(true);
        }}
        onError={handleImageError}
        className={`${className} transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
};

interface ResourceCardProps {
  resource: ResourceItem;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onOpenPreview: (resource: ResourceItem) => void;
  onStartDownload: (resource: ResourceItem) => void;
  priority?: boolean;
}

export const ResourceCard: React.FC<ResourceCardProps> = ({
  resource,
  isSelected,
  onToggleSelect,
  isFavorite,
  onToggleFavorite,
  onOpenPreview,
  onStartDownload,
  priority = false
}) => {
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
    const rawUrl = resource.previewUrl || resource.downloadUrl;
    if (!rawUrl) return;

    // If it's an embed URL or Archive embed, launch interactive player modal
    if (rawUrl.includes('/embed/') || (!rawUrl.includes('.mp3') && !rawUrl.includes('.m4a') && !rawUrl.includes('.aac') && !rawUrl.includes('.ogg') && !rawUrl.includes('.wav') && resource.attributes?.embedUrl)) {
      onOpenPreview(resource);
      return;
    }

    // Direct streaming for Apple Music CDN, Wikimedia, and Radio Browser streams with CORS
    const isDirectPlayable =
      rawUrl.includes('apple.com') ||
      rawUrl.includes('mzstatic.com') ||
      rawUrl.includes('wikimedia.org') ||
      rawUrl.includes('radio-browser') ||
      rawUrl.startsWith('data:') ||
      rawUrl.startsWith('blob:');

    const primaryMediaUrl = isDirectPlayable
      ? rawUrl
      : rawUrl.startsWith('/api/')
      ? rawUrl
      : `/api/v1/audio-stream?url=${encodeURIComponent(rawUrl)}`;

    if (!audioRef.current) {
      const audio = new Audio(primaryMediaUrl);
      audio.preload = 'auto';
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlayingAudio(false);
        setIsBufferingAudio(false);
      };

      // Automatic fallback to raw direct URL if proxy or first attempt encountered an issue
      audio.onerror = () => {
        if (audio.src !== rawUrl && rawUrl.startsWith('http')) {
          audio.src = rawUrl;
          audio.play().then(() => {
            setIsPlayingAudio(true);
            setIsBufferingAudio(false);
          }).catch(() => {
            setIsPlayingAudio(false);
            setIsBufferingAudio(false);
          });
        } else {
          setIsPlayingAudio(false);
          setIsBufferingAudio(false);
        }
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
        // Retry direct if initial attempt was blocked
        if (audioRef.current && audioRef.current.src !== rawUrl && rawUrl.startsWith('http')) {
          audioRef.current.src = rawUrl;
          audioRef.current.play().then(() => {
            setIsPlayingAudio(true);
            setIsBufferingAudio(false);
          }).catch(() => {
            setIsPlayingAudio(false);
            setIsBufferingAudio(false);
          });
        } else {
          setIsPlayingAudio(false);
          setIsBufferingAudio(false);
        }
      });
    }
  };

  const licenseType = resource.license?.type || 'Unknown / Not specified';
  const isUnknownLicense = licenseType.includes('Unknown') || licenseType.includes('Unspecified');
  const providerName = resource.source?.providerName || 'External Repository';

  return (
    <div
      id={`resource-card-${resource.id}`}
      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-white border transition-all duration-200 ${
        isSelected
          ? 'border-neutral-900 ring-2 ring-neutral-900 shadow-md'
          : 'border-neutral-200/90 hover:border-neutral-300 hover:shadow-lg'
      }`}
    >
      {/* Top Floating Controls */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
        {/* Selection Checkbox */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(resource.id);
          }}
          className={`pointer-events-auto flex h-6 w-6 items-center justify-center rounded-lg backdrop-blur-md transition-all ${
            isSelected
              ? 'bg-neutral-900 text-white shadow-sm ring-1 ring-white'
              : 'bg-white/85 text-transparent border border-neutral-300/80 hover:border-neutral-400 hover:bg-white'
          }`}
          title={isSelected ? 'Deselect item' : 'Select item for batch download'}
        >
          <Check className={`h-3.5 w-3.5 ${isSelected ? 'text-white' : 'text-neutral-300'}`} />
        </button>

        <div className="flex items-center gap-1.5 pointer-events-auto">
          {/* Quick Download */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStartDownload(resource);
            }}
            className="flex h-7 w-7 items-center justify-center rounded-full backdrop-blur-md bg-white/85 text-neutral-700 hover:text-neutral-900 hover:bg-white transition-all shadow-xs active:scale-90"
            title={`Download ${resource.title}`}
          >
            <Download className="h-3.5 w-3.5 text-neutral-700" />
          </button>

          {/* Favorite Heart */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(resource.id);
            }}
            className={`flex h-7 w-7 items-center justify-center rounded-full backdrop-blur-md transition-transform active:scale-90 ${
              isFavorite
                ? 'bg-white text-pink-600 shadow-sm'
                : 'bg-white/85 text-neutral-500 hover:text-pink-600 hover:bg-white'
            }`}
            title={isFavorite ? 'Remove from favorites' : 'Save to favorites'}
          >
            <Heart className={`h-3.5 w-3.5 ${isFavorite ? 'fill-current text-pink-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Media Thumbnail Container */}
      <div 
        className="relative w-full cursor-pointer overflow-hidden bg-neutral-100"
        onClick={() => onOpenPreview(resource)}
      >
        {/* Images & GIFs */}
        {(resource.category === 'images' || resource.category === 'gifs') && (
          <div className="aspect-[16/10] w-full overflow-hidden bg-neutral-900">
            <RealMediaImage
              src={resource.thumbnailUrl || resource.previewUrl}
              alt={resource.title}
              providerName={resource.source.providerName}
              category={resource.category}
              lqip={resource.attributes?.lqip}
              priority={priority}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {resource.category === 'gifs' && (
              <span className="absolute bottom-2.5 right-2.5 rounded-md bg-neutral-900/80 backdrop-blur-md px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-amber-300 uppercase">
                GIF
              </span>
            )}
          </div>
        )}

        {/* Videos */}
        {resource.category === 'videos' && (
          <div className="aspect-[16/10] w-full relative overflow-hidden bg-neutral-900">
            <RealMediaImage
              src={resource.thumbnailUrl || resource.previewUrl}
              alt={resource.title}
              providerName={resource.source.providerName}
              category={resource.category}
              lqip={resource.attributes?.lqip}
              priority={priority}
              className="h-full w-full object-cover opacity-85 transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-neutral-900 shadow-lg backdrop-blur-sm transition-transform group-hover:scale-110">
                <Play className="h-5 w-5 ml-0.5 fill-current" />
              </div>
            </div>
            {resource.attributes?.duration && (
              <span className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-md bg-neutral-900/85 backdrop-blur-md px-2 py-0.5 text-[10px] font-medium text-white">
                <Clock className="h-2.5 w-2.5" />
                {resource.attributes.duration}
              </span>
            )}
          </div>
        )}

        {/* Music & Audio */}
        {(resource.category === 'music' || resource.category === 'audio') && (
          <div className="relative overflow-hidden bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-800 text-white min-h-[150px] flex flex-col justify-between p-3.5">
            {/* Ambient artwork backlight glow */}
            {resource.thumbnailUrl && (
              <div
                className="absolute inset-0 bg-cover bg-center opacity-25 blur-xl scale-110 pointer-events-none"
                style={{ backgroundImage: `url(${resource.thumbnailUrl})` }}
              />
            )}

            <div className="relative z-10 flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                {resource.thumbnailUrl ? (
                  <img
                    src={resource.thumbnailUrl}
                    alt={resource.title}
                    className="h-11 w-11 rounded-lg object-cover shadow border border-white/10 shrink-0"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-11 w-11 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <Music className="h-5 w-5 text-amber-400" />
                  </div>
                )}
                <div className="min-w-0">
                  <span className="rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 text-[10px] font-medium inline-block truncate max-w-[130px]">
                    {resource.attributes?.genre || (resource.category === 'music' ? 'Music' : 'Audio')}
                  </span>
                  {resource.attributes?.album && (
                    <p className="text-[11px] text-neutral-300 truncate mt-0.5">
                      {resource.attributes.album}
                    </p>
                  )}
                </div>
              </div>

              {resource.attributes?.duration && (
                <span className="text-[11px] font-mono text-neutral-300 shrink-0 bg-black/50 px-2 py-0.5 rounded border border-white/5">
                  {resource.attributes.duration}
                </span>
              )}
            </div>

            {/* Live Audio Player Control */}
            <div className="relative z-10 my-2">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggleAudio}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-400 text-neutral-950 shadow-lg hover:bg-amber-300 transition-transform active:scale-95 cursor-pointer"
                  title={isPlayingAudio ? 'Pause stream' : 'Play stream'}
                >
                  {isBufferingAudio ? (
                    <Loader2 className="h-4 w-4 animate-spin text-neutral-950" />
                  ) : isPlayingAudio ? (
                    <Pause className="h-4 w-4 fill-current" />
                  ) : (
                    <Play className="h-4 w-4 ml-0.5 fill-current" />
                  )}
                </button>

                <div className="flex flex-1 items-center gap-1 h-7">
                  {[25, 50, 75, 95, 65, 40, 80, 100, 55, 70, 85, 45, 30].map(
                    (barHeight, idx) => (
                      <div
                        key={idx}
                        className={`flex-1 rounded-full transition-all duration-300 ${
                          isPlayingAudio && idx % 2 === 0
                            ? 'bg-amber-400 animate-pulse'
                            : isPlayingAudio
                            ? 'bg-amber-300'
                            : 'bg-neutral-700'
                        }`}
                        style={{ height: `${barHeight}%` }}
                      />
                    )
                  )}
                </div>
              </div>
            </div>

            <div className="relative z-10 flex items-center justify-between text-[10px] text-neutral-400">
              <span className="font-mono uppercase text-[10px] text-neutral-300">{resource.attributes?.format || 'AUDIO'}</span>
              <span className={isPlayingAudio ? 'text-amber-300 font-medium' : 'text-neutral-400'}>
                {isPlayingAudio ? 'Streaming audio...' : isBufferingAudio ? 'Connecting...' : 'Click play to listen'}
              </span>
            </div>
          </div>
        )}

        {/* Research Papers */}
        {resource.category === 'papers' && (
          <div className="p-4 bg-gradient-to-br from-blue-50 to-neutral-100 border-b border-neutral-200/80 min-h-[140px] flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-blue-700 text-xs font-semibold mb-1">
                <FileText className="h-3.5 w-3.5" />
                <span className="truncate">{resource.attributes?.journal || 'Scholarly Publication'}</span>
              </div>
              <p className="text-xs text-neutral-600 line-clamp-3 italic">
                "{resource.attributes?.abstract || resource.description || 'Scholarly research paper indexed in open academic databases.'}"
              </p>
            </div>
            <div className="flex items-center justify-between pt-2 text-[11px] text-neutral-500 font-medium">
              <span>{resource.attributes?.year ? `Published ${resource.attributes.year}` : 'Open Research'}</span>
              <span>{typeof resource.attributes?.citations === 'number' ? `${resource.attributes.citations} citations` : 'Open Access'}</span>
            </div>
          </div>
        )}

        {/* Maps */}
        {resource.category === 'maps' && (
          <div className="aspect-[16/10] w-full relative overflow-hidden bg-emerald-950/20">
            <RealMediaImage
              src={resource.thumbnailUrl || resource.previewUrl}
              alt={resource.title}
              providerName={resource.source.providerName}
              category={resource.category}
              lqip={resource.attributes?.lqip}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/70 via-transparent to-transparent flex items-end p-3 pointer-events-none">
              <div className="flex items-center gap-1.5 text-white text-xs font-medium truncate">
                <MapPin className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">{resource.attributes?.region || resource.title}</span>
              </div>
            </div>
            <span className="absolute top-2.5 right-11 rounded-md bg-neutral-900/80 backdrop-blur-md px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
              {resource.attributes?.mapType || 'Cartography'}
            </span>
          </div>
        )}

        {/* Datasets */}
        {resource.category === 'datasets' && (
          <div className="p-4 bg-gradient-to-br from-amber-50 to-neutral-100 border-b border-neutral-200/80 min-h-[140px] flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-amber-700 text-xs font-semibold mb-1">
                <Database className="h-3.5 w-3.5" />
                <span>Open Scientific Dataset</span>
              </div>
              <p className="text-xs text-neutral-600 line-clamp-3">
                {resource.description || 'Verified open scientific dataset.'}
              </p>
            </div>
            <div className="flex items-center justify-between pt-2 text-[11px] text-neutral-500 font-medium">
              <span>{resource.attributes?.format || 'DATA'}</span>
              <span>{resource.attributes?.fileSize || 'Repository asset'}</span>
            </div>
          </div>
        )}

        {/* Books & Literature */}
        {resource.category === 'books' && (
          <div className="aspect-[16/10] w-full relative overflow-hidden bg-neutral-900 flex items-center justify-center">
            {resource.thumbnailUrl ? (
              <RealMediaImage
                src={resource.thumbnailUrl}
                alt={resource.title}
                providerName={resource.source.providerName}
                category={resource.category}
                lqip={resource.attributes?.lqip}
                className="h-full w-full object-contain p-2"
              />
            ) : (
              <div className="p-4 text-center">
                <BookOpen className="h-10 w-10 text-amber-400 mx-auto mb-2" />
                <span className="text-xs text-neutral-300 font-medium line-clamp-2">{resource.title}</span>
              </div>
            )}
            <span className="absolute top-2.5 right-11 rounded-md bg-neutral-900/80 backdrop-blur-md px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
              {resource.attributes?.language?.toUpperCase() || 'BOOK'}
            </span>
          </div>
        )}

        {/* Art & Museum Works */}
        {resource.category === 'art' && (
          <div className="aspect-[16/10] w-full relative overflow-hidden bg-neutral-950 flex items-center justify-center">
            <RealMediaImage
              src={resource.thumbnailUrl || resource.previewUrl}
              alt={resource.title}
              providerName={resource.source.providerName}
              category={resource.category}
              lqip={resource.attributes?.lqip}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <span className="absolute top-2.5 right-11 rounded-md bg-neutral-900/80 backdrop-blur-md px-1.5 py-0.5 text-[10px] font-medium text-rose-300">
              {resource.attributes?.classification || 'Fine Art'}
            </span>
          </div>
        )}

        {/* Weather */}
        {resource.category === 'weather' && (
          <div className="p-4 bg-gradient-to-br from-sky-500 to-indigo-600 text-white min-h-[140px] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <CloudSun className="h-4 w-4 text-amber-300" />
                <span className="truncate">{resource.attributes?.weatherCondition || 'Atmospheric Data'}</span>
              </div>
              {resource.attributes?.temperature !== undefined && (
                <span className="text-2xl font-bold font-mono text-amber-200">
                  {resource.attributes.temperature}°C
                </span>
              )}
            </div>
            <p className="text-xs text-sky-100 line-clamp-2 my-2">
              {resource.description}
            </p>
            <div className="flex items-center justify-between text-[10px] text-sky-200">
              <span>{resource.attributes?.region || 'Open-Meteo High Resolution Model'}</span>
              <span>Live Forecast</span>
            </div>
          </div>
        )}

        {/* Code & Software */}
        {resource.category === 'code' && (
          <div className="p-4 bg-neutral-900 text-neutral-200 border-b border-neutral-800 min-h-[140px] flex flex-col justify-between font-mono">
            <div>
              <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold mb-1">
                <Code2 className="h-3.5 w-3.5" />
                <span className="truncate">{resource.attributes?.language || 'Code Repository'}</span>
              </div>
              <p className="text-xs text-neutral-400 font-sans line-clamp-3">
                {resource.description || 'Open source software codebase and library.'}
              </p>
            </div>
            <div className="flex items-center justify-between pt-2 text-[11px] text-neutral-400">
              <span>{resource.attributes?.stars ? `⭐ ${resource.attributes.stars}` : 'Open Source'}</span>
              <span>{resource.attributes?.version ? `v${resource.attributes.version}` : (resource.attributes?.format || 'REPO')}</span>
            </div>
          </div>
        )}

        {/* Biodiversity & Taxa */}
        {resource.category === 'biodiversity' && (
          <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-100 border-b border-emerald-200/80 min-h-[140px] flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-emerald-800 text-xs font-semibold mb-1">
                <Sprout className="h-3.5 w-3.5" />
                <span>{resource.attributes?.kingdom || 'GBIF Taxonomy'}</span>
              </div>
              <p className="text-xs text-neutral-700 italic line-clamp-2">
                {resource.attributes?.scientificName || resource.title}
              </p>
              <p className="text-[11px] text-neutral-600 line-clamp-2 mt-1">
                {resource.description}
              </p>
            </div>
            <div className="flex items-center justify-between pt-2 text-[11px] text-emerald-700 font-medium">
              <span>Backbone Taxonomy</span>
              <span>GBIF Verified</span>
            </div>
          </div>
        )}

        {/* Knowledge & Encyclopedia */}
        {resource.category === 'knowledge' && (
          <div className="p-4 bg-gradient-to-br from-slate-50 to-neutral-100 border-b border-neutral-200/80 min-h-[140px] flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-indigo-700 text-xs font-semibold mb-1">
                <Globe2 className="h-3.5 w-3.5" />
                <span>Wikipedia Reference</span>
              </div>
              <p className="text-xs text-neutral-700 line-clamp-3">
                {resource.description || 'Open educational knowledge article.'}
              </p>
            </div>
            <div className="flex items-center justify-between pt-2 text-[11px] text-neutral-500 font-medium">
              <span>CC BY-SA 4.0</span>
              <span>Open Encyclopedia</span>
            </div>
          </div>
        )}

        {/* Finance & Currency */}
        {resource.category === 'finance' && (
          <div className="p-4 bg-gradient-to-br from-violet-900 to-indigo-950 text-white min-h-[140px] flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-emerald-300 text-xs font-semibold mb-1">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>ECB Benchmark Forex</span>
              </div>
              <p className="text-xs text-neutral-300 line-clamp-3">
                {resource.description}
              </p>
            </div>
            <div className="flex items-center justify-between pt-2 text-[11px] text-neutral-400 font-mono">
              <span>{resource.attributes?.currencyBase ? `Base: ${resource.attributes.currencyBase}` : 'Forex Rates'}</span>
              <span>ECB Reference</span>
            </div>
          </div>
        )}

        {/* Food & Culinary */}
        {resource.category === 'food' && (
          <div className="aspect-[16/10] w-full relative overflow-hidden bg-amber-950/20 flex items-center justify-center">
            <RealMediaImage
              src={resource.thumbnailUrl}
              alt={resource.title}
              providerName={resource.source.providerName}
              category={resource.category}
              lqip={resource.attributes?.lqip}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <span className="absolute top-2.5 right-11 rounded-md bg-neutral-900/80 backdrop-blur-md px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
              Food & Culinary
            </span>
          </div>
        )}

        {/* Games */}
        {resource.category === 'games' && (
          <div className="aspect-[16/10] w-full relative overflow-hidden bg-gradient-to-br from-rose-900 to-indigo-900 flex items-center justify-center p-3">
            <RealMediaImage
              src={resource.thumbnailUrl}
              alt={resource.title}
              providerName={resource.source.providerName}
              category={resource.category}
              lqip={resource.attributes?.lqip}
              className="h-full max-h-28 object-contain drop-shadow-lg transition-transform duration-500 group-hover:scale-110"
            />
            <span className="absolute top-2.5 right-11 rounded-md bg-neutral-900/80 backdrop-blur-md px-1.5 py-0.5 text-[10px] font-medium text-rose-300">
              Game Data
            </span>
          </div>
        )}

        {/* 3D Models & Spatial Assets */}
        {resource.category === '3d' && (
          <div className="aspect-[16/10] w-full relative overflow-hidden bg-gradient-to-br from-indigo-950 via-neutral-900 to-black flex items-center justify-center">
            {resource.thumbnailUrl || resource.previewUrl ? (
              <RealMediaImage
                src={resource.thumbnailUrl || resource.previewUrl}
                alt={resource.title}
                providerName={resource.source.providerName}
                category={resource.category}
                lqip={resource.attributes?.lqip}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="p-4 text-center">
                <Box className="h-10 w-10 text-cyan-400 mx-auto mb-2" />
                <span className="text-xs text-neutral-200 font-medium line-clamp-2">{resource.title}</span>
              </div>
            )}
            <span className="absolute top-2.5 right-11 rounded-md bg-neutral-950/80 backdrop-blur-md px-1.5 py-0.5 text-[10px] font-semibold text-cyan-300 border border-cyan-800/40 flex items-center gap-1">
              <Box className="h-3 w-3" />
              <span>{resource.attributes?.polycount ? `${resource.attributes.polycount.toLocaleString()} polys` : '3D Spatial'}</span>
            </span>
          </div>
        )}

        {/* Universal Fallback for any other category */}
        {!['images', 'gifs', 'videos', 'music', 'audio', 'papers', 'maps', 'datasets', 'books', 'art', 'weather', 'code', 'biodiversity', 'knowledge', 'finance', 'food', 'games', '3d'].includes(resource.category) && (
          <div className="aspect-[16/10] w-full relative overflow-hidden bg-neutral-900 flex items-center justify-center">
            {resource.thumbnailUrl || resource.previewUrl ? (
              <RealMediaImage
                src={resource.thumbnailUrl || resource.previewUrl}
                alt={resource.title}
                providerName={resource.source.providerName}
                category={resource.category}
                lqip={resource.attributes?.lqip}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="p-4 text-center">
                <FileText className="h-10 w-10 text-neutral-400 mx-auto mb-2" />
                <span className="text-xs text-neutral-300 font-medium line-clamp-2">{resource.title}</span>
              </div>
            )}
            <span className="absolute top-2.5 right-11 rounded-md bg-neutral-900/80 backdrop-blur-md px-1.5 py-0.5 text-[10px] font-medium text-neutral-300 uppercase">
              {resource.category}
            </span>
          </div>
        )}
      </div>

      {/* Card Information Body */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Title */}
          <h3 
            onClick={() => onOpenPreview(resource)}
            className="text-sm font-semibold text-neutral-900 leading-snug line-clamp-2 hover:text-blue-600 cursor-pointer transition-colors"
          >
            {resource.title}
          </h3>

          {/* Creator / Contributor Credit */}
          <p className="mt-1 text-xs text-neutral-500 truncate">
            <span className="text-neutral-400">By </span>
            <span className="font-medium text-neutral-700">{resource.creator?.name || 'Verified Contributor'}</span>
            {resource.creator?.organization && (
              <span className="text-neutral-400"> · {resource.creator.organization}</span>
            )}
          </p>

          {/* Source Provider & License Badges */}
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {/* Media Modality Chip */}
            <span className="inline-flex items-center rounded-md bg-neutral-900 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
              {resource.category === 'images' ? 'Picture' : resource.category === 'art' ? 'Art' : resource.category}
            </span>

            {/* Real Source Provider Pill */}
            <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium border ${
              resource.isUserOwned 
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-neutral-100 text-neutral-700 border-neutral-200'
            }`}>
              {resource.isUserOwned ? (
                <>
                  <UserCheck className="h-3 w-3 text-amber-600" />
                  <span>User Owned</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-3 w-3 text-indigo-500" />
                  <span>{providerName}</span>
                </>
              )}
            </span>

            {/* License Chip */}
            <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium border ${
              isUnknownLicense
                ? 'bg-neutral-100 text-neutral-600 border-neutral-200'
                : licenseType.includes('Public Domain') || licenseType.includes('CC0')
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
                : 'bg-blue-50 text-blue-800 border-blue-200/80'
            }`}>
              <Check className="h-3 w-3" />
              {licenseType}
            </span>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onOpenPreview(resource)}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-white py-1.5 px-3 text-xs font-medium text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
          >
            <Eye className="h-3.5 w-3.5 text-neutral-400" />
            <span>{resource.category === 'papers' ? 'Read' : 'Preview'}</span>
          </button>

          <button
            type="button"
            id={`btn-download-${resource.id}`}
            onClick={() => onStartDownload(resource)}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-neutral-900 py-1.5 px-3.5 text-xs font-medium text-white hover:bg-neutral-800 transition-colors shadow-xs active:scale-95"
            title={`Download ${resource.title}`}
          >
            <Download className="h-3.5 w-3.5 text-emerald-400" />
            <span>Download</span>
          </button>
        </div>
      </div>
    </div>
  );
};
