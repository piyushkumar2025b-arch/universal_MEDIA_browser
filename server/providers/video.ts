import { ResourceItem } from '../../src/types/resource';
import { buildResourceItem } from '../normalizer';
import { registerTracker, recordProviderSuccess, recordProviderFailure } from '../telemetry';
import { getYouTubeApiKey } from '../config/google_keys';

const USER_AGENT = 'URMIL-Universal-Browser/1.0 (https://ai.studio; contact: team@urmil.org)';

registerTracker({
  id: 'pexels_video',
  name: 'Pexels Video',
  category: 'Video',
  rateLimit: '200 req/hr',
  authRequired: true,
  authConfigured: Boolean(process.env.PEXELS_API_KEY)
});

registerTracker({
  id: 'wikimedia_video',
  name: 'Wikimedia Commons Video',
  category: 'Video',
  rateLimit: '2500 req/hr',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'pixabay_video',
  name: 'Pixabay Video',
  category: 'Video',
  rateLimit: '5000 req/hr',
  authRequired: true,
  authConfigured: Boolean(process.env.PIXABAY_API_KEY)
});

registerTracker({
  id: 'internet_archive_video',
  name: 'Internet Archive Moving Images',
  category: 'Video',
  rateLimit: 'Unlimited / Polite',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'nasa_video',
  name: 'NASA Video Library (Public Domain)',
  category: 'Video',
  rateLimit: '1000 req/hr Open API',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'peertube_video',
  name: 'PeerTube Federated Open Video',
  category: 'Video',
  rateLimit: 'Federated Open Search (No Key Required)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'tvmaze_video',
  name: 'TVMaze Open Media & Television Directory',
  category: 'Video',
  rateLimit: 'Unlimited / Open Community API',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_feature_films',
  name: 'Internet Archive Public Domain Feature Films',
  category: 'Video',
  rateLimit: 'Polite Open Search (Thousands of Classic Cinema Titles)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_prelinger',
  name: 'Prelinger Archives (Historical Cinema & Americana)',
  category: 'Video & History',
  rateLimit: 'Polite Open Search (60,000+ Historic Films)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_cartoons',
  name: 'Internet Archive Classic Animation & Cartoons',
  category: 'Video & Animation',
  rateLimit: 'Polite Open Search (Public Domain Vintage Shorts)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'youtube_video',
  name: 'YouTube Open Video',
  category: 'Video',
  rateLimit: 'Open Search & YouTube v3 (Millions of Videos)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'dailymotion_video',
  name: 'Dailymotion Video Directory',
  category: 'Video',
  rateLimit: 'Open Public API (Millions of Videos)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'vimeo_video',
  name: 'Vimeo Open Video & Staff Picks',
  category: 'Video',
  rateLimit: 'Open Channel & Video API',
  authRequired: false,
  authConfigured: true
});

// 1. Pexels Videos
export async function queryPexelsVideos(query: string): Promise<ResourceItem[]> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    return await queryWikimediaVideos(query);
  }

  const start = Date.now();
  const url = `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=12`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: apiKey, 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('pexels_video', Date.now() - start);

    return (data.videos || []).map((v: any) => {
      const bestFile = v.video_files?.find((f: any) => f.quality === 'hd') || v.video_files?.[0];
      return buildResourceItem({
        id: `pexels-vid-${v.id}`,
        title: `Pexels Footage #${v.id}`,
        category: 'videos',
        thumbnailUrl: v.image,
        previewUrl: bestFile?.link || v.image,
        downloadUrl: bestFile?.link,
        providerId: 'pexels',
        providerName: 'Pexels Video',
        resourceUrl: v.url,
        externalId: String(v.id),
        creatorName: v.user?.name,
        creatorProfileUrl: v.user?.url,
        rawLicense: 'Pexels License (Free commercial use)',
        licenseUrl: 'https://www.pexels.com/license/',
        attributes: {
          format: 'mp4',
          duration: `${v.duration}s`,
          dimensions: bestFile ? `${bestFile.width}x${bestFile.height}` : undefined,
          quality: bestFile && bestFile.width >= 3840 ? '4K' : bestFile && bestFile.width >= 1920 ? 'Full HD' : 'HD'
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('pexels_video', err.message);
    return await queryWikimediaVideos(query);
  }
}

// 1b. Pixabay Videos
export async function queryPixabayVideos(query: string): Promise<ResourceItem[]> {
  const apiKey = process.env.PIXABAY_API_KEY;
  if (!apiKey) {
    return await queryWikimediaVideos(query);
  }

  const start = Date.now();
  const url = `https://pixabay.com/api/videos/?key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(query)}&per_page=12`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('pixabay_video', Date.now() - start);

    return (data.hits || []).map((h: any) => {
      const best = h.videos?.large || h.videos?.medium || h.videos?.small || h.videos?.tiny;
      return buildResourceItem({
        id: `pixabay-vid-${h.id}`,
        title: h.tags ? `Pixabay Video: ${h.tags}` : `Pixabay Footage #${h.id}`,
        category: 'videos',
        thumbnailUrl: h.picture_id ? `https://i.vimeocdn.com/video/${h.picture_id}_640x360.jpg` : (best?.url || ''),
        previewUrl: best?.url,
        downloadUrl: best?.url,
        providerId: 'pixabay_video',
        providerName: 'Pixabay Video',
        resourceUrl: h.pageURL,
        externalId: String(h.id),
        creatorName: h.user,
        creatorProfileUrl: `https://pixabay.com/users/${h.user}-${h.user_id}/`,
        rawLicense: 'Pixabay Content License (Free for commercial use)',
        licenseUrl: 'https://pixabay.com/service/license/',
        attributes: {
          format: 'mp4',
          duration: `${h.duration}s`,
          dimensions: best ? `${best.width}x${best.height}` : undefined,
          quality: best && best.width >= 3840 ? '4K' : best && best.width >= 1920 ? 'Full HD' : 'HD'
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('pixabay_video', err.message);
    return await queryWikimediaVideos(query);
  }
}

// 2. Wikimedia Commons Videos
export async function queryWikimediaVideos(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query + ' filetype:video')}&gsrnamespace=6&gsrlimit=12&prop=imageinfo&iiprop=url|size|mime|extmetadata|dimensions|thumburl&iiurlwidth=500&format=json&origin=*`;

  try {
    const res = await fetch(searchUrl, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('wikimedia_video', Date.now() - start);

    const pages = data.query?.pages ? Object.values(data.query.pages) : [];
    const items: ResourceItem[] = [];

    for (const p of pages as any[]) {
      const info = p.imageinfo?.[0];
      if (!info || !info.url) continue;
      const meta = info.extmetadata || {};
      const mime = info.mime || '';
      if (!mime.startsWith('video/') && !mime.includes('ogg') && !mime.includes('webm')) continue;

      const title = p.title.replace(/^File:/, '').replace(/\.[^/.]+$/, '');
      items.push(
        buildResourceItem({
          id: `wikimedia-vid-${p.pageid}`,
          title,
          category: 'videos',
          description: meta.ImageDescription?.value?.replace(/<[^>]+>/g, '') || undefined,
          thumbnailUrl: info.thumburl,
          previewUrl: info.url,
          downloadUrl: info.url,
          providerId: 'wikimedia',
          providerName: 'Wikimedia Commons Video',
          resourceUrl: info.descriptionurl || info.url,
          externalId: String(p.pageid),
          creatorName: meta.Artist?.value?.replace(/<[^>]+>/g, '') || undefined,
          rawLicense: meta.LicenseShortName?.value || 'Wikimedia Open License',
          licenseUrl: meta.LicenseUrl?.value,
          attributes: {
            format: mime.split('/')[1] || 'webm',
            dimensions: info.width && info.height ? `${info.width}x${info.height}` : undefined,
            quality: info.width && info.width >= 1920 ? 'Full HD' : 'HD'
          }
        })
      );
    }
    return items;
  } catch (err: any) {
    recordProviderFailure('wikimedia_video', err.message);
    return [];
  }
}

// 3. Internet Archive Moving Images
export async function queryArchiveVideos(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}+AND+mediatype:movies&fl[]=identifier,title,creator,description,year,licenseurl&sort[]=downloads+desc&rows=12&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('internet_archive_video', Date.now() - start);

    const docs = data.response?.docs || [];
    return docs.map((doc: any) =>
      buildResourceItem({
        id: `ia-vid-${doc.identifier}`,
        title: doc.title || 'Archived Motion Picture',
        category: 'videos',
        description: doc.description || undefined,
        previewUrl: `/api/v1/video-stream?iaId=${encodeURIComponent(doc.identifier)}`,
        thumbnailUrl: `https://archive.org/services/img/${doc.identifier}`,
        downloadUrl: `https://archive.org/details/${doc.identifier}`,
        providerId: 'internet_archive',
        providerName: 'Internet Archive',
        resourceUrl: `https://archive.org/details/${doc.identifier}`,
        externalId: doc.identifier,
        creatorName: doc.creator || 'Internet Archive Contributor',
        rawLicense: doc.licenseurl ? 'Creative Commons / Public Domain' : 'Public Archive Access',
        licenseUrl: doc.licenseurl || 'https://archive.org/about/terms.php',
        attributes: {
          format: 'mp4',
          year: doc.year ? Number(doc.year) : undefined,
          quality: 'Original Archival Stream',
          embedUrl: `https://archive.org/embed/${doc.identifier}`
        }
      })
    );
  } catch (err: any) {
    recordProviderFailure('internet_archive_video', err.message);
    return [];
  }
}

// 4. NASA Video Library (Public Domain Exploration, Missions, Planetology)
export async function queryNASAVideos(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = `https://images-api.nasa.gov/search?q=${encodeURIComponent(query)}&media_type=video&page_size=15`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('nasa_video', Date.now() - start);

    const items = data.collection?.items || [];
    return items.map((item: any) => {
      const dataObj = item.data?.[0] || {};
      const thumb = item.links?.find((l: any) => l.rel === 'preview')?.href || item.links?.[0]?.href;
      const collectionHref = item.href;
      const nasaId = dataObj.nasa_id || Math.random().toString(36).substring(7);
      const videoMp4 = thumb ? thumb.replace(/~thumb.*\.jpg$/, '~orig.mp4').replace(/^http:/, 'https:') : undefined;

      return buildResourceItem({
        id: `nasa-vid-${nasaId}`,
        title: dataObj.title || 'NASA Video Footage',
        category: 'videos',
        description: dataObj.description || undefined,
        thumbnailUrl: thumb,
        previewUrl: videoMp4 || thumb,
        downloadUrl: videoMp4 || collectionHref || thumb,
        providerId: 'nasa_video',
        providerName: 'NASA Video Library (Public Domain)',
        resourceUrl: `https://images.nasa.gov/details/${encodeURIComponent(nasaId)}`,
        externalId: nasaId,
        creatorName: dataObj.secondary_creator || dataObj.center || 'NASA',
        rawLicense: 'Public Domain / NASA Open Access',
        licenseUrl: 'https://www.nasa.gov/multimedia/guidelines/index.html',
        attributes: {
          format: 'mp4',
          quality: 'Full HD',
          year: dataObj.date_created ? new Date(dataObj.date_created).getFullYear() : undefined,
          tags: dataObj.keywords || ['NASA', 'Space Exploration', 'Public Domain Video']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('nasa_video', err.message);
    return [];
  }
}

// 5. PeerTube Federated Open Video Network (Decentralized Open Source Video)
export async function queryPeerTubeVideos(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = `https://search.joinpeertube.org/api/v1/search/videos?search=${encodeURIComponent(query)}&count=15&sort=-match`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6500)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('peertube_video', Date.now() - start);

    const items = data.data || [];
    return items.map((v: any) => {
      const vid = v.uuid || v.shortUUID || String(v.id || Math.random().toString(36).substring(7));
      const watchUrl = v.url || `https://search.joinpeertube.org/videos/watch/${vid}`;
      const embedUrl = v.embedPath ? `https://search.joinpeertube.org${v.embedPath}` : watchUrl.replace('/videos/watch/', '/videos/embed/');
      const thumb = v.thumbnailUrl || v.previewUrl;
      const creator = v.channel?.displayName || v.account?.displayName || v.account?.name || 'PeerTube Creator';
      const licenseLabel = v.licence?.label && v.licence.label !== 'Unknown' ? v.licence.label : 'Creative Commons / Open Federated Media';

      return buildResourceItem({
        id: `peertube-${vid}`,
        title: v.name || 'PeerTube Open Video',
        category: 'videos',
        description: v.description || (v.tags?.length ? `Tags: ${v.tags.join(', ')}` : undefined),
        thumbnailUrl: thumb,
        previewUrl: embedUrl || thumb,
        downloadUrl: watchUrl,
        providerId: 'peertube_video',
        providerName: 'PeerTube Federated Open Video',
        resourceUrl: watchUrl,
        externalId: vid,
        creatorName: creator,
        creatorOrg: v.channel?.name || 'PeerTube Network',
        rawLicense: licenseLabel,
        licenseUrl: 'https://joinpeertube.org',
        attributes: {
          format: 'mp4/webm',
          quality: 'HD / Federated',
          embedUrl,
          duration: v.duration ? `${Math.floor(v.duration / 60)}m ${v.duration % 60}s` : undefined,
          year: v.publishedAt ? new Date(v.publishedAt).getFullYear() : undefined,
          tags: Array.isArray(v.tags) ? v.tags.slice(0, 5) : ['PeerTube', 'Fediverse', 'Open Video']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('peertube_video', err.message);
    return [];
  }
}

// 6. TVMaze Open Media, Television & Episodic Broadcast Directory
export async function queryTVMazeVideos(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('tvmaze_video', Date.now() - start);

    if (!Array.isArray(data)) return [];

    return data.slice(0, 15).map((entry: any) => {
      const show = entry.show || {};
      const id = String(show.id || Math.random().toString(36).substring(7));
      const title = show.name || 'Television Production';
      const cleanSummary = (show.summary || '')
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .trim();
      const poster = show.image?.original || show.image?.medium;
      const premiereYear = show.premiered ? new Date(show.premiered).getFullYear() : undefined;
      const genres = Array.isArray(show.genres) ? show.genres : [];
      const network = show.network?.name || show.webChannel?.name || 'Broadcaster';
      const pageUrl = show.officialSite || show.url || `https://www.tvmaze.com/shows/${id}`;

      return buildResourceItem({
        id: `tvmaze-${id}`,
        title,
        category: 'videos',
        description: cleanSummary || `Television broadcast by ${network}. Genres: ${genres.join(', ') || 'General'}. Status: ${show.status || 'Archived'}.`,
        thumbnailUrl: poster,
        previewUrl: poster,
        downloadUrl: pageUrl,
        providerId: 'tvmaze_video',
        providerName: 'TVMaze Open Broadcast Directory',
        resourceUrl: pageUrl,
        externalId: id,
        creatorName: network,
        creatorOrg: show.webChannel?.name || show.network?.name || 'Television Network',
        rawLicense: 'Public Television Metadata & Ephemera',
        licenseUrl: 'https://www.tvmaze.com/api',
        attributes: {
          format: 'broadcast/video',
          quality: show.rating?.average ? `Rating: ${show.rating.average}/10` : 'Broadcast Video',
          duration: show.averageRuntime ? `${show.averageRuntime} mins/ep` : undefined,
          year: premiereYear,
          tags: ['Television', 'Video', ...genres]
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('tvmaze_video', err.message);
    return [];
  }
}

// 7. Internet Archive Classic Feature Films (Public Domain & Creative Commons)
export async function queryArchiveFeatureFilms(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const clean = query.trim();
  const searchUrl = `https://archive.org/advancedsearch.php?q=collection:(feature_films)%20AND%20(${encodeURIComponent(clean || 'classic')})&fl[]=identifier,title,creator,date,year,description,downloads&sort[]=downloads%20desc&rows=12&page=1&output=json`;

  try {
    const res = await fetch(searchUrl, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6500)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('archive_feature_films', Date.now() - start);

    const docs = data.response?.docs || [];
    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || 'Classic Feature Film';
      const director = doc.creator || 'Classic Cinema Director';
      const year = doc.year || (doc.date ? doc.date.substring(0, 4) : undefined);
      const resourceUrl = `https://archive.org/details/${id}`;
      const streamUrl = `/api/v1/video-stream?iaId=${encodeURIComponent(id)}`;
      const poster = `https://archive.org/services/img/${id}`;

      return buildResourceItem({
        id: `film-${id}`,
        title,
        category: 'videos',
        description: doc.description ? (typeof doc.description === 'string' ? doc.description.substring(0, 260) + '...' : 'Public domain classic feature film.') : `Classic cinema feature film directed by ${director} (${year || 'Historic'}).`,
        thumbnailUrl: poster,
        previewUrl: streamUrl,
        downloadUrl: `https://archive.org/details/${id}`,
        providerId: 'archive_feature_films',
        providerName: 'Archive Classic Films',
        resourceUrl,
        externalId: id,
        creatorName: director,
        rawLicense: 'Public Domain / Open Access Motion Picture',
        licenseUrl: 'https://archive.org/details/feature_films',
        attributes: {
          format: 'mp4',
          quality: 'Full-Length Feature Film',
          embedUrl: `https://archive.org/embed/${id}`,
          year: year ? parseInt(String(year), 10) : undefined,
          tags: ['Cinema', 'Feature Film', 'Public Domain', director].filter(Boolean)
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_feature_films', err.message);
    return [];
  }
}

// 8. Prelinger Archives (Ephemeral & Historical Americana)
export async function queryPrelingerVideos(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const clean = query.trim() || 'history';
  const url = `https://archive.org/advancedsearch.php?q=collection:(prelinger)%20AND%20(${encodeURIComponent(clean)})&fl[]=identifier,title,creator,date,year,description,downloads&sort[]=downloads%20desc&rows=12&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6500)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('archive_prelinger', Date.now() - start);

    const docs = data.response?.docs || [];
    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const creator = doc.creator || 'Prelinger Archives';
      const year = doc.year || (doc.date ? doc.date.substring(0, 4) : undefined);
      const resourceUrl = `https://archive.org/details/${id}`;
      const streamUrl = `/api/v1/video-stream?iaId=${encodeURIComponent(id)}`;
      const poster = `https://archive.org/services/img/${id}`;

      return buildResourceItem({
        id: `prelinger-${id}`,
        title,
        category: 'videos',
        description: doc.description ? (typeof doc.description === 'string' ? doc.description.substring(0, 260) + '...' : 'Historic cultural motion picture.') : `Historical ephemeral film by ${creator} (${year || 'Historic'}). Rick Prelinger collection.`,
        thumbnailUrl: poster,
        previewUrl: streamUrl,
        downloadUrl: `https://archive.org/details/${id}`,
        providerId: 'archive_prelinger',
        providerName: 'Prelinger Archives',
        resourceUrl,
        externalId: id,
        creatorName: creator,
        rawLicense: 'Public Domain / Free Open Access',
        licenseUrl: 'https://archive.org/details/prelinger',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'mp4',
          quality: 'Historical Film Archival Transfer',
          embedUrl: `https://archive.org/embed/${id}`,
          year: year ? parseInt(String(year), 10) : undefined,
          tags: ['Prelinger', 'Americana', 'Historical Film', 'Public Domain', creator].filter(Boolean)
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_prelinger', err.message);
    return [];
  }
}

// 9. Internet Archive Classic Cartoons & Early Animation
export async function queryCartoonsVideos(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const clean = query.trim() || 'animation';
  const url = `https://archive.org/advancedsearch.php?q=collection:(classic_cartoons)%20AND%20(${encodeURIComponent(clean)})&fl[]=identifier,title,creator,date,year,description,downloads&sort[]=downloads%20desc&rows=12&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6500)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('archive_cartoons', Date.now() - start);

    const docs = data.response?.docs || [];
    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const studio = doc.creator || 'Classic Animation Studio';
      const year = doc.year || (doc.date ? doc.date.substring(0, 4) : undefined);
      const resourceUrl = `https://archive.org/details/${id}`;
      const streamUrl = `/api/v1/video-stream?iaId=${encodeURIComponent(id)}`;
      const poster = `https://archive.org/services/img/${id}`;

      return buildResourceItem({
        id: `cartoon-${id}`,
        title,
        category: 'videos',
        description: doc.description ? (typeof doc.description === 'string' ? doc.description.substring(0, 260) + '...' : 'Public domain classic cartoon animation short.') : `Classic golden age animated cartoon by ${studio} (${year || 'Golden Age Animation'}).`,
        thumbnailUrl: poster,
        previewUrl: streamUrl,
        downloadUrl: `https://archive.org/details/${id}`,
        providerId: 'archive_cartoons',
        providerName: 'Classic Animation Archives',
        resourceUrl,
        externalId: id,
        creatorName: studio,
        rawLicense: 'Public Domain Animation Short',
        licenseUrl: 'https://archive.org/details/classic_cartoons',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'mp4',
          quality: 'Classic Animation Master',
          embedUrl: `https://archive.org/embed/${id}`,
          year: year ? parseInt(String(year), 10) : undefined,
          tags: ['Animation', 'Cartoon', 'Golden Age', 'Public Domain', studio].filter(Boolean)
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_cartoons', err.message);
    return [];
  }
}

// 10. YouTube Open Video Search & v3 Integration
export async function queryYouTubeVideos(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const cleanQ = (query || '').trim() || 'science';

  // 1. If official YOUTUBE_API_KEY (or universal Google API key) is available, use YouTube Data API v3
  const apiKey = getYouTubeApiKey();
  if (apiKey) {
    try {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(cleanQ)}&type=video&maxResults=15&key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(4500) });
      if (res.ok) {
        const data = await res.json();
        recordProviderSuccess('youtube_video', Date.now() - start);
        return (data.items || []).map((item: any) => {
          const videoId = item.id?.videoId;
          const snippet = item.snippet || {};
          const thumb = snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || `https://i.ytimg.com/vi/${videoId}/hq720.jpg`;
          return buildResourceItem({
            id: `yt-${videoId}`,
            title: snippet.title || 'YouTube Video',
            category: 'videos',
            description: snippet.description || `YouTube video published by ${snippet.channelTitle || 'Creator'}.`,
            thumbnailUrl: thumb,
            previewUrl: `https://www.youtube.com/watch?v=${videoId}`,
            downloadUrl: `https://www.youtube.com/watch?v=${videoId}`,
            providerId: 'youtube_video',
            providerName: 'YouTube',
            resourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
            externalId: videoId,
            creatorName: snippet.channelTitle || 'YouTube Creator',
            rawLicense: 'YouTube Standard License / Creative Commons',
            licenseUrl: 'https://www.youtube.com/static?template=terms',
            attributes: {
              format: 'video/embed',
              quality: 'Full HD 1080p',
              embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&enablejsapi=1&rel=0`,
              invidiousUrl: `https://yewtu.be/embed/${videoId}`,
              pipedUrl: `https://piped.video/embed/${videoId}`,
              proxyEmbedUrl: `/api/v1/video-embed?id=${videoId}&provider=youtube`,
              youtubeId: videoId,
              channel: snippet.channelTitle,
              tags: ['YouTube', 'Video', snippet.channelTitle].filter(Boolean)
            }
          });
        });
      }
    } catch {
      // Fall through to open scraping
    }
  }

  // 2. Open Search via YouTube search parser (Zero-auth, instant, global)
  try {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanQ)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const match = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/s);
    if (!match) throw new Error('Could not parse YouTube initial data');
    const data = JSON.parse(match[1]);
    const contents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
    const items = contents?.[0]?.itemSectionRenderer?.contents || [];
    const videoItems = items.filter((i: any) => i.videoRenderer).slice(0, 15);

    recordProviderSuccess('youtube_video', Date.now() - start);

    return videoItems.map((i: any) => {
      const v = i.videoRenderer;
      const videoId = v.videoId;
      const title = v.title?.runs?.[0]?.text || 'YouTube Video';
      const channel = v.ownerText?.runs?.[0]?.text || 'YouTube Creator';
      const duration = v.lengthText?.simpleText;
      const views = v.viewCountText?.simpleText;
      const thumb = v.thumbnail?.thumbnails?.slice(-1)?.[0]?.url || `https://i.ytimg.com/vi/${videoId}/hq720.jpg`;

      return buildResourceItem({
        id: `yt-${videoId}`,
        title,
        category: 'videos',
        description: `YouTube video by ${channel}. ${duration ? `Duration: ${duration}. ` : ''}${views ? `Views: ${views}.` : ''}`,
        thumbnailUrl: thumb,
        previewUrl: `https://www.youtube.com/watch?v=${videoId}`,
        downloadUrl: `https://www.youtube.com/watch?v=${videoId}`,
        providerId: 'youtube_video',
        providerName: 'YouTube',
        resourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
        externalId: videoId,
        creatorName: channel,
        rawLicense: 'YouTube Standard Terms',
        licenseUrl: 'https://www.youtube.com/static?template=terms',
        attributes: {
          format: 'video/embed',
          quality: 'HD / 1080p',
          embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&enablejsapi=1&rel=0`,
          invidiousUrl: `https://yewtu.be/embed/${videoId}`,
          pipedUrl: `https://piped.video/embed/${videoId}`,
          proxyEmbedUrl: `/api/v1/video-embed?id=${videoId}&provider=youtube`,
          youtubeId: videoId,
          duration,
          views,
          channel,
          tags: ['YouTube', 'Video', channel].filter(Boolean)
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('youtube_video', err.message);
    return [];
  }
}

// 11. Dailymotion Open Video Directory (Millions of high-res videos via official public API)
export async function queryDailymotionVideos(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const clean = (query || '').trim() || 'nature';
  const url = `https://api.dailymotion.com/videos?search=${encodeURIComponent(clean)}&fields=id,title,owner_screenname,thumbnail_720_url,thumbnail_480_url,duration,views_total,url,embed_url&limit=15`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('dailymotion_video', Date.now() - start);

    return (data.list || []).map((v: any) => {
      const minutes = Math.floor((v.duration || 0) / 60);
      const seconds = (v.duration || 0) % 60;
      const durationStr = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
      const thumb = v.thumbnail_720_url || v.thumbnail_480_url || `https://www.dailymotion.com/thumbnail/video/${v.id}`;

      return buildResourceItem({
        id: `dm-${v.id}`,
        title: v.title || 'Dailymotion Video',
        category: 'videos',
        description: `Video on Dailymotion by ${v.owner_screenname || 'Creator'}. Duration: ${durationStr}. Views: ${v.views_total || 0}.`,
        thumbnailUrl: thumb,
        previewUrl: v.url || `https://www.dailymotion.com/video/${v.id}`,
        downloadUrl: v.url || `https://www.dailymotion.com/video/${v.id}`,
        providerId: 'dailymotion_video',
        providerName: 'Dailymotion',
        resourceUrl: v.url || `https://www.dailymotion.com/video/${v.id}`,
        externalId: v.id,
        creatorName: v.owner_screenname || 'Dailymotion Creator',
        rawLicense: 'Dailymotion Standard Terms',
        licenseUrl: 'https://www.dailymotion.com/legal/terms',
        attributes: {
          format: 'video/embed',
          quality: 'HD / 720p',
          embedUrl: v.embed_url || `https://geo.dailymotion.com/player.html?video=${v.id}`,
          duration: durationStr,
          views: v.views_total ? String(v.views_total) : undefined,
          tags: ['Dailymotion', 'Video', v.owner_screenname].filter(Boolean)
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('dailymotion_video', err.message);
    return [];
  }
}

// 12. Vimeo Open Video & Staff Picks
export async function queryVimeoVideos(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = `https://vimeo.com/api/v2/channel/staffpicks/videos.json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const items = await res.json();
    recordProviderSuccess('vimeo_video', Date.now() - start);

    if (!Array.isArray(items)) return [];

    const cleanQ = (query || '').toLowerCase().trim();
    const filtered = cleanQ
      ? items.filter((v: any) =>
          (v.title || '').toLowerCase().includes(cleanQ) ||
          (v.description || '').toLowerCase().includes(cleanQ) ||
          (v.tags || '').toLowerCase().includes(cleanQ)
        )
      : items;

    const sourceList = filtered.length > 0 ? filtered : items.slice(0, 8);

    return sourceList.slice(0, 12).map((v: any) => {
      const minutes = Math.floor((v.duration || 0) / 60);
      const seconds = (v.duration || 0) % 60;
      const durationStr = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

      return buildResourceItem({
        id: `vimeo-${v.id}`,
        title: v.title || 'Vimeo Cinema Video',
        category: 'videos',
        description: v.description ? v.description.substring(0, 240) + '...' : `Vimeo Staff Pick by ${v.user_name || 'Filmmaker'}.`,
        thumbnailUrl: v.thumbnail_large || v.thumbnail_medium,
        previewUrl: v.url || `https://vimeo.com/${v.id}`,
        downloadUrl: v.url || `https://vimeo.com/${v.id}`,
        providerId: 'vimeo_video',
        providerName: 'Vimeo',
        resourceUrl: v.url || `https://vimeo.com/${v.id}`,
        externalId: String(v.id),
        creatorName: v.user_name || 'Vimeo Creator',
        rawLicense: 'Vimeo Standard Terms / Creative Commons',
        licenseUrl: 'https://vimeo.com/terms',
        attributes: {
          format: 'video/embed',
          quality: 'Cinema 4K / HD',
          embedUrl: `https://player.vimeo.com/video/${v.id}`,
          duration: durationStr,
          tags: ['Vimeo', 'Cinema', 'Staff Picks']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('vimeo_video', err.message);
    return [];
  }
}



