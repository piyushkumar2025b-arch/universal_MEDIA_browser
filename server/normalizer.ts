import { ResourceItem, ResourceCategory } from '../src/types/resource';
import { parseAndValidateLicense } from './license_validator';

export function normalizeCategory(raw?: any): ResourceCategory {
  if (!raw) return 'all';
  let str = '';
  if (typeof raw === 'string') {
    str = raw;
  } else if (Array.isArray(raw)) {
    str = typeof raw[0] === 'string' ? raw[0] : '';
  } else if (typeof raw === 'object') {
    return 'all';
  } else {
    str = String(raw);
  }
  const clean = str.toLowerCase().trim();
  switch (clean) {
    case 'image':
    case 'images':
    case 'photo':
    case 'photos':
    case 'picture':
    case 'pictures':
      return 'images';

    case 'video':
    case 'videos':
    case 'movie':
    case 'movies':
    case 'film':
    case 'films':
      return 'videos';

    case 'gif':
    case 'gifs':
    case 'animation':
    case 'animations':
      return 'gifs';

    case 'audio':
    case 'sound':
    case 'sounds':
    case 'podcast':
    case 'podcasts':
      return 'audio';

    case 'music':
    case 'song':
    case 'songs':
    case 'track':
    case 'tracks':
      return 'music';

    case 'paper':
    case 'papers':
    case 'research':
    case 'article':
    case 'articles':
    case 'scholarly':
      return 'papers';

    case 'book':
    case 'books':
    case 'ebook':
    case 'ebooks':
    case 'literature':
      return 'books';

    case 'map':
    case 'maps':
    case 'geo':
    case 'geographic':
      return 'maps';

    case 'weather':
    case 'climate':
      return 'weather';

    case 'dataset':
    case 'datasets':
    case 'data':
      return 'datasets';

    case 'art':
    case 'artwork':
    case 'museum':
      return 'art';

    case 'code':
    case 'software':
    case 'package':
    case 'packages':
    case 'repo':
    case 'repos':
      return 'code';

    case 'finance':
    case 'currency':
    case 'crypto':
    case 'forex':
      return 'finance';

    case 'biodiversity':
    case 'nature':
    case 'species':
    case 'wildlife':
      return 'biodiversity';

    case 'knowledge':
    case 'encyclopedia':
    case 'wiki':
    case 'facts':
      return 'knowledge';

    case 'food':
    case 'recipe':
    case 'recipes':
    case 'meal':
    case 'meals':
      return 'food';

    case 'game':
    case 'games':
    case 'gaming':
      return 'games';

    case '3d':
    case 'model':
    case 'models':
    case 'spatial':
      return '3d';

    case 'nasa':
    case 'space':
    case 'astronomy':
    case 'cosmos':
    case 'astro':
      return 'nasa';

    case 'all':
    default:
      return 'all';
  }
}

export function sanitizeTitle(raw?: any, fallback = 'Untitled Resource'): string {
  if (!raw) return fallback;
  const str = Array.isArray(raw) ? raw.join(' ') : String(raw);
  const cleaned = str.replace(/<[^>]+>/g, '').trim();
  return cleaned || fallback;
}

export function sanitizeDescription(raw?: any): string | undefined {
  if (!raw) return undefined;
  const str = Array.isArray(raw) ? raw.filter(Boolean).join(' ') : String(raw);
  const cleaned = str.replace(/<[^>]+>/g, '').trim();
  return cleaned || undefined;
}

export function buildResourceItem(params: {
  id: string;
  title: any;
  category: ResourceCategory;
  description?: any;
  thumbnailUrl?: string;
  previewUrl?: string;
  downloadUrl?: string;
  providerId: string;
  providerName: string;
  resourceUrl: string;
  externalId?: string;
  apiUrl?: string;
  creatorName?: any;
  creatorProfileUrl?: string;
  creatorOrg?: string;
  rawLicense?: string;
  licenseUrl?: string;
  providerDefaultLicense?: { type: string; commercialAllowed: boolean; attributionRequired: boolean };
  attributes?: Partial<ResourceItem['attributes']>;
  checksum?: string;
  isVerified?: boolean;
}): ResourceItem {
  const verifiedLicense = parseAndValidateLicense(
    params.rawLicense,
    params.licenseUrl,
    params.providerDefaultLicense
  );

  const creatorNameStr = params.creatorName 
    ? (Array.isArray(params.creatorName) ? params.creatorName.filter(Boolean).join(', ') : String(params.creatorName))
    : undefined;

  return {
    id: String(params.id),
    title: sanitizeTitle(params.title),
    category: params.category,
    description: sanitizeDescription(params.description),
    thumbnailUrl: params.thumbnailUrl,
    previewUrl: params.previewUrl || params.thumbnailUrl,
    downloadUrl: params.downloadUrl || params.previewUrl || params.resourceUrl,
    creator: creatorNameStr ? {
      name: creatorNameStr,
      profileUrl: params.creatorProfileUrl,
      organization: params.creatorOrg
    } : undefined,
    source: {
      providerId: params.providerId,
      providerName: params.providerName,
      resourceUrl: params.resourceUrl,
      externalId: params.externalId,
      apiUrl: params.apiUrl
    },
    license: verifiedLicense,
    attributes: {
      ...params.attributes
    },
    verification: {
      metadataVerified: params.isVerified ?? true,
      resourceReachable: true,
      integrityVerified: Boolean(params.checksum),
      checksum: params.checksum
    }
  };
}
