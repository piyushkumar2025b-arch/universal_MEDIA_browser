import { ResourceItem } from '../../src/types/resource';
import { buildResourceItem } from '../normalizer';
import { registerTracker, recordProviderSuccess, recordProviderFailure } from '../telemetry';

const USER_AGENT = 'URMIL-Universal-Browser/1.0 (https://ai.studio; contact: team@urmil.org)';

// 1. Register trackers for all new open repository providers
registerTracker({
  id: 'smithsonian_open_access',
  name: 'Smithsonian Institution Open Access Collections',
  category: 'Art',
  rateLimit: 'Public Open Access (CC0)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_newsreels',
  name: 'Universal Newsreels Historic Archive (1929-1967)',
  category: 'Videos',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_silent_films',
  name: 'Silent Films Classic Cinema Collection',
  category: 'Videos',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_computer_chronicles',
  name: 'Computer Chronicles & Tech Revolution Television',
  category: 'Videos',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'free_music_archive',
  name: 'Free Music Archive & Curated CC Independent Music',
  category: 'Audio',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_pulp_scifi',
  name: 'Vintage Pulp Magazines & Sci-Fi Archives',
  category: 'Books',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_historic_maps',
  name: 'USGS Historical Topographic & Antique Maps',
  category: 'Maps',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_arcade_games',
  name: 'Internet Arcade Classic Coin-Op Software',
  category: 'Games',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'pub_dev',
  name: 'Dart & Flutter pub.dev Open Registry',
  category: 'Code',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_animation_classics',
  name: 'Classic Animation & Golden Age Cartoons',
  category: 'Videos',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

/**
 * 1. Smithsonian Institution Open Access Collections (CC0 Artworks, Artifacts & Photography)
 */
export async function querySmithsonianOpenAccess(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQuery = (query || '').trim();
  const cleanQ = rawQuery || 'art';
  const apiKey = process.env.SMITHSONIAN_API_KEY || 'DEMO_KEY';
  const url = `https://api.si.edu/openaccess/api/v1.0/search?api_key=${encodeURIComponent(apiKey)}&q=online_visual_material:true+AND+(${encodeURIComponent(cleanQ)})&rows=24`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(4800)
    });

    if (!res.ok) {
      if (res.status === 429) {
        recordProviderFailure('smithsonian_open_access', 'Upstream Rate Limit Exceeded (429)');
        return [];
      }
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    if (data.error?.code === 'OVER_RATE_LIMIT') {
      recordProviderFailure('smithsonian_open_access', 'Demo Key Rate Limit Exceeded');
      return [];
    }
    const rows = data.response?.rows || [];

    // Filter to rows that actually contain accessible online media images
    const itemsWithImages = rows.filter((r: any) => {
      const mediaList = r.content?.descriptiveNonRepeating?.online_media?.media;
      return Array.isArray(mediaList) && mediaList.length > 0 && (mediaList[0].content || mediaList[0].thumbnail);
    });

    if (rawQuery && itemsWithImages.length === 0) {
      return [];
    }

    recordProviderSuccess('smithsonian_open_access', Date.now() - start);

    return itemsWithImages.slice(0, 16).map((row: any) => {
      const id = row.id || `si-${Math.random().toString(36).substring(2, 9)}`;
      const title = row.title || 'Smithsonian Artifact';
      const descObj = row.content?.freetext?.notes?.find((n: any) => n.label === 'Description') ||
                     row.content?.freetext?.notes?.[0];
      const desc = descObj?.content || `Preserved in Smithsonian collection (${row.unitCode || 'SI'}).`;
      const media = row.content?.descriptiveNonRepeating?.online_media?.media?.[0] || {};
      const previewUrl = media.content || media.thumbnail;
      const recordLink = row.content?.descriptiveNonRepeating?.record_link || `https://www.si.edu/object/${encodeURIComponent(id)}`;
      const creatorObj = row.content?.freetext?.name?.find((n: any) => n.label === 'Artist' || n.label === 'Creator') ||
                        row.content?.freetext?.name?.[0];
      const creator = creatorObj?.content || 'Smithsonian Institution';

      const highRes = media.resources?.find((r: any) => r.label && r.label.toLowerCase().includes('high-resolution') && r.url)?.url;

      return buildResourceItem({
        id: `si-${id.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}`,
        title,
        category: 'art',
        description: desc,
        thumbnailUrl: media.thumbnail || previewUrl,
        previewUrl,
        downloadUrl: highRes || previewUrl || recordLink,
        providerId: 'smithsonian_open_access',
        providerName: `Smithsonian (${row.unitCode || 'Open Access'})`,
        resourceUrl: recordLink,
        externalId: id,
        creatorName: creator,
        rawLicense: 'Creative Commons Zero (CC0) 1.0 Universal',
        licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
        providerDefaultLicense: {
          type: 'Public Domain / CC0',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          museum: 'Smithsonian Institution',
          unitCode: row.unitCode,
          medium: row.content?.freetext?.physicalDescription?.[0]?.content,
          date: row.content?.freetext?.date?.[0]?.content,
          dimensions: media.resources?.[0]?.dimensions || 'Museum Scan',
          thumbnail: previewUrl
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('smithsonian_open_access', err.message);
    return [];
  }
}

/**
 * 2. Universal Newsreels Historic Archive (1929-1967)
 */
export async function queryUniversalNewsreels(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQuery = (query || '').trim();
  const cleanQ = rawQuery || 'newsreel';
  const url = `https://archive.org/advancedsearch.php?q=collection:(universal_newsreels)+AND+(${encodeURIComponent(cleanQ)})&fl[]=identifier,title,description,year,licenseurl&rows=16&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(4500)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    let docs = data.response?.docs || [];

    if (docs.length === 0) {
      if (rawQuery) return [];
      const fbUrl = `https://archive.org/advancedsearch.php?q=collection:(universal_newsreels)&fl[]=identifier,title,description,year&rows=12&output=json`;
      const fbRes = await fetch(fbUrl, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(3500) });
      if (fbRes.ok) {
        const fbData = await fbRes.json();
        docs = fbData.response?.docs || [];
      }
    }

    recordProviderSuccess('archive_newsreels', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || 'Universal Newsreel Broadcast';
      const desc = doc.description 
        ? String(doc.description).replace(/<[^>]*>?/gm, '').substring(0, 240) + '...'
        : 'Universal Newsreel historic archival broadcast preserved in the public domain.';
      const thumb = `https://archive.org/services/img/${id}`;
      const itemUrl = `https://archive.org/details/${id}`;
      const videoStream = `/api/v1/video-stream?iaId=${encodeURIComponent(id)}`;

      return buildResourceItem({
        id: `newsreel-${id.toLowerCase()}`,
        title,
        category: 'videos',
        description: desc,
        thumbnailUrl: thumb,
        previewUrl: videoStream,
        downloadUrl: itemUrl,
        providerId: 'archive_newsreels',
        providerName: 'Universal Newsreels Archive',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: 'Universal Pictures Newsreel Division',
        rawLicense: 'Public Domain Mark 1.0',
        licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          year: doc.year,
          format: 'Historic Video / MP4',
          collection: 'Universal Newsreels (1929-1967)',
          streamingProxyUrl: videoStream,
          thumbnail: thumb
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_newsreels', err.message);
    return [];
  }
}

/**
 * 3. Silent Films Classic Cinema Collection
 */
export async function querySilentFilms(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQuery = (query || '').trim();
  const cleanQ = rawQuery || 'cinema';
  const url = `https://archive.org/advancedsearch.php?q=collection:(silent_films)+AND+(${encodeURIComponent(cleanQ)})&fl[]=identifier,title,description,year,creator,licenseurl&rows=16&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(4500)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    let docs = data.response?.docs || [];

    if (docs.length === 0) {
      if (rawQuery) return [];
      const fbUrl = `https://archive.org/advancedsearch.php?q=collection:(silent_films)&fl[]=identifier,title,description,year,creator&rows=12&output=json`;
      const fbRes = await fetch(fbUrl, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(3500) });
      if (fbRes.ok) {
        const fbData = await fbRes.json();
        docs = fbData.response?.docs || [];
      }
    }

    recordProviderSuccess('archive_silent_films', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || 'Silent Era Motion Picture';
      const desc = doc.description 
        ? String(doc.description).replace(/<[^>]*>?/gm, '').substring(0, 240) + '...'
        : 'Historic silent era cinematic masterpiece preserved in the public domain.';
      const thumb = `https://archive.org/services/img/${id}`;
      const itemUrl = `https://archive.org/details/${id}`;
      const videoStream = `/api/v1/video-stream?iaId=${encodeURIComponent(id)}`;

      return buildResourceItem({
        id: `silent-${id.toLowerCase()}`,
        title,
        category: 'videos',
        description: desc,
        thumbnailUrl: thumb,
        previewUrl: videoStream,
        downloadUrl: itemUrl,
        providerId: 'archive_silent_films',
        providerName: 'Silent Film Heritage Collection',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: doc.creator || 'Classic Cinema Pioneers',
        rawLicense: 'Public Domain Mark 1.0',
        licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          year: doc.year,
          format: 'Silent Feature / MP4',
          collection: 'Silent Films Archive',
          streamingProxyUrl: videoStream,
          thumbnail: thumb
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_silent_films', err.message);
    return [];
  }
}

/**
 * 4. Computer Chronicles & Tech Revolution Television
 */
export async function queryComputerChronicles(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQuery = (query || '').trim();
  const cleanQ = rawQuery || 'computer';
  const url = `https://archive.org/advancedsearch.php?q=collection:(computerchronicles)+AND+(${encodeURIComponent(cleanQ)})&fl[]=identifier,title,description,year,licenseurl&rows=16&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(4500)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    let docs = data.response?.docs || [];

    if (docs.length === 0) {
      if (rawQuery) return [];
      const fbUrl = `https://archive.org/advancedsearch.php?q=collection:(computerchronicles)&fl[]=identifier,title,description,year&rows=12&output=json`;
      const fbRes = await fetch(fbUrl, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(3500) });
      if (fbRes.ok) {
        const fbData = await fbRes.json();
        docs = fbData.response?.docs || [];
      }
    }

    recordProviderSuccess('archive_computer_chronicles', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || 'Computer Chronicles Broadcast';
      const desc = doc.description 
        ? String(doc.description).replace(/<[^>]*>?/gm, '').substring(0, 240) + '...'
        : 'Legendary PBS series documenting the personal computer revolution from 1983 to 2002.';
      const thumb = `https://archive.org/services/img/${id}`;
      const itemUrl = `https://archive.org/details/${id}`;
      const videoStream = `/api/v1/video-stream?iaId=${encodeURIComponent(id)}`;

      return buildResourceItem({
        id: `compchron-${id.toLowerCase()}`,
        title,
        category: 'videos',
        description: desc,
        thumbnailUrl: thumb,
        previewUrl: videoStream,
        downloadUrl: itemUrl,
        providerId: 'archive_computer_chronicles',
        providerName: 'Computer Chronicles Broadcasts',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: 'Stewart Cheifet & KCSM-TV',
        rawLicense: 'Creative Commons Attribution-NonCommercial-NoDerivs 3.0',
        licenseUrl: 'https://creativecommons.org/licenses/by-nc-nd/3.0/',
        providerDefaultLicense: {
          type: 'Creative Commons CC-BY-NC-ND',
          commercialAllowed: false,
          attributionRequired: true
        },
        attributes: {
          year: doc.year,
          format: 'Broadcast Television / MP4',
          collection: 'Computer Chronicles',
          streamingProxyUrl: videoStream,
          thumbnail: thumb
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_computer_chronicles', err.message);
    return [];
  }
}

/**
 * 5. Free Music Archive (FMA) & Curated CC Independent Music
 */
export async function queryFreeMusicArchive(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQuery = (query || '').trim();
  const cleanQ = rawQuery || 'music';
  const url = `https://archive.org/advancedsearch.php?q=collection:(freemusicarchive)+AND+(${encodeURIComponent(cleanQ)})&fl[]=identifier,title,creator,description,year,licenseurl&rows=16&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(4500)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    let docs = data.response?.docs || [];

    if (docs.length === 0) {
      if (rawQuery) return [];
      const fbUrl = `https://archive.org/advancedsearch.php?q=collection:(freemusicarchive)&fl[]=identifier,title,creator,year&rows=12&output=json`;
      const fbRes = await fetch(fbUrl, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(3500) });
      if (fbRes.ok) {
        const fbData = await fbRes.json();
        docs = fbData.response?.docs || [];
      }
    }

    recordProviderSuccess('free_music_archive', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || 'Independent Music Recording';
      const creator = doc.creator || 'Free Music Archive Artist';
      const desc = doc.description 
        ? String(doc.description).replace(/<[^>]*>?/gm, '').substring(0, 240) + '...'
        : `Original independent recording by ${creator} published under Creative Commons on Free Music Archive.`;
      const thumb = `https://archive.org/services/img/${id}`;
      const itemUrl = `https://archive.org/details/${id}`;
      const audioStream = `/api/v1/audio-stream?iaId=${encodeURIComponent(id)}`;

      return buildResourceItem({
        id: `fma-${id.toLowerCase()}`,
        title,
        category: 'music',
        description: desc,
        thumbnailUrl: thumb,
        previewUrl: audioStream,
        downloadUrl: itemUrl,
        providerId: 'free_music_archive',
        providerName: 'Free Music Archive (FMA)',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: creator,
        rawLicense: doc.licenseurl || 'Creative Commons Attribution',
        licenseUrl: doc.licenseurl || 'https://creativecommons.org/licenses/by/4.0/',
        providerDefaultLicense: {
          type: 'Creative Commons (CC-BY)',
          commercialAllowed: true,
          attributionRequired: true
        },
        attributes: {
          year: doc.year,
          format: 'Audio / MP3',
          collection: 'Free Music Archive',
          streamingProxyUrl: audioStream,
          thumbnail: thumb
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('free_music_archive', err.message);
    return [];
  }
}

/**
 * 6. Vintage Pulp Magazines & Sci-Fi Archives
 */
export async function queryPulpSciFi(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQuery = (query || '').trim();
  const cleanQ = rawQuery || 'stories';
  const url = `https://archive.org/advancedsearch.php?q=collection:(pulpmagazinearchive)+AND+(${encodeURIComponent(cleanQ)})&fl[]=identifier,title,date,year,description,licenseurl&rows=16&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(4500)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    let docs = data.response?.docs || [];

    if (docs.length === 0) {
      if (rawQuery) return [];
      const fbUrl = `https://archive.org/advancedsearch.php?q=collection:(pulpmagazinearchive)&fl[]=identifier,title,date,year&rows=12&output=json`;
      const fbRes = await fetch(fbUrl, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(3500) });
      if (fbRes.ok) {
        const fbData = await fbRes.json();
        docs = fbData.response?.docs || [];
      }
    }

    recordProviderSuccess('archive_pulp_scifi', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || 'Classic Pulp Magazine';
      const desc = doc.description 
        ? String(doc.description).replace(/<[^>]*>?/gm, '').substring(0, 240) + '...'
        : 'Golden Age speculative science fiction, fantasy, or adventure pulp magazine preserving mid-20th-century popular literature.';
      const thumb = `https://archive.org/services/img/${id}`;
      const itemUrl = `https://archive.org/details/${id}`;

      return buildResourceItem({
        id: `pulp-${id.toLowerCase()}`,
        title,
        category: 'books',
        description: desc,
        thumbnailUrl: thumb,
        previewUrl: thumb,
        downloadUrl: itemUrl,
        providerId: 'archive_pulp_scifi',
        providerName: 'Pulp Magazine & Sci-Fi Archive',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: 'Pulp Magazine Publishers',
        rawLicense: 'Public Domain Mark 1.0',
        licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          date: doc.date || doc.year,
          format: 'Magazine / PDF Scan',
          collection: 'Pulp Magazine Archive',
          readerUrl: itemUrl,
          thumbnail: thumb
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_pulp_scifi', err.message);
    return [];
  }
}

/**
 * 7. USGS Historical Topographic & Antique Maps
 */
export async function queryHistoricUSGSMaps(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQuery = (query || '').trim();
  const cleanQ = rawQuery || 'survey';
  const url = `https://archive.org/advancedsearch.php?q=collection:(maps_usgs)+AND+(${encodeURIComponent(cleanQ)})&fl[]=identifier,title,date,year,description&rows=16&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(4500)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    let docs = data.response?.docs || [];

    if (docs.length === 0) {
      if (rawQuery) return [];
      const fbUrl = `https://archive.org/advancedsearch.php?q=collection:(maps_usgs)&fl[]=identifier,title,date,year&rows=12&output=json`;
      const fbRes = await fetch(fbUrl, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(3500) });
      if (fbRes.ok) {
        const fbData = await fbRes.json();
        docs = fbData.response?.docs || [];
      }
    }

    recordProviderSuccess('archive_historic_maps', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || 'Historical Topographic Map';
      const desc = doc.description 
        ? String(doc.description).replace(/<[^>]*>?/gm, '').substring(0, 240) + '...'
        : 'Official United States Geological Survey historical topographic quadrangle map scan in the public domain.';
      const thumb = `https://archive.org/services/img/${id}`;
      const itemUrl = `https://archive.org/details/${id}`;

      return buildResourceItem({
        id: `usgsmap-${id.toLowerCase()}`,
        title,
        category: 'maps',
        description: desc,
        thumbnailUrl: thumb,
        previewUrl: thumb,
        downloadUrl: itemUrl,
        providerId: 'archive_historic_maps',
        providerName: 'USGS Historical Cartography',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: 'U.S. Geological Survey (USGS)',
        rawLicense: 'Public Domain (US Government Work)',
        licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          date: doc.date || doc.year,
          format: 'Topographic Map / GeoTIFF',
          collection: 'USGS Historic Maps',
          mapViewerUrl: itemUrl,
          thumbnail: thumb
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_historic_maps', err.message);
    return [];
  }
}

/**
 * 8. Internet Arcade Classic Coin-Op Software
 */
export async function queryInternetArcade(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQuery = (query || '').trim();
  const cleanQ = rawQuery || 'arcade';
  const url = `https://archive.org/advancedsearch.php?q=collection:(internetarcade)+AND+(${encodeURIComponent(cleanQ)})&fl[]=identifier,title,description,year&rows=16&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(4500)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    let docs = data.response?.docs || [];

    if (docs.length === 0) {
      if (rawQuery) return [];
      const fbUrl = `https://archive.org/advancedsearch.php?q=collection:(internetarcade)&fl[]=identifier,title,year&rows=12&output=json`;
      const fbRes = await fetch(fbUrl, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(3500) });
      if (fbRes.ok) {
        const fbData = await fbRes.json();
        docs = fbData.response?.docs || [];
      }
    }

    recordProviderSuccess('archive_arcade_games', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || 'Classic Arcade Machine';
      const desc = doc.description 
        ? String(doc.description).replace(/<[^>]*>?/gm, '').substring(0, 240) + '...'
        : 'Coin-operated video arcade machine game preserved for cultural software preservation with JSMAME emulator.';
      const thumb = `https://archive.org/services/img/${id}`;
      const itemUrl = `https://archive.org/details/${id}`;

      return buildResourceItem({
        id: `arcade-${id.toLowerCase()}`,
        title,
        category: 'games',
        description: desc,
        thumbnailUrl: thumb,
        previewUrl: thumb,
        downloadUrl: itemUrl,
        providerId: 'archive_arcade_games',
        providerName: 'Internet Arcade Preservation',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: 'Arcade Software Pioneers',
        rawLicense: 'Software Preservation / Historical Archive',
        licenseUrl: 'https://archive.org/about/terms.php',
        providerDefaultLicense: {
          type: 'Historical Software Preservation',
          commercialAllowed: false,
          attributionRequired: true
        },
        attributes: {
          year: doc.year,
          format: 'Coin-Op Arcade / JSMAME Browser Play',
          collection: 'Internet Arcade',
          playableUrl: itemUrl,
          thumbnail: thumb
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_arcade_games', err.message);
    return [];
  }
}

/**
 * 9. Dart & Flutter pub.dev Open Registry
 */
export async function queryPubDev(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQuery = (query || '').trim();
  const cleanQ = rawQuery || 'flutter';
  const url = `https://pub.dev/api/search?q=${encodeURIComponent(cleanQ)}`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(4500)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const packages: Array<{ package: string }> = Array.isArray(data.packages) ? data.packages.slice(0, 14) : [];

    if (packages.length === 0) return [];

    // Fetch details for the first 8 packages concurrently to get descriptions & versions
    const details = await Promise.allSettled(
      packages.slice(0, 8).map(async (pkg) => {
        try {
          const pRes = await fetch(`https://pub.dev/api/packages/${encodeURIComponent(pkg.package)}`, {
            headers: { 'User-Agent': USER_AGENT },
            signal: AbortSignal.timeout(3000)
          });
          if (pRes.ok) {
            const pData = await pRes.json();
            return {
              name: pkg.package,
              version: pData.latest?.version,
              description: pData.latest?.pubspec?.description,
              homepage: pData.latest?.pubspec?.homepage || pData.latest?.pubspec?.repository,
              publisher: pData.latest?.pubspec?.author || 'Dart / Flutter Community'
            };
          }
        } catch {}
        return {
          name: pkg.package,
          version: 'latest',
          description: `Open-source Dart & Flutter package published on pub.dev.`,
          homepage: `https://pub.dev/packages/${pkg.package}`,
          publisher: 'Dart Community'
        };
      })
    );

    recordProviderSuccess('pub_dev', Date.now() - start);

    return details.map((result, idx) => {
      const p = result.status === 'fulfilled' ? result.value : {
        name: packages[idx].package,
        version: 'latest',
        description: 'Open-source package on pub.dev',
        homepage: `https://pub.dev/packages/${packages[idx].package}`,
        publisher: 'Dart / Flutter Community'
      };

      const itemUrl = `https://pub.dev/packages/${p.name}`;

      return buildResourceItem({
        id: `pub-${p.name.toLowerCase()}`,
        title: `${p.name} (v${p.version || 'latest'})`,
        category: 'code',
        description: p.description || `Dart & Flutter package ${p.name} available on pub.dev with cross-platform support.`,
        thumbnailUrl: 'https://pub.dev/static/hash-6029384/img/pub-dev-icon-cover-image.png',
        previewUrl: p.homepage || itemUrl,
        downloadUrl: itemUrl,
        providerId: 'pub_dev',
        providerName: 'pub.dev Dart & Flutter Registry',
        resourceUrl: itemUrl,
        externalId: p.name,
        creatorName: p.publisher,
        rawLicense: 'Open Source (BSD / MIT / Apache 2.0)',
        licenseUrl: 'https://opensource.org/licenses',
        providerDefaultLicense: {
          type: 'Open Source License',
          commercialAllowed: true,
          attributionRequired: true
        },
        attributes: {
          version: p.version,
          format: 'Dart / Flutter Package',
          repository: p.homepage,
          packageUrl: itemUrl
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('pub_dev', err.message);
    return [];
  }
}

/**
 * 10. Classic Animation & Golden Age Cartoons
 */
export async function queryClassicAnimation(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQuery = (query || '').trim();
  const cleanQ = rawQuery || 'cartoon';
  const url = `https://archive.org/advancedsearch.php?q=collection:(animationandcartoons)+AND+(${encodeURIComponent(cleanQ)})&fl[]=identifier,title,description,year,licenseurl&rows=16&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(4500)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    let docs = data.response?.docs || [];

    if (docs.length === 0) {
      if (rawQuery) return [];
      const fbUrl = `https://archive.org/advancedsearch.php?q=collection:(animationandcartoons)&fl[]=identifier,title,year&rows=12&output=json`;
      const fbRes = await fetch(fbUrl, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(3500) });
      if (fbRes.ok) {
        const fbData = await fbRes.json();
        docs = fbData.response?.docs || [];
      }
    }

    recordProviderSuccess('archive_animation_classics', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || 'Classic Animation Short';
      const desc = doc.description 
        ? String(doc.description).replace(/<[^>]*>?/gm, '').substring(0, 240) + '...'
        : 'Golden Age classic animation and vintage cartoon preserved in the public domain.';
      const thumb = `https://archive.org/services/img/${id}`;
      const itemUrl = `https://archive.org/details/${id}`;
      const videoStream = `/api/v1/video-stream?iaId=${encodeURIComponent(id)}`;

      return buildResourceItem({
        id: `anim-${id.toLowerCase()}`,
        title,
        category: 'videos',
        description: desc,
        thumbnailUrl: thumb,
        previewUrl: videoStream,
        downloadUrl: itemUrl,
        providerId: 'archive_animation_classics',
        providerName: 'Classic Cartoons & Animation Archive',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: 'Golden Age Animation Studios',
        rawLicense: 'Public Domain Mark 1.0',
        licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          year: doc.year,
          format: 'Classic Cartoon / MP4',
          collection: 'Animation and Cartoons',
          streamingProxyUrl: videoStream,
          thumbnail: thumb
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_animation_classics', err.message);
    return [];
  }
}
