/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ResourceCategory } from '../types/resource';
import { isRealImage } from '../utils/contentPhotos';
import { ImageOff, FileText, Code2, Music, Database, BookOpen, Newspaper } from 'lucide-react';

export const globalLoadedImages = new Set<string>();

interface ReliableMediaImageProps {
  src?: string;
  alt: string;
  className?: string;
  providerName?: string;
  priority?: boolean;
  category?: ResourceCategory | string;
  lqip?: string;
}

function normalizeImageUrl(url: string | undefined): string | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  const trimmed = url.trim();
  if (!isRealImage(trimmed)) {
    return null;
  }

  // If running on HTTPS and image is HTTP, route through proxy or upgrade to prevent browser mixed content block
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && trimmed.startsWith('http://')) {
    if (trimmed.includes('wikimedia.org') || trimmed.includes('archive.org') || trimmed.includes('nasa.gov')) {
      return trimmed.replace(/^http:\/\//i, 'https://');
    }
    return `/api/image-proxy?url=${encodeURIComponent(trimmed)}`;
  }

  return trimmed;
}

export const ReliableMediaImage: React.FC<ReliableMediaImageProps> = ({
  src,
  alt,
  className = '',
  priority = false,
  category,
  lqip
}) => {
  const initialUrl = normalizeImageUrl(src || lqip);
  const [currentSrc, setCurrentSrc] = useState<string | null>(initialUrl);
  const [hasAttemptedProxy, setHasAttemptedProxy] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(() => (initialUrl ? globalLoadedImages.has(initialUrl) : false));

  useEffect(() => {
    const nextUrl = normalizeImageUrl(src || lqip);
    setCurrentSrc(nextUrl);
    setHasAttemptedProxy(false);
    setHasError(!nextUrl);
    setIsLoaded(nextUrl ? globalLoadedImages.has(nextUrl) : false);
  }, [src, lqip]);

  const handleError = () => {
    // If external URL failed directly, attempt our server image proxy once
    if (!hasAttemptedProxy && currentSrc && currentSrc.startsWith('http') && !currentSrc.startsWith('/api/')) {
      setHasAttemptedProxy(true);
      setCurrentSrc(`/api/image-proxy?url=${encodeURIComponent(currentSrc)}`);
      return;
    }

    // Never substitute fake stock photos. Cleanly transition to unavailable state.
    setHasError(true);
    setCurrentSrc(null);
  };

  const handleLoad = () => {
    setIsLoaded(true);
    setHasError(false);
    if (currentSrc) globalLoadedImages.add(currentSrc);
  };

  if (!currentSrc || hasError) {
    if (category === 'papers') {
      return (
        <div className={`w-full h-full flex flex-col items-center justify-center bg-blue-950/20 text-blue-400 p-4 ${className}`}>
          <FileText className="h-6 w-6 mb-1 opacity-80" />
          <span className="text-[11px] font-medium opacity-80 text-center line-clamp-1">{alt || 'Research Document'}</span>
        </div>
      );
    }
    if (category === 'code') {
      return (
        <div className={`w-full h-full flex flex-col items-center justify-center bg-emerald-950/20 text-emerald-400 p-4 ${className}`}>
          <Code2 className="h-6 w-6 mb-1 opacity-80" />
          <span className="text-[11px] font-medium opacity-80 text-center line-clamp-1">{alt || 'Code Repository'}</span>
        </div>
      );
    }
    if (category === 'music' || category === 'audio') {
      return (
        <div className={`w-full h-full flex flex-col items-center justify-center bg-purple-950/20 text-purple-400 p-4 ${className}`}>
          <Music className="h-6 w-6 mb-1 opacity-80" />
          <span className="text-[11px] font-medium opacity-80 text-center line-clamp-1">{alt || 'Audio Track'}</span>
        </div>
      );
    }
    if (category === 'datasets' || category === 'finance') {
      return (
        <div className={`w-full h-full flex flex-col items-center justify-center bg-amber-950/20 text-amber-400 p-4 ${className}`}>
          <Database className="h-6 w-6 mb-1 opacity-80" />
          <span className="text-[11px] font-medium opacity-80 text-center line-clamp-1">{alt || 'Open Dataset'}</span>
        </div>
      );
    }
    if (category === 'books') {
      return (
        <div className={`w-full h-full flex flex-col items-center justify-center bg-orange-950/20 text-orange-400 p-4 ${className}`}>
          <BookOpen className="h-6 w-6 mb-1 opacity-80" />
          <span className="text-[11px] font-medium opacity-80 text-center line-clamp-1">{alt || 'Book / Archive'}</span>
        </div>
      );
    }
    if (category === 'news') {
      return (
        <div className={`w-full h-full flex flex-col items-center justify-center bg-neutral-900/40 text-neutral-400 p-4 ${className}`}>
          <Newspaper className="h-6 w-6 mb-1 opacity-80" />
          <span className="text-[11px] font-medium opacity-80 text-center line-clamp-1">{alt || 'News Wire'}</span>
        </div>
      );
    }

    return (
      <div className={`w-full h-full flex flex-col items-center justify-center bg-neutral-900/40 text-neutral-500 p-4 ${className}`}>
        <ImageOff className="h-6 w-6 mb-1.5 opacity-40" />
        <span className="text-[11px] font-medium opacity-60 text-center line-clamp-1">{alt || 'Image unavailable'}</span>
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      referrerPolicy="origin-when-cross-origin"
      onError={handleError}
      onLoad={handleLoad}
      className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-85'} transition-opacity duration-300`}
    />
  );
};
