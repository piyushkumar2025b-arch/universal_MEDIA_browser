import { ResourceItem } from '../../src/types/resource';
import { buildResourceItem } from '../normalizer';
import { registerTracker, recordProviderSuccess, recordProviderFailure } from '../telemetry';

const USER_AGENT = 'URMIL-Universal-Browser/1.0 (https://ai.studio; contact: team@urmil.org)';

registerTracker({
  id: 'artic',
  name: 'Art Institute of Chicago',
  category: 'Art',
  rateLimit: '60 req/min (Open Access)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'met_museum',
  name: 'Metropolitan Museum of Art',
  category: 'Art',
  rateLimit: '80 req/sec (Open Access)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'cleveland_art',
  name: 'Cleveland Museum of Art',
  category: 'Art',
  rateLimit: 'Open Access API (CC0)',
  authRequired: false,
  authConfigured: true
});

// 1. Art Institute of Chicago
export async function queryArtic(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = `https://api.artic.edu/api/v1/artworks/search?q=${encodeURIComponent(query)}&query[term][is_public_domain]=true&fields=id,title,artist_display,date_display,medium_display,image_id,thumbnail,department_title&limit=12`;

  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('artic', Date.now() - start);

    const config = data.config || {};
    const iiifUrl = config.iiif_url || 'https://www.artic.edu/iiif/2';

    return (data.data || []).map((art: any) => {
      const title = art.title || 'Masterpiece';
      const lqip = art.thumbnail?.lqip;
      const rawThumb = art.image_id ? `${iiifUrl}/${art.image_id}/full/400,/0/default.jpg` : '';
      const rawPreview = art.image_id ? `${iiifUrl}/${art.image_id}/full/843,/0/default.jpg` : '';
      const rawFull = art.image_id ? `${iiifUrl}/${art.image_id}/full/full/0/default.jpg` : '';

      const thumbUrl = lqip || `/api/image-proxy?url=${encodeURIComponent(rawThumb)}&title=${encodeURIComponent(title)}&category=art`;
      const previewUrl = `/api/image-proxy?url=${encodeURIComponent(rawPreview)}&title=${encodeURIComponent(title)}&category=art`;
      const fullUrl = rawFull ? `/api/image-proxy?url=${encodeURIComponent(rawFull)}&title=${encodeURIComponent(title)}&category=art` : previewUrl;

      return buildResourceItem({
        id: `artic-${art.id}`,
        title,
        category: 'art',
        description: `${art.artist_display || 'Unknown Artist'} • ${art.date_display || ''} • ${art.medium_display || ''}`,
        thumbnailUrl: thumbUrl,
        previewUrl: previewUrl,
        downloadUrl: fullUrl || previewUrl,
        providerId: 'artic',
        providerName: 'Art Institute of Chicago',
        resourceUrl: `https://www.artic.edu/artworks/${art.id}`,
        externalId: String(art.id),
        creatorName: art.artist_display ? art.artist_display.split('\n')[0] : 'Artist',
        rawLicense: 'Creative Commons Zero (CC0 1.0) Public Domain',
        licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
        providerDefaultLicense: {
          type: 'Public Domain / CC0',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'jpg',
          artist: art.artist_display,
          medium: art.medium_display,
          classification: art.department_title,
          quality: '4K',
          lqip,
          tags: ['Art Institute of Chicago', 'Fine Art', art.department_title].filter(Boolean)
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('artic', err.message);
    return [];
  }
}

// 2. Metropolitan Museum of Art (The Met Open Access)
export async function queryMetMuseum(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const searchUrl = `https://collectionapi.metmuseum.org/public/collection/v1/search?q=${encodeURIComponent(query)}&hasImages=true`;

  try {
    const res = await fetch(searchUrl, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const objectIds = (data.objectIDs || []).slice(0, 8);

    if (objectIds.length === 0) return [];

    const items: ResourceItem[] = [];
    // Fetch individual artwork details
    const promises = objectIds.map(async (id: number) => {
      try {
        const itemRes = await fetch(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`, {
          headers: { 'User-Agent': USER_AGENT },
          signal: AbortSignal.timeout(4000)
        });
        if (!itemRes.ok) return null;
        const itemData = await itemRes.json();
        if (!itemData.primaryImageSmall && !itemData.primaryImage) return null;

        return buildResourceItem({
          id: `met-${id}`,
          title: itemData.title || 'Met Museum Artwork',
          category: 'art',
          description: `${itemData.artistDisplayName || 'Unknown Artist'} • ${itemData.objectDate || ''} • ${itemData.medium || ''}`,
          thumbnailUrl: itemData.primaryImageSmall || itemData.primaryImage,
          previewUrl: itemData.primaryImage || itemData.primaryImageSmall,
          downloadUrl: itemData.primaryImage,
          providerId: 'met_museum',
          providerName: 'Metropolitan Museum of Art',
          resourceUrl: itemData.objectURL || `https://www.metmuseum.org/art/collection/search/${id}`,
          externalId: String(id),
          creatorName: itemData.artistDisplayName || 'Artist',
          creatorOrg: itemData.department,
          rawLicense: itemData.isPublicDomain ? 'Creative Commons Zero (CC0 1.0) Public Domain' : 'Open Access The Met',
          licenseUrl: 'https://www.metmuseum.org/about-the-met/policies-and-documents/open-access',
          providerDefaultLicense: {
            type: 'Public Domain / CC0',
            commercialAllowed: true,
            attributionRequired: false
          },
          attributes: {
            format: 'jpg',
            artist: itemData.artistDisplayName,
            medium: itemData.medium,
            culture: itemData.culture,
            classification: itemData.classification,
            quality: '4K',
            tags: [itemData.department, itemData.culture, itemData.classification].filter(Boolean)
          }
        });
      } catch {
        return null;
      }
    });

    const results = await Promise.all(promises);
    for (const r of results) {
      if (r) items.push(r);
    }

    recordProviderSuccess('met_museum', Date.now() - start);
    return items;
  } catch (err: any) {
    recordProviderFailure('met_museum', err.message);
    return [];
  }
}

// 3. Cleveland Museum of Art (Open Access CC0 World Masterpieces)
export async function queryClevelandArt(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = `https://openaccess-api.clevelandart.org/api/artworks/?q=${encodeURIComponent(query)}&has_image=1&limit=25`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('cleveland_art', Date.now() - start);

    const artworks = data.data || [];
    const items: ResourceItem[] = [];

    for (const art of artworks) {
      const webImg = art.images?.web?.url;
      const printImg = art.images?.print?.url || webImg;
      if (!webImg) continue;

      const creator = art.creators?.[0]?.description || 'Master Artist';
      items.push(
        buildResourceItem({
          id: `cleveland-art-${art.id}`,
          title: art.title || 'Masterpiece',
          category: 'art',
          description: `${creator} • ${art.creation_date || ''} • ${art.technique || ''}`,
          thumbnailUrl: webImg,
          previewUrl: webImg,
          downloadUrl: printImg,
          providerId: 'cleveland_art',
          providerName: 'Cleveland Museum of Art',
          resourceUrl: art.url || `https://www.clevelandart.org/art/${art.id}`,
          externalId: String(art.id),
          creatorName: creator,
          rawLicense: 'Creative Commons Zero (CC0 1.0) Public Domain',
          licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
          providerDefaultLicense: {
            type: 'Public Domain / CC0',
            commercialAllowed: true,
            attributionRequired: false
          },
          attributes: {
            format: 'jpg',
            quality: '4K',
            artist: creator,
            medium: art.technique,
            classification: art.department || 'Fine Art',
            tags: ['Cleveland Museum of Art', 'Open Access', 'Fine Art Masterpiece', art.department].filter(Boolean)
          }
        })
      );
    }
    return items;
  } catch (err: any) {
    recordProviderFailure('cleveland_art', err.message);
    return [];
  }
}

