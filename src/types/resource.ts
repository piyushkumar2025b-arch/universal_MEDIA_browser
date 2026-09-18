export type ResourceCategory = 
  | 'all'
  | 'images'
  | 'videos'
  | 'gifs'
  | 'music'
  | 'audio'
  | 'papers'
  | 'books'
  | 'maps'
  | 'weather'
  | 'datasets'
  | 'art'
  | 'code'
  | 'finance'
  | 'biodiversity'
  | 'knowledge'
  | 'food'
  | 'games'
  | '3d'
  | 'nasa';

export type NasaSubCategory = 
  | 'all'
  | 'images'
  | 'mars'
  | 'epic'
  | 'videos'
  | 'audio'
  | 'asteroids'
  | 'exoplanets'
  | 'papers'
  | 'biology'
  | 'spaceweather';

export type LicenseType = 
  | 'Free to use'
  | 'Commercial allowed'
  | 'Public Domain / CC0'
  | 'Attribution required'
  | 'Educational only'
  | 'Open Database License (ODbL)'
  | 'Open Access'
  | 'Unknown / Not specified'
  | string;

export type QualityLevel = 'Any' | 'SD' | 'HD' | 'Full HD' | '4K' | 'Original' | string;

export interface ResourceLicense {
  type?: string;
  url?: string;
  details?: string;
  commercialAllowed?: boolean;
  attributionRequired?: boolean;
  modificationAllowed?: boolean;
  verified: boolean;
}

export interface ResourceItem {
  id: string;
  title: string;
  category: ResourceCategory;
  description?: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  downloadUrl?: string;
  creator?: {
    name?: string;
    profileUrl?: string;
    organization?: string;
  };
  source: {
    providerId: string;
    providerName: string;
    resourceUrl: string;
    apiUrl?: string;
    externalId?: string;
  };
  license?: ResourceLicense;
  attributes: {
    format?: string;
    fileSize?: string;
    dimensions?: string;
    resolution?: string;
    duration?: string;
    quality?: QualityLevel;
    year?: number;
    doi?: string;
    citations?: number;
    abstract?: string;
    journal?: string;
    pdfUrl?: string;
    bpm?: number;
    genre?: string;
    album?: string;
    isStreamable?: boolean;
    waveform?: number[];
    coordinates?: [number, number];
    region?: string;
    mapType?: string;
    sampleData?: Record<string, any>[];
    downloads?: number;
    tags?: string[];
    lqip?: string;
    embedUrl?: string;
    invidiousUrl?: string;
    pipedUrl?: string;
    proxyEmbedUrl?: string;
    youtubeId?: string;
    channel?: string;
    views?: number | string;
    // Domain-specific fields
    author?: string;
    isbn?: string;
    pages?: number;
    artist?: string;
    medium?: string;
    culture?: string;
    classification?: string;
    stars?: number;
    forks?: number;
    language?: string;
    version?: string;
    temperature?: number;
    weatherCondition?: string;
    scientificName?: string;
    kingdom?: string;
    currencyBase?: string;
    rates?: Record<string, number>;
    repository?: string;
    documentation?: string;
    branch?: string;
    symbol?: string;
    category?: string;
    wordCount?: number;
    arxivId?: string;
    rank?: number;
    alcoholic?: string;
    glass?: string;
    difficulty?: string;
    correctAnswer?: string;
    [key: string]: any;
  };
  verification: {
    metadataVerified: boolean;
    resourceReachable: boolean;
    integrityVerified: boolean;
    checksum?: string;
  };
  isUserOwned?: boolean;
}

export interface SearchFilters {
  category: ResourceCategory;
  nasaSubCategory?: NasaSubCategory;
  query: string;
  quality: string;
  license: string[];
  format: string;
  sortBy: 'relevance' | 'newest' | 'quality' | 'downloads';
  page?: number;
  pageSize?: number;
  continuous?: boolean;
}

export interface SearchResultEnvelope {
  results: ResourceItem[];
  totalCount: number;
  executionTimeMs: number;
  categoryCounts: Record<ResourceCategory, number>;
  primaryProviderUsed: string;
  fallbackUsed?: string;
  providerErrors: string[];
  page?: number;
  pageSize?: number;
  totalPages?: number;
  isFetchingMore?: boolean;
  isHarvesting?: boolean;
  cachedCount?: number;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  color: string;
  resourceIds: string[];
  createdAt: string;
}

export interface DownloadHistoryItem {
  id: string;
  resourceId: string;
  resourceTitle: string;
  category: ResourceCategory;
  format?: string;
  fileSize?: string;
  downloadedAt: string;
}

export interface ProviderHealth {
  id: string;
  name: string;
  category: string;
  status: 'healthy' | 'degraded' | 'rate_limited' | 'offline' | 'auth_failed' | 'server_error';
  latencyMs?: number;
  lastSuccess?: string | null;
  lastFailure?: string | null;
  requests: number;
  errors: number;
  rateLimit?: string;
  lastErrorMessage?: string;
  statusCode?: number;
  diagnosticFeedback?: string;
  recommendedAction?: string;
  errorType?: 'auth' | 'rate_limit' | 'server_error' | 'network' | 'timeout';
}

export type ProviderStatus = ProviderHealth;
