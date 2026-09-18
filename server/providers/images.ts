import { ResourceItem } from '../../src/types/resource';
import { buildResourceItem } from '../normalizer';
import { registerTracker, recordProviderSuccess, recordProviderFailure } from '../telemetry';
import { getGoogleApiKey, getGoogleSearchEngineId } from '../config/google_keys';

const USER_AGENT = 'URMIL-Universal-Browser/1.0 (https://ai.studio; contact: team@urmil.org)';

// Register image providers
registerTracker({
  id: 'openverse',
  name: 'Openverse',
  category: 'Images',
  rateLimit: '1000 req/hr (Token Required)',
  authRequired: true,
  authConfigured: Boolean(process.env.OPENVERSE_ACCESS_TOKEN)
});

registerTracker({
  id: 'europeana_images',
  name: 'Europeana Cultural Heritage',
  category: 'Images',
  rateLimit: 'Cultural Heritage API (Free Key Required)',
  authRequired: true,
  authConfigured: Boolean(process.env.EUROPEANA_API_KEY)
});

registerTracker({
  id: 'wellcome_images',
  name: 'Wellcome Collection (Art & Science)',
  category: 'Images',
  rateLimit: 'Open Access IIIF (CC0/CC-BY)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'gbif_images',
  name: 'GBIF Biodiversity & Wildlife Imagery',
  category: 'Images',
  rateLimit: 'Global Open Species Imagery',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'dog_ceo',
  name: 'Dog CEO Open Canine Breed Imagery',
  category: 'Images & Animals',
  rateLimit: 'Open Public Dog API (Unlimited)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'wikimedia',
  name: 'Wikimedia Commons',
  category: 'Images',
  rateLimit: '2500 req/hr (MediaWiki API)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'pexels',
  name: 'Pexels',
  category: 'Images',
  rateLimit: '200 req/hr',
  authRequired: true,
  authConfigured: Boolean(process.env.PEXELS_API_KEY)
});

registerTracker({
  id: 'unsplash',
  name: 'Unsplash',
  category: 'Images',
  rateLimit: '50 req/hr (Demo)',
  authRequired: true,
  authConfigured: Boolean(process.env.UNSPLASH_ACCESS_KEY)
});

registerTracker({
  id: 'google_images',
  name: 'Google Custom Search Images',
  category: 'Images',
  rateLimit: 'Custom Search JSON API (searchType=image)',
  authRequired: true,
  authConfigured: Boolean(getGoogleApiKey() && getGoogleSearchEngineId())
});

registerTracker({
  id: 'pixabay',
  name: 'Pixabay',
  category: 'Images',
  rateLimit: '5000 req/hr',
  authRequired: true,
  authConfigured: Boolean(process.env.PIXABAY_API_KEY)
});

registerTracker({
  id: 'nasa',
  name: 'NASA Image & Video Library',
  category: 'Images',
  rateLimit: '1000 req/hr',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'internet_archive_images',
  name: 'Internet Archive Images',
  category: 'Images',
  rateLimit: 'Unlimited Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'inaturalist_images',
  name: 'iNaturalist Wildlife & Nature',
  category: 'Images',
  rateLimit: '60 req/min Open API',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'cleveland_images',
  name: 'Cleveland Museum of Art (CC0)',
  category: 'Images',
  rateLimit: 'Open Access API',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'smk_images',
  name: 'SMK National Gallery (CC0)',
  category: 'Images',
  rateLimit: 'Open Access API (200k+ Works)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'vam_images',
  name: 'Victoria & Albert Museum',
  category: 'Images',
  rateLimit: 'Open Museum API',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'artic_images',
  name: 'Art Institute of Chicago (CC0)',
  category: 'Images',
  rateLimit: 'Open Access IIIF',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'nasa_apod',
  name: 'NASA Astronomy Picture of the Day (APOD)',
  category: 'Images & Science',
  rateLimit: 'Open NASA API (DEMO_KEY / 30-50 req/hr)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'nasa_epic',
  name: 'NASA EPIC Earth Polychromatic Camera',
  category: 'Images & Science',
  rateLimit: 'Open NASA API (DEMO_KEY / 30-50 req/hr)',
  authRequired: false,
  authConfigured: true
});

// 1. Openverse Images
export async function queryOpenverseImages(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=30`;
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };
  if (process.env.OPENVERSE_ACCESS_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.OPENVERSE_ACCESS_TOKEN}`;
  }

  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(1800) });
    if (!res.ok) {
      // Fallback to Wikimedia open images if Openverse has rate limit
      return await queryWikimediaImages(query);
    }
    const data = await res.json();
    recordProviderSuccess('openverse', Date.now() - start);

    return (data.results || []).map((item: any) =>
      buildResourceItem({
        id: `openverse-${item.id}`,
        title: item.title,
        category: 'images',
        description: item.attribution || undefined,
        previewUrl: item.url,
        thumbnailUrl: item.thumbnail,
        downloadUrl: item.url,
        providerId: 'openverse',
        providerName: 'Openverse',
        resourceUrl: item.foreign_landing_url || item.url,
        externalId: item.id,
        creatorName: item.creator,
        creatorProfileUrl: item.creator_url,
        rawLicense: item.license ? `CC ${item.license.toUpperCase()} ${item.license_version || ''}` : undefined,
        licenseUrl: item.license_url,
        attributes: {
          format: item.filetype || 'jpg',
          dimensions: item.width && item.height ? `${item.width}x${item.height}` : undefined,
          quality: item.width && item.width >= 3840 ? '4K' : item.width && item.width >= 1920 ? 'Full HD' : 'HD',
          tags: item.tags?.map((t: any) => t.name) || []
        }
      })
    );
  } catch (err: any) {
    recordProviderFailure('openverse', err.message);
    return await queryWikimediaImages(query);
  }
}

// 2. Wikimedia Commons Images
export async function queryWikimediaImages(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=30&prop=imageinfo&iiprop=url|size|mime|extmetadata|dimensions|thumburl&iiurlwidth=500&format=json&origin=*`;

  try {
    const res = await fetch(searchUrl, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('wikimedia', Date.now() - start);

    const pages = data.query?.pages ? Object.values(data.query.pages) : [];
    const items: ResourceItem[] = [];

    for (const p of pages as any[]) {
      const info = p.imageinfo?.[0];
      if (!info || !info.url) continue;
      const meta = info.extmetadata || {};
      const mime = info.mime || '';
      if (!mime.startsWith('image/')) continue;

      const title = p.title.replace(/^File:/, '').replace(/\.[^/.]+$/, '');
      const width = info.width || 0;
      const height = info.height || 0;

      items.push(
        buildResourceItem({
          id: `wikimedia-${p.pageid}`,
          title,
          category: 'images',
          description: meta.ImageDescription?.value?.replace(/<[^>]+>/g, '') || undefined,
          thumbnailUrl: info.thumburl || info.url,
          previewUrl: info.url,
          downloadUrl: info.url,
          providerId: 'wikimedia',
          providerName: 'Wikimedia Commons',
          resourceUrl: info.descriptionurl || info.url,
          externalId: String(p.pageid),
          creatorName: meta.Artist?.value?.replace(/<[^>]+>/g, '') || undefined,
          rawLicense: meta.LicenseShortName?.value || meta.License?.value || 'Wikimedia Commons Free License',
          licenseUrl: meta.LicenseUrl?.value,
          attributes: {
            format: mime.split('/')[1] || 'jpg',
            dimensions: width && height ? `${width}x${height}` : undefined,
            fileSize: info.size ? `${(info.size / 1024 / 1024).toFixed(2)} MB` : undefined,
            quality: width >= 3840 ? '4K' : width >= 1920 ? 'Full HD' : width >= 1280 ? 'HD' : 'SD'
          }
        })
      );
    }
    return items;
  } catch (err: any) {
    recordProviderFailure('wikimedia', err.message);
    return [];
  }
}

// 3. NASA Image and Video Library (Completely open public domain)
export async function queryNASAImages(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = `https://images-api.nasa.gov/search?q=${encodeURIComponent(query)}&media_type=image&page_size=15`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('nasa', Date.now() - start);

    const items = data.collection?.items || [];
    return items.map((item: any) => {
      const d = item.data?.[0] || {};
      const thumb = item.links?.find((l: any) => l.rel === 'preview')?.href;
      return buildResourceItem({
        id: `nasa-${d.nasa_id || Math.random().toString(36).substring(7)}`,
        title: d.title || 'NASA Mission Imagery',
        category: 'images',
        description: d.description || undefined,
        previewUrl: thumb,
        thumbnailUrl: thumb,
        downloadUrl: thumb,
        providerId: 'nasa',
        providerName: 'NASA Open Archive',
        resourceUrl: `https://images.nasa.gov/details-${d.nasa_id}`,
        externalId: d.nasa_id,
        creatorName: d.center ? `NASA ${d.center}` : 'NASA',
        creatorOrg: 'National Aeronautics and Space Administration',
        rawLicense: 'Public Domain / NASA Open Access',
        licenseUrl: 'https://www.nasa.gov/multimedia/guidelines/index.html',
        providerDefaultLicense: {
          type: 'Public Domain / CC0',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'jpg',
          year: d.date_created ? new Date(d.date_created).getFullYear() : undefined,
          quality: 'Original',
          tags: d.keywords || []
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('nasa', err.message);
    return [];
  }
}

// 4. Pexels Images (Key required)
export async function queryPexelsImages(query: string): Promise<ResourceItem[]> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    return await queryOpenverseImages(query);
  }

  const start = Date.now();
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=15`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: apiKey,
        'User-Agent': USER_AGENT
      },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('pexels', Date.now() - start);

    return (data.photos || []).map((p: any) =>
      buildResourceItem({
        id: `pexels-${p.id}`,
        title: p.alt || `Pexels Photo ${p.id}`,
        category: 'images',
        thumbnailUrl: p.src.medium,
        previewUrl: p.src.large2x || p.src.large,
        downloadUrl: p.src.original,
        providerId: 'pexels',
        providerName: 'Pexels',
        resourceUrl: p.url,
        externalId: String(p.id),
        creatorName: p.photographer,
        creatorProfileUrl: p.photographer_url,
        rawLicense: 'Pexels License (Free commercial use, no attribution required)',
        licenseUrl: 'https://www.pexels.com/license/',
        attributes: {
          format: 'jpg',
          dimensions: `${p.width}x${p.height}`,
          quality: p.width >= 3840 ? '4K' : 'Full HD'
        }
      })
    );
  } catch (err: any) {
    recordProviderFailure('pexels', err.message);
    return await queryOpenverseImages(query);
  }
}

// 5. Unsplash Images (Key required)
export async function queryUnsplashImages(query: string): Promise<ResourceItem[]> {
  const apiKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!apiKey) {
    return await queryOpenverseImages(query);
  }

  const start = Date.now();
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=15`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Client-ID ${apiKey}`,
        'Accept-Version': 'v1',
        'User-Agent': USER_AGENT
      },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('unsplash', Date.now() - start);

    return (data.results || []).map((p: any) =>
      buildResourceItem({
        id: `unsplash-${p.id}`,
        title: p.description || p.alt_description || `Unsplash Photo ${p.id}`,
        category: 'images',
        thumbnailUrl: p.urls.small,
        previewUrl: p.urls.regular,
        downloadUrl: p.urls.full || p.links.download,
        providerId: 'unsplash',
        providerName: 'Unsplash',
        resourceUrl: p.links.html,
        externalId: p.id,
        creatorName: p.user?.name,
        creatorProfileUrl: p.user?.links?.html,
        rawLicense: 'Unsplash License',
        licenseUrl: 'https://unsplash.com/license',
        attributes: {
          format: 'jpg',
          dimensions: `${p.width}x${p.height}`,
          quality: p.width >= 3840 ? '4K' : 'Full HD',
          downloads: p.downloads
        }
      })
    );
  } catch (err: any) {
    recordProviderFailure('unsplash', err.message);
    return await queryOpenverseImages(query);
  }
}

// 6. Pixabay Images (Key required)
export async function queryPixabayImages(query: string): Promise<ResourceItem[]> {
  const apiKey = process.env.PIXABAY_API_KEY;
  if (!apiKey) {
    return await queryOpenverseImages(query);
  }

  const start = Date.now();
  const url = `https://pixabay.com/api/?key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(query)}&image_type=photo&per_page=15`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('pixabay', Date.now() - start);

    return (data.hits || []).map((h: any) =>
      buildResourceItem({
        id: `pixabay-${h.id}`,
        title: h.tags || `Pixabay Image ${h.id}`,
        category: 'images',
        thumbnailUrl: h.webformatURL,
        previewUrl: h.largeImageURL || h.webformatURL,
        downloadUrl: h.largeImageURL,
        providerId: 'pixabay',
        providerName: 'Pixabay',
        resourceUrl: h.pageURL,
        externalId: String(h.id),
        creatorName: h.user,
        creatorProfileUrl: `https://pixabay.com/users/${h.user}-${h.user_id}/`,
        rawLicense: 'Pixabay Content License (Free for commercial use)',
        licenseUrl: 'https://pixabay.com/service/license/',
        attributes: {
          format: 'jpg',
          dimensions: `${h.imageWidth}x${h.imageHeight}`,
          quality: h.imageWidth >= 3840 ? '4K' : 'Full HD',
          downloads: h.downloads,
          tags: h.tags ? h.tags.split(', ') : []
        }
      })
    );
  } catch (err: any) {
    recordProviderFailure('pixabay', err.message);
    return await queryOpenverseImages(query);
  }
}

// 7. Internet Archive Images (Massive open digital heritage)
export async function queryArchiveImages(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const cleanQ = query.replace(/[^\w\s]/g, ' ').trim() || 'history';
  const url = `https://archive.org/advancedsearch.php?q=mediatype:image+AND+(${encodeURIComponent(cleanQ)})&fl[]=identifier,title,creator,description,year,licenseurl&rows=25&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('internet_archive_images', Date.now() - start);

    const docs = data.response?.docs || [];
    return docs.map((doc: any) => {
      const id = doc.identifier;
      const thumb = `https://archive.org/services/img/${id}`;
      return buildResourceItem({
        id: `archive-img-${id}`,
        title: doc.title || `Archive Collection ${id}`,
        category: 'images',
        description: doc.description || undefined,
        previewUrl: thumb,
        thumbnailUrl: thumb,
        downloadUrl: `https://archive.org/download/${id}`,
        providerId: 'internet_archive_images',
        providerName: 'Internet Archive Images',
        resourceUrl: `https://archive.org/details/${id}`,
        externalId: id,
        creatorName: Array.isArray(doc.creator) ? doc.creator.join(', ') : doc.creator || 'Internet Archive Contributor',
        rawLicense: doc.licenseurl ? 'Creative Commons / Public Domain' : 'Open Access Digital Heritage',
        licenseUrl: doc.licenseurl || 'https://archive.org/about/terms.php',
        attributes: {
          format: 'jpg',
          year: doc.year ? Number(doc.year) : undefined,
          quality: 'Original',
          tags: ['Internet Archive', 'Open Heritage', 'Public Domain']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('internet_archive_images', err.message);
    return [];
  }
}

// 8. iNaturalist Wildlife, Plant & Nature Imagery (Real biodiversity research)
export async function queryINaturalistImages(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = `https://api.inaturalist.org/v1/observations?q=${encodeURIComponent(query)}&photos=true&per_page=25&order_by=votes`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('inaturalist_images', Date.now() - start);

    const results = data.results || [];
    const items: ResourceItem[] = [];

    for (const obs of results) {
      const photo = obs.photos?.[0];
      if (!photo || !photo.url) continue;

      // Replace square thumb with high-res medium / large photo
      const highRes = photo.url.replace('/square.', '/large.').replace('/square/', '/large/');
      const mediumThumb = photo.url.replace('/square.', '/medium.').replace('/square/', '/medium/');

      const taxonName = obs.taxon?.preferred_common_name || obs.taxon?.name || obs.species_guess || 'Wildlife Specimen';
      const sciName = obs.taxon?.name;

      items.push(
        buildResourceItem({
          id: `inat-${obs.id}`,
          title: taxonName,
          category: 'images',
          description: `Observed at ${obs.place_guess || 'Global Field Station'} • Taxon: ${sciName || 'Biodiversity'}`,
          thumbnailUrl: mediumThumb,
          previewUrl: highRes,
          downloadUrl: highRes,
          providerId: 'inaturalist_images',
          providerName: 'iNaturalist Research Archive',
          resourceUrl: obs.uri || `https://www.inaturalist.org/observations/${obs.id}`,
          externalId: String(obs.id),
          creatorName: obs.user?.name || obs.user?.login || 'Naturalist Observer',
          creatorProfileUrl: obs.user?.login ? `https://www.inaturalist.org/people/${obs.user.login}` : undefined,
          rawLicense: obs.license_code ? `CC ${obs.license_code.toUpperCase()}` : 'Creative Commons Attribution',
          attributes: {
            format: 'jpg',
            scientificName: sciName,
            region: obs.place_guess || undefined,
            quality: 'Full HD',
            tags: [obs.taxon?.iconic_taxon_name, 'Biodiversity', 'Scientific Field Observation'].filter(Boolean)
          }
        })
      );
    }
    return items;
  } catch (err: any) {
    recordProviderFailure('inaturalist_images', err.message);
    return [];
  }
}

// 9. Cleveland Museum of Art (CC0 Open Access Fine Art & Masterpieces)
export async function queryClevelandImages(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = `https://openaccess-api.clevelandart.org/api/artworks/?q=${encodeURIComponent(query)}&has_image=1&limit=25`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('cleveland_images', Date.now() - start);

    const artworks = data.data || [];
    const items: ResourceItem[] = [];

    for (const art of artworks) {
      const webImg = art.images?.web?.url;
      const printImg = art.images?.print?.url || webImg;
      if (!webImg) continue;

      const creator = art.creators?.[0]?.description || 'Master Artist';
      items.push(
        buildResourceItem({
          id: `cleveland-${art.id}`,
          title: art.title || 'Masterwork Artwork',
          category: 'images',
          description: `${creator} • ${art.creation_date || ''} • ${art.technique || ''}`,
          thumbnailUrl: webImg,
          previewUrl: webImg,
          downloadUrl: printImg,
          providerId: 'cleveland_images',
          providerName: 'Cleveland Museum of Art (CC0)',
          resourceUrl: art.url || `https://www.clevelandart.org/art/${art.id}`,
          externalId: String(art.id),
          creatorName: creator,
          rawLicense: 'Creative Commons Zero (CC0 1.0) Public Domain',
          licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
          attributes: {
            format: 'jpg',
            quality: '4K',
            artist: creator,
            classification: art.department || 'Fine Art',
            tags: ['Cleveland Museum of Art', 'Open Access', 'Fine Art Masterpiece', art.department].filter(Boolean)
          }
        })
      );
    }
    return items;
  } catch (err: any) {
    recordProviderFailure('cleveland_images', err.message);
    return [];
  }
}

// 10. Statens Museum for Kunst (SMK - National Gallery of Denmark CC0 Public Domain)
export async function querySMKImages(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = `https://api.smk.dk/api/v1/art/search/?keys=*&q=${encodeURIComponent(query)}&rows=30&filters=[has_image:true]`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6500)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('smk_images', Date.now() - start);

    const items: ResourceItem[] = [];
    for (const it of (data.items || [])) {
      const thumb = it.image_thumbnail;
      const download = it.image_native || thumb;
      if (!thumb) continue;

      const title = it.titles?.[0]?.title || 'SMK Artwork';
      const artist = it.artist?.[0] || 'Danish / European Master';
      const date = it.production_date?.[0]?.period || '';

      items.push(
        buildResourceItem({
          id: `smk-${it.id || Math.random().toString(36).substring(7)}`,
          title,
          category: 'images',
          description: `${artist} • ${date} • Statens Museum for Kunst National Collection`,
          thumbnailUrl: thumb,
          previewUrl: thumb,
          downloadUrl: download,
          providerId: 'smk_images',
          providerName: 'SMK National Gallery (CC0)',
          resourceUrl: `https://open.smk.dk/en/artwork/image/${it.id}`,
          externalId: it.id,
          creatorName: artist,
          rawLicense: 'Creative Commons Zero (CC0 1.0) Public Domain',
          licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
          attributes: {
            format: 'jpg',
            quality: '4K',
            artist,
            tags: ['SMK', 'Public Domain', 'Museum Collection', 'Fine Art'].filter(Boolean)
          }
        })
      );
    }
    return items;
  } catch (err: any) {
    recordProviderFailure('smk_images', err.message);
    return [];
  }
}

// 11. Victoria and Albert Museum (V&A Collections Open Museum API)
export async function queryVAMImages(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = `https://api.vam.ac.uk/v2/objects/search?q=${encodeURIComponent(query)}&images_exist=1&page_size=30`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6500)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('vam_images', Date.now() - start);

    const items: ResourceItem[] = [];
    for (const rec of (data.records || [])) {
      const imageId = rec._primaryImageId;
      if (!imageId) continue;

      const thumbUrl = `https://framemark.vam.ac.uk/collections/${imageId}/full/!400,400/0/default.jpg`;
      const fullUrl = `https://framemark.vam.ac.uk/collections/${imageId}/full/!1600,1600/0/default.jpg`;
      const title = rec._primaryTitle || rec.objectType || 'V&A Design & Visual Work';
      const maker = rec._primaryMaker?.name || 'V&A Collection';
      const date = rec._primaryDate || '';

      items.push(
        buildResourceItem({
          id: `vam-${rec.systemNumber || imageId}`,
          title,
          category: 'images',
          description: `${maker} • ${date} • Victoria and Albert Museum`,
          thumbnailUrl: thumbUrl,
          previewUrl: thumbUrl,
          downloadUrl: fullUrl,
          providerId: 'vam_images',
          providerName: 'Victoria & Albert Museum',
          resourceUrl: `https://collections.vam.ac.uk/item/${rec.systemNumber}/`,
          externalId: rec.systemNumber || imageId,
          creatorName: maker,
          rawLicense: 'V&A Open Access Terms / Creative Commons',
          licenseUrl: 'https://www.vam.ac.uk/info/terms-and-conditions-of-use',
          attributes: {
            format: 'jpg',
            quality: 'Full HD',
            artist: maker,
            tags: ['Victoria & Albert Museum', 'Design', 'Historic Scans', rec.objectType].filter(Boolean)
          }
        })
      );
    }
    return items;
  } catch (err: any) {
    recordProviderFailure('vam_images', err.message);
    return [];
  }
}

// 12. Art Institute of Chicago Images (CC0 Public Domain IIIF High-Res)
export async function queryArticImages(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = `https://api.artic.edu/api/v1/artworks/search?q=${encodeURIComponent(query)}&query[term][is_public_domain]=true&fields=id,title,artist_display,image_id,thumbnail,date_display,department_title&limit=25`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6500)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('artic_images', Date.now() - start);

    const items: ResourceItem[] = [];
    for (const art of (data.data || [])) {
      if (!art.image_id && !art.thumbnail?.lqip) continue;
      const title = art.title || 'Masterpiece';
      const artist = art.artist_display?.split('\n')[0] || 'Unknown Master';
      const lqip = art.thumbnail?.lqip;
      const rawThumb = art.image_id ? `https://www.artic.edu/iiif/2/${art.image_id}/full/400,/0/default.jpg` : '';
      const rawPreview = art.image_id ? `https://www.artic.edu/iiif/2/${art.image_id}/full/843,/0/default.jpg` : '';
      const rawHighRes = art.image_id ? `https://www.artic.edu/iiif/2/${art.image_id}/full/1686,/0/default.jpg` : '';

      // Route through authentic image URLs, with proxy available on fallback
      const thumbUrl = rawThumb || `/api/image-proxy?url=${encodeURIComponent(rawThumb)}&title=${encodeURIComponent(title)}&category=art`;
      const previewUrl = rawPreview || thumbUrl;
      const highResUrl = rawHighRes || previewUrl;

      items.push(
        buildResourceItem({
          id: `artic-img-${art.id}`,
          title,
          category: 'images',
          description: `${artist} • ${art.date_display || ''} • Art Institute of Chicago`,
          thumbnailUrl: thumbUrl,
          previewUrl: previewUrl,
          downloadUrl: highResUrl,
          providerId: 'artic_images',
          providerName: 'Art Institute of Chicago (CC0)',
          resourceUrl: `https://www.artic.edu/artworks/${art.id}`,
          externalId: String(art.id),
          creatorName: artist,
          rawLicense: 'Creative Commons Zero (CC0 1.0) Public Domain',
          licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
          attributes: {
            format: 'jpg',
            quality: '4K',
            artist,
            lqip,
            tags: ['Art Institute of Chicago', 'CC0 Public Domain', art.department_title].filter(Boolean)
          }
        })
      );
    }
    return items;
  } catch (err: any) {
    recordProviderFailure('artic_images', err.message);
    return [];
  }
}

// 13. Europeana Cultural Heritage (50M+ European cultural & artwork items - Free Key Required)
export async function queryEuropeanaImages(query: string): Promise<ResourceItem[]> {
  const apiKey = process.env.EUROPEANA_API_KEY || 'api2demo';

  const start = Date.now();
  const url = `https://api.europeana.eu/record/v2/search.json?query=${encodeURIComponent(query)}&media=true&thumbnail=true&rows=25&wskey=${encodeURIComponent(apiKey)}`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6500)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('europeana_images', Date.now() - start);

    const items: ResourceItem[] = [];
    for (const item of (data.items || [])) {
      const thumb = item.edmPreview?.[0];
      if (!thumb) continue;

      const title = item.title?.[0] || 'European Cultural Work';
      const provider = item.dataProvider?.[0] || item.provider?.[0] || 'Europeana European Heritage';
      const fullImg = item.edmIsShownBy?.[0] || thumb;
      const rightsUrl = item.rights?.[0] || 'https://creativecommons.org/publicdomain/mark/1.0/';
      const rawLicense = rightsUrl.includes('zero')
        ? 'Creative Commons CC0 1.0 Universal'
        : rightsUrl.includes('by')
        ? 'Creative Commons Attribution (CC-BY)'
        : 'Public Domain Mark / Free Access';

      items.push(
        buildResourceItem({
          id: `europeana-${item.id ? encodeURIComponent(item.id.replace(/\//g, '_')) : Math.random().toString(36).slice(2)}`,
          title,
          category: 'images',
          description: `${provider} • European Cultural Heritage Repository • ${item.year?.[0] || ''}`,
          thumbnailUrl: thumb,
          previewUrl: thumb,
          downloadUrl: fullImg,
          providerId: 'europeana_images',
          providerName: 'Europeana Cultural Heritage',
          resourceUrl: item.guid || `https://www.europeana.eu/item${item.id}`,
          externalId: item.id || '',
          creatorName: item.dcCreator?.[0] || provider,
          creatorOrg: provider,
          rawLicense,
          licenseUrl: rightsUrl,
          attributes: {
            format: 'jpg',
            quality: 'High',
            year: item.year?.[0] ? Number(item.year[0]) : undefined,
            tags: ['Europeana', 'European Heritage', 'Museum Archive', ...(item.edmConceptPrefLabelLangAware?.en || [])].slice(0, 5)
          }
        })
      );
    }
    if (items.length === 0) {
      return await queryArticImages(query);
    }
    return items;
  } catch (err: any) {
    recordProviderFailure('europeana_images', err.message);
    return await queryArticImages(query);
  }
}

// 14. Wellcome Collection (London - Art & Science Open IIIF)
export async function queryWellcomeImages(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = `https://api.wellcomecollection.org/catalogue/v2/images?query=${encodeURIComponent(query)}&pageSize=25`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(4500)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('wellcome_images', Date.now() - start);

    const items: ResourceItem[] = [];
    for (const item of (data.results || [])) {
      const iiifBase = item.thumbnail?.url || item.locations?.[0]?.url;
      if (!iiifBase) continue;

      const thumbUrl = iiifBase.replace('/info.json', '/full/400,/0/default.jpg');
      const previewUrl = iiifBase.replace('/info.json', '/full/800,/0/default.jpg');
      const downloadUrl = iiifBase.replace('/info.json', '/full/1600,/0/default.jpg');
      const title = item.source?.title || 'Historical Science & Medical Archive';
      const licenseInfo = item.thumbnail?.license || item.locations?.[0]?.license;

      items.push(
        buildResourceItem({
          id: `wellcome-img-${item.id}`,
          title,
          category: 'images',
          description: `Wellcome Collection (London) • Science, Medicine & Art Archive`,
          thumbnailUrl: thumbUrl,
          previewUrl: previewUrl,
          downloadUrl: downloadUrl,
          providerId: 'wellcome_images',
          providerName: 'Wellcome Collection (Art & Science)',
          resourceUrl: item.source?.id ? `https://wellcomecollection.org/works/${item.source.id}` : 'https://wellcomecollection.org',
          externalId: item.id,
          creatorName: item.thumbnail?.credit || 'Wellcome Collection',
          creatorOrg: 'Wellcome Collection (London)',
          rawLicense: licenseInfo?.label || 'Public Domain Mark',
          licenseUrl: licenseInfo?.url || 'https://creativecommons.org/publicdomain/mark/1.0/',
          attributes: {
            format: 'jpg',
            quality: '4K',
            tags: ['Wellcome Collection', 'History of Science', 'Medicine & Anatomy', 'IIIF Open Access']
          }
        })
      );
    }
    if (items.length > 0) return items;
    throw new Error('No items returned from Wellcome API');
  } catch (err: any) {
    recordProviderFailure('wellcome_images', err.message);
    // Fallback to Internet Archive Wellcome Library Collection
    try {
      const archiveUrl = `https://archive.org/advancedsearch.php?q=collection:(wellcomelibrary)+AND+(${encodeURIComponent(query)})&fl[]=identifier,title,creator,description,year,licenseurl&sort[]=downloads+desc&rows=15&output=json`;
      const aRes = await fetch(archiveUrl, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(5000) });
      if (aRes.ok) {
        const aData = await aRes.json();
        const docs = aData.response?.docs || [];
        if (docs.length > 0) {
          recordProviderSuccess('wellcome_images', Date.now() - start);
          return docs.map((doc: any) =>
            buildResourceItem({
              id: `wellcome-ia-${doc.identifier}`,
              title: doc.title || 'Wellcome Medical & Science Archive Work',
              category: 'images',
              description: doc.description ? String(doc.description).replace(/<[^>]*>?/gm, '').substring(0, 300) : 'Wellcome Library Collection historical item.',
              thumbnailUrl: `https://archive.org/services/img/${doc.identifier}`,
              previewUrl: `https://archive.org/download/${doc.identifier}/page/cover_medium.jpg`,
              downloadUrl: `https://archive.org/download/${doc.identifier}`,
              providerId: 'wellcome_images',
              providerName: 'Wellcome Collection (Art & Science)',
              resourceUrl: `https://archive.org/details/${doc.identifier}`,
              externalId: doc.identifier,
              creatorName: doc.creator || 'Wellcome Library',
              creatorOrg: 'Wellcome Collection (London)',
              rawLicense: 'Public Domain Mark / Free Open Access',
              licenseUrl: doc.licenseurl || 'https://creativecommons.org/publicdomain/mark/1.0/',
              attributes: {
                format: 'jpg',
                quality: 'High',
                year: doc.year ? Number(doc.year) : undefined,
                tags: ['Wellcome Collection', 'Science History', 'Medical Archive']
              }
            })
          );
        }
      }
    } catch {}
    return await queryArticImages(query);
  }
}

const gbifImagesCache = new Map<string, { timestamp: number; items: ResourceItem[] }>();

// 15. GBIF Biodiversity & Wildlife Imagery (Global occurrence photography)
export async function queryGBIFImages(query: string): Promise<ResourceItem[]> {
  const cacheKey = query.trim().toLowerCase();
  const cached = gbifImagesCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 1000 * 60 * 30) {
    return cached.items;
  }

  const start = Date.now();
  const url = `https://api.gbif.org/v1/occurrence/search?mediaType=StillImage&q=${encodeURIComponent(query)}&limit=25`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(9500)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('gbif_images', Date.now() - start);

    const items: ResourceItem[] = [];
    for (const occ of (data.results || [])) {
      const media = occ.media?.find((m: any) => m.type === 'StillImage' || m.format?.startsWith('image/')) || occ.media?.[0];
      if (!media?.identifier) continue;

      const title = occ.vernacularName 
        ? `${occ.vernacularName} (${occ.scientificName || 'Species'})`
        : occ.scientificName || 'Biodiversity Specimen';
      const author = occ.recordedBy || media.rightsHolder || 'GBIF Researcher';
      const license = occ.license || media.license || 'https://creativecommons.org/licenses/by/4.0/';

      items.push(
        buildResourceItem({
          id: `gbif-occ-${occ.key}`,
          title,
          category: 'images',
          description: `Wild specimen recorded at ${[occ.stateProvince, occ.country].filter(Boolean).join(', ') || 'Global Observation'} • GBIF Global Biodiversity`,
          thumbnailUrl: media.identifier,
          previewUrl: media.identifier,
          downloadUrl: media.identifier,
          providerId: 'gbif_images',
          providerName: 'GBIF Biodiversity & Wildlife Imagery',
          resourceUrl: `https://www.gbif.org/occurrence/${occ.key}`,
          externalId: String(occ.key),
          creatorName: author,
          rawLicense: license.includes('zero') ? 'Creative Commons CC0 1.0 Universal' : 'Creative Commons CC-BY 4.0',
          licenseUrl: license,
          attributes: {
            format: 'jpg',
            quality: 'High',
            region: [occ.stateProvince, occ.country].filter(Boolean).join(', ') || undefined,
            coordinates: (typeof occ.decimalLatitude === 'number' && typeof occ.decimalLongitude === 'number') 
              ? [occ.decimalLatitude, occ.decimalLongitude] 
              : undefined,
            tags: ['GBIF', 'Wildlife Observation', occ.kingdom, occ.class, occ.family].filter(Boolean)
          }
        })
      );
    }
    gbifImagesCache.set(cacheKey, { timestamp: Date.now(), items });
    return items;
  } catch (err: any) {
    recordProviderFailure('gbif_images', err.message);
    return [];
  }
}

// 12. NASA Astronomy Picture of the Day (APOD)
export async function queryNasaApod(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const apiKey = process.env.NASA_API_KEY || 'DEMO_KEY';
  const url = `https://api.nasa.gov/planetary/apod?api_key=${apiKey}&count=8`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('nasa_apod', Date.now() - start);

    const items = Array.isArray(data) ? data : [data];
    return items
      .filter((item: any) => item.media_type === 'image' && (item.hdurl || item.url))
      .map((item: any) => {
        const imageUrl = item.hdurl || item.url;
        const copyright = item.copyright ? item.copyright.trim().replace(/\n/g, ' ') : 'NASA / Public Domain';

        return buildResourceItem({
          id: `nasa-apod-${item.date || Math.random().toString(36).substring(7)}`,
          title: `${item.title || 'Astronomy Picture of the Day'} (${item.date || 'NASA'})`,
          category: 'images',
          description: item.explanation ? item.explanation.substring(0, 300) + '...' : 'NASA Astronomy Picture of the Day scientific image.',
          thumbnailUrl: item.url,
          previewUrl: imageUrl,
          downloadUrl: imageUrl,
          providerId: 'nasa_apod',
          providerName: 'NASA Astronomy Picture of the Day',
          resourceUrl: `https://apod.nasa.gov/apod/ap${(item.date || '').replace(/-/g, '').substring(2)}.html`,
          externalId: item.date,
          creatorName: copyright,
          creatorOrg: 'NASA Jet Propulsion Laboratory / GSFC',
          rawLicense: 'Public Domain / NASA Scientific Imagery',
          licenseUrl: 'https://www.nasa.gov/multimedia/guidelines/index.html',
          providerDefaultLicense: {
            type: 'Public Domain / CC0',
            commercialAllowed: true,
            attributionRequired: false
          },
          attributes: {
            format: 'jpg',
            quality: 'Ultra HD Scientific Imagery',
            year: item.date ? parseInt(item.date.substring(0, 4), 10) : undefined,
            tags: ['NASA', 'APOD', 'Astronomy', 'Space Science', 'Cosmos']
          }
        });
      });
  } catch (err: any) {
    recordProviderFailure('nasa_apod', err.message);
    return [];
  }
}

// 13. NASA EPIC (Earth Polychromatic Imaging Camera onboard NOAA DSCOVR)
export async function queryNasaEpic(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const apiKey = process.env.NASA_API_KEY || 'DEMO_KEY';
  const url = `https://api.nasa.gov/EPIC/api/natural?api_key=${apiKey}`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const items = await res.json();
    recordProviderSuccess('nasa_epic', Date.now() - start);

    if (!Array.isArray(items)) return [];

    return items.slice(0, 8).map((item: any) => {
      // Date format is "YYYY-MM-DD HH:MM:SS"
      const dateStr = item.date || '2026-09-06 00:00:00';
      const [datePart] = dateStr.split(' ');
      const [year, month, day] = datePart.split('-');
      const imageName = item.image;
      const pngUrl = `https://epic.gsfc.nasa.gov/archive/natural/${year}/${month}/${day}/png/${imageName}.png`;
      const thumbUrl = `https://epic.gsfc.nasa.gov/archive/natural/${year}/${month}/${day}/thumbs/${imageName}.jpg`;
      const coords = item.centroid_coordinates || {};

      return buildResourceItem({
        id: `nasa-epic-${item.identifier}`,
        title: `Planet Earth from Deep Space (${datePart})`,
        category: 'images',
        description: `Full-disc true color photograph of Earth taken from 1,000,000 miles away by NASA's Earth Polychromatic Imaging Camera (EPIC) onboard NOAA DSCOVR spacecraft. Centroid: Lat ${coords.lat?.toFixed(2) ?? '0'}°, Lon ${coords.lon?.toFixed(2) ?? '0'}°.`,
        thumbnailUrl: thumbUrl,
        previewUrl: pngUrl,
        downloadUrl: pngUrl,
        providerId: 'nasa_epic',
        providerName: 'NASA EPIC Earth Camera',
        resourceUrl: `https://epic.gsfc.nasa.gov/`,
        externalId: item.identifier,
        creatorName: "NASA Goddard Space Flight Center & NOAA",
        creatorOrg: 'NASA / NOAA DSCOVR Mission',
        rawLicense: 'Public Domain / NASA Scientific Imagery',
        licenseUrl: 'https://www.nasa.gov/multimedia/guidelines/index.html',
        providerDefaultLicense: {
          type: 'Public Domain / CC0',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'png',
          quality: 'Full-Disc Planetary View',
          coordinates: coords.lat && coords.lon ? [coords.lat, coords.lon] : undefined,
          year: year ? parseInt(year, 10) : undefined,
          tags: ['NASA', 'EPIC', 'Planet Earth', 'DSCOVR', 'Deep Space', 'NOAA']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('nasa_epic', err.message);
    return [];
  }
}

// 18. Google Custom Search (Image Search)
export async function queryGoogleImages(query: string): Promise<ResourceItem[]> {
  const apiKey = getGoogleApiKey();
  const cx = getGoogleSearchEngineId();

  if (!apiKey || !cx) {
    return await queryOpenverseImages(query);
  }

  const start = Date.now();
  const cleanQ = query.trim() || 'nature photography';
  const url = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(apiKey)}&cx=${encodeURIComponent(cx)}&q=${encodeURIComponent(cleanQ)}&searchType=image&num=10`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(7500)
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}: ${errText.substring(0, 150)}`);
    }

    const data = await res.json();
    recordProviderSuccess('google_images', Date.now() - start);

    const items = data.items || [];
    return items.map((item: any, idx: number) => {
      const title = item.title || 'Google Image Result';
      const directImageUrl = item.link || '';
      const contextPageUrl = item.image?.contextLink || directImageUrl;
      const thumb = item.image?.thumbnailLink || directImageUrl;
      const width = item.image?.width;
      const height = item.image?.height;

      return buildResourceItem({
        id: `google-img-${Buffer.from(directImageUrl || `${idx}-${Date.now()}`).toString('base64url').substring(0, 24)}`,
        title,
        category: 'images',
        description: item.snippet || `Image from ${item.displayLink || 'web source'}`,
        thumbnailUrl: thumb,
        previewUrl: directImageUrl,
        downloadUrl: directImageUrl,
        providerId: 'google_images',
        providerName: 'Google Image Search',
        resourceUrl: contextPageUrl,
        externalId: directImageUrl,
        creatorName: item.displayLink || 'Web Image Creator',
        creatorOrg: 'Google Custom Search Index',
        rawLicense: 'Web Image (Refer to source publisher website)',
        licenseUrl: contextPageUrl,
        providerDefaultLicense: {
          type: 'Web Standard',
          commercialAllowed: false,
          attributionRequired: true
        },
        attributes: {
          format: item.fileFormat || 'image/jpeg',
          dimensions: width && height ? `${width}x${height}` : undefined,
          quality: width && width >= 1920 ? 'Full HD' : width && width >= 1280 ? 'HD' : 'Standard',
          tags: ['Google Images', item.displayLink].filter(Boolean)
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('google_images', err.message);
    return await queryOpenverseImages(query);
  }
}

/**
 * Dog CEO - Open Canine Breed Photography & Identification Registry
 */
export async function queryDogCeoImages(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const q = query.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  // If query specifies a breed, check if we can query by breed, else random images
  const url = q ? `https://dog.ceo/api/breed/${encodeURIComponent(q)}/images/random/12` : 'https://dog.ceo/api/breeds/image/random/12';

  try {
    let res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6000)
    });

    // If specific breed not found, fallback to random
    if (!res.ok) {
      res = await fetch('https://dog.ceo/api/breeds/image/random/12', {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(6000)
      });
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('dog_ceo', Date.now() - start);

    const images: string[] = Array.isArray(data.message) ? data.message : [];
    return images.map((imgUrl: string, idx: number) => {
      // Extract breed from URL (e.g. /breeds/hound-afghan/...)
      const match = imgUrl.match(/breeds\/([^/]+)/);
      const rawBreed = match ? match[1].replace(/-/g, ' ') : 'Canine Companion';
      const formattedBreed = rawBreed
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

      const title = `${formattedBreed} (Dog Breed Photography #${idx + 1})`;
      const thumb = `/api/image-proxy?url=${encodeURIComponent(imgUrl)}&title=${encodeURIComponent(title)}&category=images`;

      return buildResourceItem({
        id: `dogceo-${Buffer.from(imgUrl).toString('base64url').substring(0, 20)}`,
        title,
        category: 'images',
        description: `Open high-resolution photography of ${formattedBreed}. Curated by the Dog CEO canine breed open repository.`,
        thumbnailUrl: thumb,
        previewUrl: imgUrl,
        downloadUrl: imgUrl,
        providerId: 'dog_ceo',
        providerName: 'Dog CEO Canine Archive',
        resourceUrl: imgUrl,
        externalId: imgUrl,
        creatorName: 'Dog CEO Community',
        creatorOrg: 'The Dog API / Stanford Dogs Dataset',
        rawLicense: 'Creative Commons / Public Domain Dedicated',
        licenseUrl: 'https://dog.ceo/dog-api/documentation',
        providerDefaultLicense: {
          type: 'Public Domain / CC',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'image/jpeg',
          quality: 'High Resolution Photo',
          tags: ['Dog', 'Canine', formattedBreed, 'Animals', 'Pets', 'Photography']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('dog_ceo', err.message);
    return [];
  }
}

