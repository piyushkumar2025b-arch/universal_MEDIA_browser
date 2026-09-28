/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ResourceCategory } from '../types/resource';
import { getContentPhoto } from '../utils/contentPhotos';

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

function normalizeImageUrl(url: string | undefined, category: string, alt: string): string {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return getContentPhoto(alt, category);
  }

  const trimmed = url.trim();

  // If running on HTTPS and image is HTTP, route through proxy to prevent browser mixed content block
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && trimmed.startsWith('http://')) {
    // If it's a domain that supports HTTPS, upgrade directly
    if (trimmed.includes('wikimedia.org') || trimmed.includes('archive.org') || trimmed.includes('nasa.gov') || trimmed.includes('unsplash.com')) {
      return trimmed.replace(/^http:\/\//i, 'https://');
    }
    return `/api/image-proxy?url=${encodeURIComponent(trimmed)}&category=${encodeURIComponent(category)}&title=${encodeURIComponent(alt)}`;
  }

  return trimmed;
}

export const ReliableMediaImage: React.FC<ReliableMediaImageProps> = ({
  src,
  alt,
  className = '',
  priority = false,
  category = 'images',
  lqip
}) => {
  const initialUrl = normalizeImageUrl(src || lqip, category, alt);
  const [currentSrc, setCurrentSrc] = useState(initialUrl);
  const [errorStep, setErrorStep] = useState(0); // 0 = initial, 1 = proxy attempted, 2 = verified fallback
  const [isLoaded, setIsLoaded] = useState(() => (src ? globalLoadedImages.has(src) : false));

  useEffect(() => {
    const nextUrl = normalizeImageUrl(src || lqip, category, alt);
    setCurrentSrc(nextUrl);
    setErrorStep(0);
    setIsLoaded(src ? globalLoadedImages.has(src) : false);
  }, [src, lqip, category, alt]);

  const handleError = () => {
    if (errorStep === 0 && src && src.startsWith('http') && !currentSrc.startsWith('/api/image-proxy')) {
      // Step 1: Attempt server proxy with multi-tier User-Agent and Referer headers
      setErrorStep(1);
      setCurrentSrc(`/api/image-proxy?url=${encodeURIComponent(src)}&title=${encodeURIComponent(alt)}&category=${encodeURIComponent(category)}`);
      return;
    }

    // Step 2: Use guaranteed high-resolution verified content photograph
    setErrorStep(2);
    const fallback = getContentPhoto(alt, category);
    setCurrentSrc(fallback);
  };

  const handleLoad = () => {
    setIsLoaded(true);
    if (src) globalLoadedImages.add(src);
  };

  return (
    <img
      src={currentSrc}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={handleError}
      onLoad={handleLoad}
      className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-85'} transition-opacity duration-300`}
    />
  );
};
