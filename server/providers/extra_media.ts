import { ResourceItem } from '../../src/types/resource';
import { buildResourceItem } from '../normalizer';
import { registerTracker, recordProviderSuccess, recordProviderFailure } from '../telemetry';

const USER_AGENT = 'URMIL-Universal-Browser/1.0 (https://ai.studio; contact: team@urmil.org)';

// Register trackers for all new media providers
registerTracker({
  id: 'archive_3d',
  name: 'Internet Archive 3D Models & Photogrammetry',
  category: '3d',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_tv_commercials',
  name: 'Internet Archive Classic TV Commercials',
  category: 'Videos',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'iconify_vectors',
  name: 'Iconify Global Open Vector Registry',
  category: 'Images',
  rateLimit: 'Public Open Access CDN',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'picsum_photos',
  name: 'Lorem Picsum Curated Photography',
  category: 'Images',
  rateLimit: 'Public Open Access CDN',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_historical_audio',
  name: 'George Blood Great 78 Historical Recordings',
  category: 'Audio',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'radio_browser_live',
  name: 'Radio Browser Global Live Streams',
  category: 'Audio',
  rateLimit: 'Public Community API',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_radio_dramas',
  name: 'Old-Time Radio Dramas & Vintage Theatre',
  category: 'Audio',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'wikimedia_illustrations',
  name: 'Wikimedia Botanical & Scientific Plates',
  category: 'Images',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

/**
 * 1. Open 3D Spatial Models & Photogrammetry (Poly Haven CC0 & Archive 3D)
 */
export async function queryArchive3D(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const cleanQ = (query || '').toLowerCase().trim();

  try {
    // Fetch Poly Haven open CC0 3D model catalog
    const res = await fetch('https://api.polyhaven.com/assets?t=models', {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(4500)
    });

    if (res.ok) {
      const allModels = await res.json();
      const keys = Object.keys(allModels);
      
      // Filter models matching query keywords in name, categories, or tags
      let matchedKeys = keys.filter(k => {
        if (!cleanQ) return true;
        const m = allModels[k];
        const nameMatch = (m.name || '').toLowerCase().includes(cleanQ);
        const catMatch = (m.categories || []).some((c: string) => c.toLowerCase().includes(cleanQ));
        const tagMatch = (m.tags || []).some((t: string) => t.toLowerCase().includes(cleanQ));
        return nameMatch || catMatch || tagMatch;
      });

      if (cleanQ && matchedKeys.length === 0) {
        return [];
      }

      matchedKeys = matchedKeys.slice(0, 16);

      recordProviderSuccess('archive_3d', Date.now() - start);

      return matchedKeys.map((key) => {
        const m = allModels[key];
        const title = m.name ? `${m.name} (3D Model)` : `${key} (3D Asset)`;
        const cats = Array.isArray(m.categories) ? m.categories.join(', ') : '3D Models';
        const polycount = m.polycount ? `${m.polycount.toLocaleString()} polygons` : 'PBR Mesh';
        const previewUrl = `https://cdn.polyhaven.com/asset_img/primary/${key}.png`;
        const itemUrl = `https://polyhaven.com/a/${key}`;

        return buildResourceItem({
          id: `poly3d-${key.toLowerCase()}`,
          title,
          category: '3d',
          description: `CC0 Public Domain 3D spatial asset (${cats}). Mesh density: ${polycount}. Includes PBR textures, GLTF, FBX, and Blender files.`,
          previewUrl,
          downloadUrl: itemUrl,
          providerId: 'archive_3d',
          providerName: 'Poly Haven & Open 3D',
          resourceUrl: itemUrl,
          externalId: key,
          creatorName: m.authors ? Object.keys(m.authors).join(', ') : 'Open 3D Artists',
          rawLicense: 'Creative Commons Zero (CC0) 1.0 Universal',
          licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
          providerDefaultLicense: {
            type: 'Public Domain / CC0',
            commercialAllowed: true,
            attributionRequired: false
          },
          attributes: {
            format: '3D / GLTF / FBX / OBJ',
            polycount: m.polycount,
            categories: m.categories,
            thumbnail: previewUrl,
            interactiveUrl: itemUrl,
            model3D: true
          }
        });
      });
    }
    throw new Error('Poly Haven 3D catalog unavailable');
  } catch (err: any) {
    recordProviderFailure('archive_3d', err.message);
    return [];
  }
}

/**
 * 2. Internet Archive Vintage TV Commercials & Film Ephemera
 */
export async function queryArchiveTvCommercials(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQuery = query.trim();
  const cleanQ = rawQuery || 'vintage';
  const url = `https://archive.org/advancedsearch.php?q=collection:(classic_tv_commercials)+AND+(${encodeURIComponent(cleanQ)})&fl[]=identifier,title,description,year,licenseurl&rows=16&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(4500)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    let docs = data.response?.docs || [];

    if (docs.length === 0) {
      if (rawQuery) {
        return []; // Do not pollute specific search with random commercials
      }
      const fbUrl = `https://archive.org/advancedsearch.php?q=collection:(classic_tv_commercials)&fl[]=identifier,title,description,year&rows=12&output=json`;
      const fbRes = await fetch(fbUrl, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(3500) });
      if (fbRes.ok) {
        const fbData = await fbRes.json();
        docs = fbData.response?.docs || [];
      }
    }

    recordProviderSuccess('archive_tv_commercials', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || 'Classic Television Commercial';
      const desc = doc.description ? String(doc.description).replace(/<[^>]*>?/gm, '').substring(0, 240) + '...' : 'Historic broadcast television commercial preserved in digital archive.';
      const thumb = `https://archive.org/services/img/${id}`;
      const itemUrl = `https://archive.org/details/${id}`;
      const videoStream = `/api/v1/video-stream?iaId=${encodeURIComponent(id)}`;

      return buildResourceItem({
        id: `ia-comm-${id}`,
        title,
        category: 'videos',
        description: desc,
        previewUrl: videoStream,
        thumbnailUrl: thumb,
        downloadUrl: `https://archive.org/details/${id}`,
        providerId: 'archive_tv_commercials',
        providerName: 'Classic TV Commercials Archive',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: 'Historic Television Broadcast',
        rawLicense: 'Public Domain / Historical Broadcast Archive',
        licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'video/mp4',
          streamUrl: videoStream,
          embedUrl: `https://archive.org/embed/${id}`,
          thumbnail: thumb,
          year: doc.year ? parseInt(doc.year, 10) : undefined,
          duration: '30s - 60s'
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_tv_commercials', err.message);
    return [];
  }
}

/**
 * 3. Iconify Global Open Vector Graphics (SVG Media)
 */
export async function queryIconifyVectors(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = query.trim();
  const cleanQ = rawQ || 'media';
  const url = `https://api.iconify.design/search?query=${encodeURIComponent(cleanQ)}&limit=24`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(4000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    let icons: string[] = data.icons || [];

    if (icons.length === 0) {
      if (rawQ) {
        return []; // Do not return random interface icons for unrelated query
      }
      const fbRes = await fetch(`https://api.iconify.design/search?query=interface&limit=16`, {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(3000)
      });
      if (fbRes.ok) {
        const fbData = await fbRes.json();
        icons = fbData.icons || [];
      }
    }

    recordProviderSuccess('iconify_vectors', Date.now() - start);

    return icons.map((iconName) => {
      // icon format: "prefix:name" (e.g. "mdi:rocket")
      const parts = iconName.split(':');
      const prefix = parts[0] || 'icon';
      const name = parts[1] || iconName;
      const formattedTitle = `${name.replace(/[-_]/g, ' ')} (${prefix.toUpperCase()})`;
      const svgUrl = `https://api.iconify.design/${iconName}.svg`;

      return buildResourceItem({
        id: `iconify-${iconName.replace(/[^a-zA-Z0-9]/g, '-')}`,
        title: formattedTitle,
        category: 'images',
        description: `Open-source scalable vector graphic (SVG) from the ${prefix.toUpperCase()} icon collection. Renderable at any scale without loss of resolution.`,
        previewUrl: svgUrl,
        downloadUrl: svgUrl,
        providerId: 'iconify_vectors',
        providerName: 'Iconify Open Vectors',
        resourceUrl: `https://icon-sets.iconify.design/${prefix}/${name}/`,
        externalId: iconName,
        creatorName: `${prefix.toUpperCase()} Open Source Community`,
        rawLicense: 'MIT / Apache 2.0 / CC-BY Open Vector License',
        licenseUrl: 'https://github.com/iconify/icon-sets/blob/master/LICENSE',
        providerDefaultLicense: {
          type: 'Open Source',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'image/svg+xml',
          dimensions: 'Scalable Vector (SVG)',
          vector: true,
          iconCollection: prefix,
          thumbnail: svgUrl
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('iconify_vectors', err.message);
    return [];
  }
}

/**
 * 4. Lorem Picsum Curated Photography
 */
export async function queryPicsumPhotos(query: string): Promise<ResourceItem[]> {
  const rawQ = query.trim().toLowerCase();
  // Only invoke Picsum for relevant photo searches or blank browsing to avoid spamming text queries
  const isPhotoSearch = !rawQ || /photo|picture|wallpaper|nature|landscape|camera|image|portrait|view|city|art|picsum/i.test(rawQ);
  if (!isPhotoSearch) {
    return [];
  }

  const start = Date.now();
  // Generate deterministic page offset based on query string
  let hash = 0;
  for (let i = 0; i < query.length; i++) {
    hash = (hash << 5) - hash + query.charCodeAt(i);
    hash |= 0;
  }
  const page = Math.max(1, (Math.abs(hash) % 15) + 1);
  const url = `https://picsum.photos/v2/list?page=${page}&limit=18`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(4000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const list = await res.json();

    recordProviderSuccess('picsum_photos', Date.now() - start);

    return (Array.isArray(list) ? list : []).map((photo: any) => {
      const id = photo.id;
      const author = photo.author || 'Picsum Photographer';
      const previewUrl = `https://picsum.photos/id/${id}/600/400`;
      const downloadUrl = `https://picsum.photos/id/${id}/2000/1333`;

      return buildResourceItem({
        id: `picsum-${id}`,
        title: `Curated Photo #${id} by ${author}`,
        category: 'images',
        description: `High-resolution fine-art photography captured by ${author}. Curated by the Lorem Picsum photography repository.`,
        previewUrl,
        downloadUrl,
        providerId: 'picsum_photos',
        providerName: 'Picsum Photography',
        resourceUrl: photo.url || `https://picsum.photos/id/${id}/info`,
        externalId: String(id),
        creatorName: author,
        rawLicense: 'Creative Commons Zero / Unsplash Open License',
        licenseUrl: 'https://unsplash.com/license',
        providerDefaultLicense: {
          type: 'Public Domain / CC0',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'image/jpeg',
          dimensions: `${photo.width || 4000} x ${photo.height || 3000}`,
          author: author,
          thumbnail: previewUrl
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('picsum_photos', err.message);
    return [];
  }
}

/**
 * 5. George Blood Great 78 Historical Recordings (Internet Archive)
 */
export async function queryArchiveHistoricalAudio(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = query.trim();
  const cleanQ = rawQ || 'jazz';
  const url = `https://archive.org/advancedsearch.php?q=collection:(georgeblood)+AND+(${encodeURIComponent(cleanQ)})&fl[]=identifier,title,creator,description,year,licenseurl&rows=16&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(4500)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    let docs = data.response?.docs || [];

    if (docs.length === 0) {
      if (rawQ) {
        return []; // Do not return random 78s for unrelated search
      }
      const fbUrl = `https://archive.org/advancedsearch.php?q=collection:(georgeblood)&fl[]=identifier,title,creator,description,year&rows=12&output=json`;
      const fbRes = await fetch(fbUrl, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(3500) });
      if (fbRes.ok) {
        const fbData = await fbRes.json();
        docs = fbData.response?.docs || [];
      }
    }

    recordProviderSuccess('archive_historical_audio', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || 'Historical 78rpm Shellac Recording';
      const creator = Array.isArray(doc.creator) ? doc.creator.join(', ') : (doc.creator || 'Historical Orchestra / Artist');
      const thumb = `https://archive.org/services/img/${id}`;
      const itemUrl = `https://archive.org/details/${id}`;
      const audioStream = `/api/v1/audio-stream?iaId=${encodeURIComponent(id)}`;

      return buildResourceItem({
        id: `ia-blood-${id}`,
        title,
        category: 'audio',
        description: `Preserved historic 78rpm audio disc from the George Blood Audio digitization project. Artist: ${creator}. Year: ${doc.year || 'Historic Era'}.`,
        previewUrl: audioStream,
        thumbnailUrl: thumb,
        downloadUrl: `https://archive.org/details/${id}`,
        providerId: 'archive_historical_audio',
        providerName: 'Great 78 Historical Audio',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: creator,
        rawLicense: 'Public Domain / Non-Commercial Cultural Heritage',
        licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: true
        },
        attributes: {
          format: 'audio/mp3',
          streamUrl: audioStream,
          embedUrl: `https://archive.org/embed/${id}`,
          year: doc.year ? parseInt(doc.year, 10) : undefined,
          medium: '78 RPM Shellac Disc',
          thumbnail: thumb
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_historical_audio', err.message);
    return [];
  }
}

/**
 * 6. Radio Browser Global Live Streams
 */
export async function queryRadioBrowserLive(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = query.trim();
  const cleanQ = rawQ || 'jazz';
  const url = `https://de1.api.radio-browser.info/json/stations/byname/${encodeURIComponent(cleanQ)}?limit=16`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(4500)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    let stations = await res.json();

    if (!Array.isArray(stations) || stations.length === 0) {
      if (rawQ) {
        return []; // Do not return random world stations for specific query miss
      }
      // Fallback to top world stations only on blank search
      const fbRes = await fetch(`https://de1.api.radio-browser.info/json/stations/topclick/12`, {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(3500)
      });
      if (fbRes.ok) {
        stations = await fbRes.json();
      }
    }

    recordProviderSuccess('radio_browser_live', Date.now() - start);

    return (Array.isArray(stations) ? stations : []).slice(0, 16).map((st: any) => {
      const id = st.stationuuid || Math.random().toString(36).substring(7);
      const name = st.name ? st.name.trim() : 'Live Radio Broadcast';
      const streamUrl = st.url_resolved || st.url;
      const favicon = st.favicon || 'https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/radio.svg';
      const country = st.country || 'Global';
      const bitrate = st.bitrate ? `${st.bitrate} kbps` : 'Live Stream';
      const audioStream = `/api/v1/audio-stream?url=${encodeURIComponent(streamUrl)}`;

      return buildResourceItem({
        id: `rb-live-${id}`,
        title: `${name} (${country})`,
        category: 'audio',
        description: `Live streaming internet radio station broadcasting from ${country}. Tags: ${st.tags || 'Music, News, Talk'}. Quality: ${bitrate}.`,
        previewUrl: audioStream,
        thumbnailUrl: favicon,
        downloadUrl: streamUrl,
        providerId: 'radio_browser_live',
        providerName: 'Radio Browser Live Streams',
        resourceUrl: st.homepage || streamUrl,
        externalId: id,
        creatorName: st.country ? `${st.name} • ${st.country}` : name,
        rawLicense: 'Live Internet Radio Broadcast Stream',
        licenseUrl: 'https://www.radio-browser.info/license',
        providerDefaultLicense: {
          type: 'Free to use',
          commercialAllowed: false,
          attributionRequired: true
        },
        attributes: {
          format: 'audio/mpeg',
          streamUrl,
          bitrate,
          country,
          codec: st.codec || 'MP3',
          live: true
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('radio_browser_live', err.message);
    return [];
  }
}

/**
 * 7. Old-Time Radio Dramas & Vintage Theatre
 */
export async function queryArchiveRadioDramas(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = query.trim();
  const cleanQ = rawQ || 'mystery';
  const url = `https://archive.org/advancedsearch.php?q=collection:(oldtimeradio)+AND+(${encodeURIComponent(cleanQ)})&fl[]=identifier,title,description,year,licenseurl&rows=16&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(4500)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    let docs = data.response?.docs || [];

    if (docs.length === 0) {
      if (rawQ) {
        return []; // Do not return random OTR for unrelated search
      }
      const fbUrl = `https://archive.org/advancedsearch.php?q=collection:(oldtimeradio)&fl[]=identifier,title,description,year&rows=12&output=json`;
      const fbRes = await fetch(fbUrl, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(3500) });
      if (fbRes.ok) {
        const fbData = await fbRes.json();
        docs = fbData.response?.docs || [];
      }
    }

    recordProviderSuccess('archive_radio_dramas', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || 'Classic Old-Time Radio Drama';
      const desc = doc.description ? String(doc.description).replace(/<[^>]*>?/gm, '').substring(0, 240) + '...' : 'Authentic Golden Age radio drama recorded during original network broadcast.';
      const thumb = `https://archive.org/services/img/${id}`;
      const itemUrl = `https://archive.org/details/${id}`;
      const audioStream = `/api/v1/audio-stream?iaId=${encodeURIComponent(id)}`;

      return buildResourceItem({
        id: `ia-otr-${id}`,
        title,
        category: 'audio',
        description: desc,
        previewUrl: audioStream,
        thumbnailUrl: thumb,
        downloadUrl: `https://archive.org/details/${id}`,
        providerId: 'archive_radio_dramas',
        providerName: 'Old-Time Radio Dramas',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: 'Golden Age of Radio Broadcast',
        rawLicense: 'Public Domain / Historic Broadcast',
        licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'audio/mp3',
          streamUrl: audioStream,
          embedUrl: `https://archive.org/embed/${id}`,
          year: doc.year ? parseInt(doc.year, 10) : undefined,
          genre: 'Radio Drama / Suspense',
          thumbnail: thumb
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_radio_dramas', err.message);
    return [];
  }
}

/**
 * 8. Wikimedia Botanical & Scientific Illustrations
 */
export async function queryWikimediaIllustrations(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const cleanQ = query.trim() || 'botanical';
  const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=${encodeURIComponent(cleanQ)}+filetype:bitmap&gsrnamespace=6&gsrlimit=16&prop=imageinfo&iiprop=url|size|extmetadata`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(4500)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const pages = data.query?.pages || {};
    const pageKeys = Object.keys(pages);

    if (pageKeys.length === 0) return [];

    recordProviderSuccess('wikimedia_illustrations', Date.now() - start);

    return pageKeys.map((pageId) => {
      const page = pages[pageId];
      const info = page.imageinfo?.[0] || {};
      const meta = info.extmetadata || {};
      const cleanTitle = (page.title || '').replace(/^File:/i, '').replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
      const artist = meta.Artist?.value ? meta.Artist.value.replace(/<[^>]*>?/gm, '').trim() : 'Scientific Illustrator';
      const license = meta.LicenseShortName?.value || 'Public Domain / CC-BY-SA';
      const desc = meta.ImageDescription?.value ? meta.ImageDescription.value.replace(/<[^>]*>?/gm, '').substring(0, 240) + '...' : `High-resolution botanical and scientific plate from Wikimedia Commons.`;

      return buildResourceItem({
        id: `wiki-ill-${pageId}`,
        title: cleanTitle,
        category: 'images',
        description: desc,
        previewUrl: info.url,
        downloadUrl: info.url,
        providerId: 'wikimedia_illustrations',
        providerName: 'Wikimedia Scientific Illustrations',
        resourceUrl: info.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title)}`,
        externalId: String(pageId),
        creatorName: artist,
        rawLicense: license,
        licenseUrl: meta.LicenseUrl?.value || 'https://commons.wikimedia.org/wiki/Commons:Licensing',
        providerDefaultLicense: {
          type: 'Public Domain / CC-BY-SA',
          commercialAllowed: true,
          attributionRequired: true
        },
        attributes: {
          format: 'image/jpeg',
          dimensions: info.width && info.height ? `${info.width} x ${info.height}` : undefined,
          illustrator: artist,
          thumbnail: info.url
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('wikimedia_illustrations', err.message);
    return [];
  }
}
