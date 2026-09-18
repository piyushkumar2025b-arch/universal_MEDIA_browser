import { ResourceLicense } from '../src/types/resource';

export interface LicenseValidationResult {
  license: ResourceLicense;
  isVerified: boolean;
  notes?: string;
}

export function parseAndValidateLicense(
  rawLicenseStr?: string,
  rawUrl?: string,
  providerDefault?: { type: string; commercialAllowed: boolean; attributionRequired: boolean }
): ResourceLicense {
  if (!rawLicenseStr && !rawUrl && !providerDefault) {
    return {
      type: 'Unknown / Not specified',
      verified: false,
      commercialAllowed: false,
      attributionRequired: true
    };
  }

  const safeLicenseStr = typeof rawLicenseStr === 'string'
    ? rawLicenseStr
    : (Array.isArray(rawLicenseStr) ? (rawLicenseStr as any[]).join(' ') : (rawLicenseStr ? String(rawLicenseStr) : ''));
  const safeUrl = typeof rawUrl === 'string' ? rawUrl : '';

  const str = safeLicenseStr.toLowerCase();
  const url = safeUrl.toLowerCase();

  // Public Domain / CC0
  if (
    str.includes('cc0') || 
    str.includes('zero') || 
    str.includes('public domain') || 
    str.includes('pd') ||
    url.includes('publicdomain') ||
    url.includes('zero/1.0')
  ) {
    return {
      type: 'Public Domain / CC0',
      url: rawUrl || 'https://creativecommons.org/publicdomain/zero/1.0/',
      commercialAllowed: true,
      attributionRequired: false,
      modificationAllowed: true,
      verified: true
    };
  }

  // CC BY (Attribution)
  if (str.includes('by-nc-sa') || url.includes('by-nc-sa')) {
    return {
      type: 'Creative Commons BY-NC-SA',
      url: rawUrl || 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
      commercialAllowed: false,
      attributionRequired: true,
      modificationAllowed: true,
      verified: true
    };
  }

  if (str.includes('by-nc') || url.includes('by-nc')) {
    return {
      type: 'Creative Commons BY-NC',
      url: rawUrl || 'https://creativecommons.org/licenses/by-nc/4.0/',
      commercialAllowed: false,
      attributionRequired: true,
      modificationAllowed: true,
      verified: true
    };
  }

  if (str.includes('by-sa') || url.includes('by-sa')) {
    return {
      type: 'Creative Commons BY-SA',
      url: rawUrl || 'https://creativecommons.org/licenses/by-sa/4.0/',
      commercialAllowed: true,
      attributionRequired: true,
      modificationAllowed: true,
      verified: true
    };
  }

  if (str.includes('cc-by') || str.includes('cc by') || url.includes('by/4.0') || url.includes('by/3.0')) {
    return {
      type: 'Creative Commons BY',
      url: rawUrl || 'https://creativecommons.org/licenses/by/4.0/',
      commercialAllowed: true,
      attributionRequired: true,
      modificationAllowed: true,
      verified: true
    };
  }

  // Open Database License (ODbL)
  if (str.includes('odbl') || url.includes('opendatacommons.org')) {
    return {
      type: 'Open Database License (ODbL)',
      url: rawUrl || 'https://opendatacommons.org/licenses/odbl/',
      commercialAllowed: true,
      attributionRequired: true,
      modificationAllowed: true,
      verified: true
    };
  }

  // Open Source Software Licenses
  if (str.includes('mit')) {
    return {
      type: 'MIT License',
      url: rawUrl || 'https://opensource.org/licenses/MIT',
      commercialAllowed: true,
      attributionRequired: true,
      modificationAllowed: true,
      verified: true
    };
  }

  if (str.includes('apache')) {
    return {
      type: 'Apache 2.0',
      url: rawUrl || 'https://opensource.org/licenses/Apache-2.0',
      commercialAllowed: true,
      attributionRequired: true,
      modificationAllowed: true,
      verified: true
    };
  }

  // Open Access (Scientific publications)
  if (str.includes('open access') || str.includes('gold open access') || str.includes('oa')) {
    return {
      type: 'Open Access',
      url: rawUrl || 'https://www.nature.com/openresearch/about-open-access',
      commercialAllowed: true,
      attributionRequired: true,
      modificationAllowed: false,
      verified: true
    };
  }

  // Pexels License
  if (str.includes('pexels')) {
    return {
      type: 'Pexels License (Free commercial use, no attribution required)',
      url: 'https://www.pexels.com/license/',
      commercialAllowed: true,
      attributionRequired: false,
      modificationAllowed: true,
      verified: true
    };
  }

  // Unsplash License
  if (str.includes('unsplash')) {
    return {
      type: 'Unsplash License (Free commercial use, no attribution required)',
      url: 'https://unsplash.com/license',
      commercialAllowed: true,
      attributionRequired: false,
      modificationAllowed: true,
      verified: true
    };
  }

  // If provider has a certified default
  if (providerDefault) {
    return {
      type: providerDefault.type,
      url: rawUrl,
      commercialAllowed: providerDefault.commercialAllowed,
      attributionRequired: providerDefault.attributionRequired,
      verified: true
    };
  }

  return {
    type: rawLicenseStr || 'Unknown / Not specified',
    url: rawUrl,
    commercialAllowed: false,
    attributionRequired: true,
    verified: false
  };
}
