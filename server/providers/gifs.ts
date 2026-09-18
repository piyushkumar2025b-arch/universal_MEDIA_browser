import { ResourceItem } from '../../src/types/resource';
import { buildResourceItem } from '../normalizer';
import { registerTracker, recordProviderSuccess, recordProviderFailure } from '../telemetry';

const USER_AGENT = 'URMIL-Universal-Browser/1.0 (https://ai.studio; contact: team@urmil.org)';

registerTracker({
  id: 'giphy',
  name: 'GIPHY',
  category: 'GIFs',
  rateLimit: '1000 req/day',
  authRequired: true,
  authConfigured: Boolean(process.env.GIPHY_API_KEY)
});

registerTracker({
  id: 'tenor',
  name: 'Google Tenor',
  category: 'GIFs',
  rateLimit: 'Standard / Key',
  authRequired: true,
  authConfigured: Boolean(process.env.TENOR_API_KEY)
});

registerTracker({
  id: 'wikimedia_gifs',
  name: 'Wikimedia Commons Animated GIFs',
  category: 'GIFs',
  rateLimit: '2500 req/hr',
  authRequired: false,
  authConfigured: true
});

// 1. GIPHY
export async function queryGiphy(query: string): Promise<ResourceItem[]> {
  const apiKey = process.env.GIPHY_API_KEY;
  if (!apiKey) {
    return await queryWikimediaGifs(query);
  }

  const start = Date.now();
  const url = `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(query)}&limit=15&rating=g`;

  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('giphy', Date.now() - start);

    const items = (data.data || []).map((g: any) =>
      buildResourceItem({
        id: `giphy-${g.id}`,
        title: g.title || `GIF ${g.id}`,
        category: 'gifs',
        thumbnailUrl: g.images?.fixed_width?.url || g.images?.original?.url,
        previewUrl: g.images?.original?.url,
        downloadUrl: g.images?.original?.url,
        providerId: 'giphy',
        providerName: 'GIPHY',
        resourceUrl: g.url,
        externalId: g.id,
        creatorName: g.username || 'GIPHY Creator',
        creatorProfileUrl: g.user?.profile_url,
        rawLicense: 'GIPHY Terms of Service (Free personal & embedding use)',
        licenseUrl: 'https://giphy.com/terms',
        attributes: {
          format: 'gif',
          dimensions: `${g.images?.original?.width}x${g.images?.original?.height}`,
          quality: 'Original'
        }
      })
    );
    if (items.length > 0) return items;
    return await queryWikimediaGifs(query);
  } catch (err: any) {
    recordProviderFailure('giphy', err.message);
    return await queryWikimediaGifs(query);
  }
}

// 2. Tenor (Key required)
export async function queryTenor(query: string): Promise<ResourceItem[]> {
  const apiKey = process.env.TENOR_API_KEY;
  if (!apiKey) {
    return await queryWikimediaGifs(query);
  }

  const start = Date.now();
  const url = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${apiKey}&limit=15`;

  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('tenor', Date.now() - start);

    const items = (data.results || []).map((g: any) => {
      const media = g.media_formats?.gif || g.media_formats?.tinygif;
      return buildResourceItem({
        id: `tenor-${g.id}`,
        title: g.content_description || `Tenor Animation ${g.id}`,
        category: 'gifs',
        thumbnailUrl: g.media_formats?.nanogif?.url || media?.url,
        previewUrl: media?.url,
        downloadUrl: media?.url,
        providerId: 'tenor',
        providerName: 'Google Tenor',
        resourceUrl: g.itemurl,
        externalId: g.id,
        rawLicense: 'Tenor API Terms of Use',
        licenseUrl: 'https://tenor.com/legal-terms',
        attributes: {
          format: 'gif',
          dimensions: media?.dims ? `${media.dims[0]}x${media.dims[1]}` : undefined,
          quality: 'Original',
          tags: g.tags || []
        }
      });
    });
    if (items.length > 0) return items;
    return await queryWikimediaGifs(query);
  } catch (err: any) {
    recordProviderFailure('tenor', err.message);
    return await queryWikimediaGifs(query);
  }
}

// 3. Wikimedia Commons Animated GIFs (Open & free)
export async function queryWikimediaGifs(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query + ' filetype:bitmap filemime:image/gif')}&gsrnamespace=6&gsrlimit=15&prop=imageinfo&iiprop=url|size|mime|extmetadata|dimensions&format=json&origin=*`;

  try {
    const res = await fetch(searchUrl, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('wikimedia_gifs', Date.now() - start);

    const pages = data.query?.pages ? Object.values(data.query.pages) : [];
    const items: ResourceItem[] = [];

    for (const p of pages as any[]) {
      const info = p.imageinfo?.[0];
      if (!info || !info.url) continue;
      const meta = info.extmetadata || {};
      const mime = info.mime || '';
      if (!mime.includes('gif')) continue;

      const title = p.title.replace(/^File:/, '').replace(/\.[^/.]+$/, '');
      items.push(
        buildResourceItem({
          id: `wikimedia-gif-${p.pageid}`,
          title,
          category: 'gifs',
          description: meta.ImageDescription?.value?.replace(/<[^>]+>/g, '') || undefined,
          thumbnailUrl: info.thumburl || info.url,
          previewUrl: info.url,
          downloadUrl: info.url,
          providerId: 'wikimedia',
          providerName: 'Wikimedia Commons Animation',
          resourceUrl: info.descriptionurl || info.url,
          externalId: String(p.pageid),
          creatorName: meta.Artist?.value?.replace(/<[^>]+>/g, '') || undefined,
          rawLicense: meta.LicenseShortName?.value || 'Wikimedia Open License',
          licenseUrl: meta.LicenseUrl?.value,
          attributes: {
            format: 'gif',
            dimensions: info.width && info.height ? `${info.width}x${info.height}` : undefined,
            fileSize: info.size ? `${(info.size / 1024 / 1024).toFixed(2)} MB` : undefined,
            quality: 'Original'
          }
        })
      );
    }
    return items;
  } catch (err: any) {
    recordProviderFailure('wikimedia_gifs', err.message);
    return [];
  }
}
