/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Download, 
  Heart, 
  Check, 
  ExternalLink, 
  Music,
  Share2,
  ChevronDown,
  ChevronUp,
  Play
} from 'lucide-react';
import { ResourceItem, Collection } from '../types/resource';
import { getContentPhoto } from '../utils/contentPhotos';
import { getAssetExtension } from '../utils/downloadEngine';
import { sanitizeSafeLink } from '../utils/sanitizeUrl';
import { ProfessionalVideoPlayer } from './ProfessionalVideoPlayer';
import { ReliableMediaImage } from './ReliableMediaImage';
import { ThemeId, THEMES } from '../types/theme';

interface ResourceDetailModalProps {
  resource: ResourceItem | null;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onStartDownload: (resource: ResourceItem) => void;
  collections: Collection[];
  onAddToCollection: (collectionId: string, resourceId: string) => void;
  relatedResources?: ResourceItem[];
  onSelectRelated?: (resource: ResourceItem) => void;
  theme?: ThemeId;
}

export const ResourceDetailModal: React.FC<ResourceDetailModalProps> = ({
  resource,
  onClose,
  isFavorite,
  onToggleFavorite,
  onStartDownload,
  collections,
  onAddToCollection,
  relatedResources = [],
  onSelectRelated,
  theme = 'studio-light'
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [audioError, setAudioError] = useState(false);

  const themeDef = THEMES[theme] || THEMES['studio-light'];
  const isDark = themeDef.isDark;

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!resource) return null;

  const creatorName = resource.creator?.name || 'Open Archive Contributor';
  const providerName = resource.source?.providerName || 'Media Archive';
  const licenseType = resource.license?.type || 'Open Media';
  const previewSource = resource.previewUrl || resource.downloadUrl || resource.thumbnailUrl;
  const assetExtension = getAssetExtension(resource).toUpperCase();
  const rawResourceUrl = resource.source?.resourceUrl || resource.previewUrl || resource.downloadUrl;
  const resourceUrl = sanitizeSafeLink(rawResourceUrl);

  const copyShareLink = () => {
    const link = resourceUrl || window.location.href;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 md:p-6 overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div 
        className={`relative w-full max-w-7xl rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[96vh] flex flex-col transition-colors duration-200 ${
          isDark ? 'bg-neutral-900 border border-neutral-800 text-neutral-100' : 'bg-white border border-neutral-100 text-neutral-900'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Floating Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-40 flex h-9 w-9 items-center justify-center rounded-full bg-neutral-950/70 text-white backdrop-blur-md hover:bg-neutral-900 transition-colors cursor-pointer"
          title="Close player"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Scrollable Container (YouTube Theater Grid) */}
        <div className="overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
            
            {/* LEFT / MAIN COLUMN (approx 68% on Desktop) */}
            <div className="lg:col-span-8 flex flex-col space-y-4">
              
              {/* VIDEO / MEDIA PLAYER SCREEN */}
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-lg flex items-center justify-center">
                {resource.category === 'videos' ? (
                  /* Universal Professional Video Player Engine */
                  <ProfessionalVideoPlayer resource={resource} autoPlay={true} />
                ) : resource.category === 'music' || resource.category === 'audio' ? (
                  /* Audio / Music Player */
                  <div className="relative h-full w-full bg-neutral-950 flex flex-col items-center justify-center p-6 text-white text-center">
                    {resource.thumbnailUrl && (
                      <img
                        src={resource.thumbnailUrl}
                        alt={resource.title}
                        className="absolute inset-0 h-full w-full object-cover opacity-20 blur-md pointer-events-none"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <div className="relative z-10 space-y-4 max-w-md">
                      <div className="h-24 w-24 mx-auto rounded-2xl overflow-hidden shadow-xl border border-neutral-800 bg-neutral-900 flex items-center justify-center">
                        {resource.thumbnailUrl ? (
                          <ReliableMediaImage
                            src={resource.thumbnailUrl}
                            alt={resource.title}
                            category={resource.category}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Music className="h-10 w-10 text-neutral-400" />
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-white line-clamp-1">{resource.title}</h3>
                      <p className="text-xs text-neutral-400">{creatorName}</p>
                      
                      {previewSource && (
                        <audio
                          src={previewSource}
                          controls
                          autoPlay
                          className="w-full mt-4"
                          onError={() => setAudioError(true)}
                        />
                      )}
                      {audioError && (
                        <p className="text-xs text-amber-400">Audio stream fallback active.</p>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Fine Art / Photography / Visual Image Viewer with Guaranteed Fallback */
                  <ReliableMediaImage
                    src={previewSource}
                    alt={resource.title}
                    category={resource.category}
                    className="w-full h-full object-contain"
                  />
                )}
              </div>

              {/* MEDIA TITLE */}
              <div>
                <h1 className={`text-xl sm:text-2xl font-bold tracking-tight leading-snug ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                  {resource.title}
                </h1>
              </div>

              {/* YT-STYLE CREATOR ROW & ACTION BUTTONS */}
              <div className={`flex flex-wrap items-center justify-between gap-4 py-2 border-b ${
                isDark ? 'border-neutral-800' : 'border-neutral-100'
              }`}>
                {/* Creator info */}
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-semibold text-sm ${
                    isDark ? 'bg-neutral-800 text-neutral-100' : 'bg-neutral-900 text-white'
                  }`}>
                    {creatorName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className={`text-sm font-semibold leading-tight ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                      {creatorName}
                    </h2>
                    <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                      {providerName}
                    </p>
                  </div>
                </div>

                {/* Actions Row */}
                <div className="flex items-center gap-2">
                  {/* Save / Favorite */}
                  <button
                    onClick={() => onToggleFavorite(resource.id)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      isFavorite
                        ? (isDark ? 'bg-pink-950/70 text-pink-300' : 'bg-pink-50 text-pink-700')
                        : (isDark ? 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700' : 'bg-neutral-100 text-neutral-800 hover:bg-neutral-200')
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current text-pink-500' : ''}`} />
                    <span>{isFavorite ? 'Saved' : 'Save'}</span>
                  </button>

                  {/* Download Button */}
                  <button
                    onClick={() => onStartDownload(resource)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer shadow-xs ${
                      isDark 
                        ? 'bg-white text-neutral-900 hover:bg-neutral-200' 
                        : 'bg-neutral-900 text-white hover:bg-neutral-800'
                    }`}
                  >
                    <Download className="h-4 w-4" />
                    <span>Download {assetExtension}</span>
                  </button>

                  {/* Share Link */}
                  <button
                    onClick={copyShareLink}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-all cursor-pointer ${
                      isDark ? 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700' : 'bg-neutral-100 text-neutral-800 hover:bg-neutral-200'
                    }`}
                    title="Copy direct share link"
                  >
                    {copiedLink ? <Check className="h-4 w-4 text-emerald-500" /> : <Share2 className="h-4 w-4" />}
                    <span className="hidden sm:inline">{copiedLink ? 'Copied' : 'Share'}</span>
                  </button>

                  {/* External Source */}
                  {resourceUrl && (
                    <a
                      href={resourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-1 px-3 py-2 rounded-full text-xs font-medium transition-all ${
                        isDark ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                      }`}
                      title="Open on official website"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span className="hidden sm:inline">Source</span>
                    </a>
                  )}
                </div>
              </div>

              {/* YT-STYLE EXPANDABLE DESCRIPTION BOX */}
              <div className={`rounded-2xl p-4 text-xs transition-colors ${
                isDark ? 'bg-neutral-800/60 hover:bg-neutral-800/90 text-neutral-300' : 'bg-neutral-50 hover:bg-neutral-100/70 text-neutral-700'
              }`}>
                <div className={`flex items-center gap-3 font-semibold mb-2 ${isDark ? 'text-neutral-200' : 'text-neutral-800'}`}>
                  <span>{resource.category.toUpperCase()}</span>
                  <span>·</span>
                  <span>{providerName}</span>
                  {resource.attributes?.duration && (
                    <>
                      <span>·</span>
                      <span>{resource.attributes.duration}</span>
                    </>
                  )}
                  <span>·</span>
                  <span className={`font-normal ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>{licenseType}</span>
                </div>

                <p className={`leading-relaxed ${showFullDescription ? '' : 'line-clamp-3'}`}>
                  {resource.description || 'Curated high-resolution open media resource.'}
                </p>

                {resource.description && resource.description.length > 160 && (
                  <button
                    onClick={() => setShowFullDescription(!showFullDescription)}
                    className={`mt-2 text-xs font-semibold hover:underline flex items-center gap-1 cursor-pointer ${
                      isDark ? 'text-white' : 'text-neutral-900'
                    }`}
                  >
                    <span>{showFullDescription ? 'Show less' : 'Show more'}</span>
                    {showFullDescription ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                )}
              </div>

            </div>

            {/* RIGHT COLUMN: YOUTUBE-STYLE "UP NEXT" / RELATED FEED */}
            <div className="lg:col-span-4 flex flex-col space-y-3">
              <div className="flex items-center justify-between pb-1">
                <h3 className={`text-sm font-bold tracking-tight ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                  Related Media
                </h3>
                <span className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  {relatedResources.length} available
                </span>
              </div>

              {/* List of related media cards */}
              <div className="space-y-3 max-h-[75vh] overflow-y-auto pr-1 no-scrollbar">
                {relatedResources.slice(0, 15).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onSelectRelated && onSelectRelated(item)}
                    className={`group flex gap-3 p-1.5 rounded-xl transition-colors cursor-pointer ${
                      isDark ? 'hover:bg-neutral-800/80' : 'hover:bg-neutral-100/80'
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="relative h-20 w-32 shrink-0 rounded-lg overflow-hidden bg-neutral-800">
                      <ReliableMediaImage
                        src={item.thumbnailUrl || item.previewUrl}
                        alt={item.title}
                        category={item.category}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      {item.attributes?.duration && (
                        <span className="absolute bottom-1 right-1 bg-black/80 text-white font-mono text-[9px] px-1 py-0.5 rounded">
                          {item.attributes.duration}
                        </span>
                      )}
                      {item.category === 'videos' && !item.attributes?.duration && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                          <Play className="h-4 w-4 text-white fill-current opacity-80" />
                        </div>
                      )}
                    </div>

                    {/* Meta info */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <h4 className={`text-xs font-semibold line-clamp-2 leading-snug transition-colors ${
                        isDark ? 'text-neutral-100 group-hover:text-white' : 'text-neutral-900 group-hover:text-neutral-700'
                      }`}>
                        {item.title}
                      </h4>
                      <p className={`text-[11px] mt-1 truncate ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                        {item.creator?.name || item.source?.providerName || 'Archive'}
                      </p>
                      <span className={`text-[10px] uppercase tracking-wide ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>
                        {item.category}
                      </span>
                    </div>
                  </div>
                ))}

                {relatedResources.length === 0 && (
                  <div className={`py-12 text-center text-xs ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>
                    No additional related media in current view.
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
