import http from 'http';
import { ResourceItem } from '../../src/types/resource';
import { buildResourceItem } from '../normalizer';
import { registerTracker, recordProviderSuccess, recordProviderFailure } from '../telemetry';

const USER_AGENT = 'URMIL-Universal-Browser/1.0 (https://ai.studio; contact: team@urmil.org)';

registerTracker({
  id: 'apple_music',
  name: 'Apple Music & iTunes Track Previews',
  category: 'Music',
  rateLimit: 'Open Catalog (Millions of Tracks with 30s Audio Previews)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'wikimedia_music',
  name: 'Wikimedia Commons Classical & Instrumental Music',
  category: 'Music',
  rateLimit: 'Open MediaWiki API (Lossless Recordings)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'openverse_audio',
  name: 'Openverse Audio',
  category: 'Audio',
  rateLimit: '1000 req/hr (Token Required)',
  authRequired: true,
  authConfigured: Boolean(process.env.OPENVERSE_ACCESS_TOKEN)
});

registerTracker({
  id: 'wikimedia_audio',
  name: 'Wikimedia Commons Audio & Sounds',
  category: 'Audio',
  rateLimit: 'Open MediaWiki API (Millions of Sounds)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'freesound',
  name: 'Freesound',
  category: 'Audio',
  rateLimit: '2000 req/day',
  authRequired: true,
  authConfigured: Boolean(process.env.FREESOUND_API_KEY)
});

registerTracker({
  id: 'musicbrainz',
  name: 'MusicBrainz',
  category: 'Audio & Music',
  rateLimit: '1 req/sec (Polite)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'internet_archive_audio',
  name: 'Internet Archive Audio',
  category: 'Audio',
  rateLimit: 'Polite',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_78rpm',
  name: 'Archive.org 78rpm Historic Music & Audio',
  category: 'Audio & Music',
  rateLimit: 'Polite Open Search',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'ccmixter_audio',
  name: 'ccMixter Creative Commons Music & Remixes',
  category: 'Audio & Music',
  rateLimit: 'Open CC Music API (No Key Required)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'radio_browser',
  name: 'Radio Browser Worldwide Live Audio',
  category: 'Audio & Music',
  rateLimit: 'Open Community Directory (40K+ Stations)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'apple_podcasts',
  name: 'Apple Podcasts & Audio Broadcasts',
  category: 'Audio',
  rateLimit: 'Open iTunes Search API (Millions of Shows)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_live_music',
  name: 'Internet Archive Live Music Archive (LMA / etree)',
  category: 'Audio & Music',
  rateLimit: 'Polite Open Search (250,000+ Concerts)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_librivox',
  name: 'LibriVox Free Public Domain Audiobooks',
  category: 'Audio & Books',
  rateLimit: 'Polite Open Search (Free Public Domain)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_otr',
  name: 'Internet Archive Old Time Radio (OTR)',
  category: 'Audio & Broadcasts',
  rateLimit: 'Polite Open Search (Historic Radio)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_netlabels',
  name: 'Netlabels Creative Commons Independent Music',
  category: 'Music & Electronic',
  rateLimit: 'Polite Open Search (70,000+ Albums)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'nasa_audio',
  name: 'NASA Historic Audio & Space Transmissions',
  category: 'Audio & Science',
  rateLimit: 'Open Public API (Public Domain)',
  authRequired: false,
  authConfigured: true
});

// 1. Openverse Audio
export async function queryOpenverseAudio(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = `https://api.openverse.org/v1/audio/?q=${encodeURIComponent(query)}&page_size=15`;
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };
  if (process.env.OPENVERSE_ACCESS_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.OPENVERSE_ACCESS_TOKEN}`;
  }

  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(1800) });
    if (!res.ok) {
      return await queryArchiveAudio(query);
    }
    const data = await res.json();
    recordProviderSuccess('openverse_audio', Date.now() - start);

    return (data.results || []).map((item: any) =>
      buildResourceItem({
        id: `openverse-audio-${item.id}`,
        title: item.title || 'Soundtrack Stem',
        category: item.genres && item.genres.length > 0 ? 'music' : 'audio',
        description: item.attribution || undefined,
        previewUrl: item.url,
        downloadUrl: item.url,
        thumbnailUrl: item.thumbnail,
        providerId: 'openverse',
        providerName: 'Openverse Audio',
        resourceUrl: item.foreign_landing_url || item.url,
        externalId: item.id,
        creatorName: item.creator,
        creatorProfileUrl: item.creator_url,
        rawLicense: item.license ? `CC ${item.license.toUpperCase()} ${item.license_version || ''}` : undefined,
        licenseUrl: item.license_url,
        attributes: {
          format: item.filetype || 'mp3',
          duration: item.duration ? `${Math.round(item.duration / 1000)}s` : undefined,
          bpm: item.bpm,
          genre: item.genres?.[0],
          tags: item.tags?.map((t: any) => t.name) || []
        }
      })
    );
  } catch (err: any) {
    recordProviderFailure('openverse_audio', err.message);
    return await queryArchiveAudio(query);
  }
}

// 2. Freesound (Key required)
export async function queryFreesound(query: string): Promise<ResourceItem[]> {
  const apiKey = process.env.FREESOUND_API_KEY;
  if (!apiKey) {
    return await queryArchiveAudio(query);
  }

  const start = Date.now();
  const url = `https://freesound.org/apiv2/search/text/?query=${encodeURIComponent(query)}&token=${apiKey}&fields=id,name,tags,description,license,username,previews,duration,filesize,samplerate&page_size=15`;

  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('freesound', Date.now() - start);

    return (data.results || []).map((sound: any) =>
      buildResourceItem({
        id: `freesound-${sound.id}`,
        title: sound.name,
        category: 'audio',
        description: sound.description,
        previewUrl: sound.previews?.['preview-hq-mp3'] || sound.previews?.['preview-lq-mp3'],
        downloadUrl: sound.previews?.['preview-hq-mp3'],
        providerId: 'freesound',
        providerName: 'Freesound',
        resourceUrl: `https://freesound.org/s/${sound.id}/`,
        externalId: String(sound.id),
        creatorName: sound.username,
        creatorProfileUrl: `https://freesound.org/people/${sound.username}/`,
        rawLicense: sound.license || 'Creative Commons',
        licenseUrl: sound.license,
        attributes: {
          format: 'mp3',
          duration: sound.duration ? `${Math.round(sound.duration)}s` : undefined,
          fileSize: sound.filesize ? `${(sound.filesize / 1024 / 1024).toFixed(2)} MB` : undefined,
          quality: sound.samplerate && sound.samplerate >= 44100 ? 'Original' : 'HD',
          tags: sound.tags || []
        }
      })
    );
  } catch (err: any) {
    recordProviderFailure('freesound', err.message);
    return await queryArchiveAudio(query);
  }
}

// 3. MusicBrainz (Free open metadata)
export async function queryMusicBrainz(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = `https://musicbrainz.org/ws/2/recording/?query=${encodeURIComponent(query)}&fmt=json&limit=15`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('musicbrainz', Date.now() - start);

    const recordings = data.recordings || [];
    return recordings.map((rec: any) => {
      const artist = rec['artist-credit']?.[0]?.artist?.name || 'Various Artists';
      const release = rec.releases?.[0]?.title;
      return buildResourceItem({
        id: `musicbrainz-${rec.id}`,
        title: rec.title,
        category: 'music',
        description: release ? `Release: ${release} • Artist: ${artist}` : `By ${artist}`,
        providerId: 'musicbrainz',
        providerName: 'MusicBrainz Open Database',
        resourceUrl: `https://musicbrainz.org/recording/${rec.id}`,
        externalId: rec.id,
        creatorName: artist,
        rawLicense: 'Open Database License (ODbL) / CC0',
        licenseUrl: 'https://musicbrainz.org/doc/About/Data_License',
        providerDefaultLicense: {
          type: 'Open Database License (ODbL)',
          commercialAllowed: true,
          attributionRequired: true
        },
        attributes: {
          format: 'flac/mp3',
          duration: rec.length ? `${Math.round(rec.length / 1000)}s` : undefined,
          year: rec.releases?.[0]?.date ? new Date(rec.releases[0].date).getFullYear() : undefined,
          tags: rec.tags?.map((t: any) => t.name) || []
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('musicbrainz', err.message);
    try {
      return await queryArchiveAudio(query);
    } catch {
      return [];
    }
  }
}

// 4. Internet Archive Audio
export async function queryArchiveAudio(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}+AND+mediatype:audio&fl[]=identifier,title,creator,description,year,licenseurl&sort[]=downloads+desc&rows=12&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('internet_archive_audio', Date.now() - start);

    const docs = data.response?.docs || [];
    return docs.map((doc: any) =>
      buildResourceItem({
        id: `ia-audio-${doc.identifier}`,
        title: doc.title || 'Archived Audio Track',
        category: 'audio',
        description: doc.description || undefined,
        previewUrl: `/api/v1/audio-stream?iaId=${doc.identifier}`,
        downloadUrl: `https://archive.org/download/${doc.identifier}`,
        providerId: 'internet_archive',
        providerName: 'Internet Archive Audio',
        resourceUrl: `https://archive.org/details/${doc.identifier}`,
        externalId: doc.identifier,
        creatorName: doc.creator || 'Archive Creator',
        rawLicense: doc.licenseurl ? 'Creative Commons / Public Domain' : 'Open Archive Audio',
        licenseUrl: doc.licenseurl || 'https://archive.org/about/terms.php',
        attributes: {
          format: 'mp3',
          year: doc.year ? Number(doc.year) : undefined,
          quality: 'Original Stream',
          embedUrl: `https://archive.org/embed/${doc.identifier}`
        }
      })
    );
  } catch (err: any) {
    recordProviderFailure('internet_archive_audio', err.message);
    return [];
  }
}

// 5. Wikimedia Commons Audio & Sounds (Open Classical, Field, Ambient, Speech)
export async function queryWikimediaAudio(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const cleanQ = query.trim() || 'sound';
  const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent('filemime:audio ' + cleanQ)}&gsrnamespace=6&gsrlimit=20&prop=imageinfo&iiprop=url|size|mime|extmetadata&format=json&origin=*`;

  try {
    const res = await fetch(searchUrl, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6500)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('wikimedia_audio', Date.now() - start);

    const pages = Object.values(data.query?.pages || {}) as any[];
    return pages
      .filter((p) => p.imageinfo && p.imageinfo.length > 0 && p.imageinfo[0].url)
      .map((p) => {
        const info = p.imageinfo[0];
        const meta = info.extmetadata || {};
        const rawTitle = p.title.replace(/^File:/i, '').replace(/\.[a-z0-9]+$/i, '').replace(/_/g, ' ');
        const artist = meta.Artist?.value?.replace(/<[^>]*>/g, '').trim() || 'Wikimedia Contributor';
        const license = meta.LicenseShortName?.value || 'Creative Commons / Public Domain';
        const licenseUrl = meta.LicenseUrl?.value || 'https://commons.wikimedia.org/wiki/Commons:Licensing';
        const isMusic = /music|orchestra|sonata|symphony|concerto|piano|violin|guitar|song|opus|waltz/i.test(rawTitle + ' ' + (meta.ObjectName?.value || ''));

        return buildResourceItem({
          id: `wiki-audio-${p.pageid}`,
          title: rawTitle,
          category: isMusic ? 'music' : 'audio',
          description: `${meta.ImageDescription?.value?.replace(/<[^>]*>/g, '').slice(0, 160) || 'Authentic open audio recording from Wikimedia Commons'}`,
          previewUrl: info.url,
          downloadUrl: info.url,
          providerId: 'wikimedia_audio',
          providerName: 'Wikimedia Commons Audio & Sounds',
          resourceUrl: info.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title)}`,
          externalId: String(p.pageid),
          creatorName: artist,
          rawLicense: license,
          licenseUrl,
          attributes: {
            format: info.mime?.includes('ogg') ? 'ogg' : info.mime?.includes('wav') ? 'wav' : 'mp3',
            quality: 'Lossless / Authentic Stream',
            tags: ['Wikimedia Commons', 'Open Audio', isMusic ? 'Classical / Music' : 'Field Recording / Sound Effect']
          }
        });
      });
  } catch (err: any) {
    recordProviderFailure('wikimedia_audio', err.message);
    return [];
  }
}

// 6. Archive.org 78rpm & Historic Sound Archive (Early jazz, classical, blues, acoustic shellac)
export async function queryArchive78rpm(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const cleanQ = encodeURIComponent(query.replace(/[^\w\s]/gi, ''));
  const url = `https://archive.org/advancedsearch.php?q=collection:(78rpm)+AND+mediatype:(audio)+AND+(${cleanQ})&fl[]=identifier,title,creator,year,description,licenseurl&sort[]=downloads+desc&rows=15&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('archive_78rpm', Date.now() - start);

    const docs = data.response?.docs || [];
    return docs.map((doc: any) =>
      buildResourceItem({
        id: `ia-78rpm-${doc.identifier}`,
        title: doc.title || 'Historic 78rpm Gramophone Recording',
        category: 'music',
        description: `Preserved historic 78rpm disc • ${doc.creator || 'Performer'} (${doc.year || 'Historical'}) • Great 78 Project Archive`,
        previewUrl: `/api/v1/audio-stream?iaId=${doc.identifier}`,
        downloadUrl: `https://archive.org/download/${doc.identifier}`,
        thumbnailUrl: `https://archive.org/services/img/${doc.identifier}`,
        providerId: 'archive_78rpm',
        providerName: 'Archive.org 78rpm Historic Music',
        resourceUrl: `https://archive.org/details/${doc.identifier}`,
        externalId: doc.identifier,
        creatorName: doc.creator || 'Historic Recording Artist',
        rawLicense: 'Public Domain / Historical Preservation',
        licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
        attributes: {
          format: 'mp3',
          year: doc.year ? Number(doc.year) : undefined,
          quality: 'Historic Shellac 78rpm Restoration',
          embedUrl: `https://archive.org/embed/${doc.identifier}`,
          tags: ['Great 78 Project', 'Historic Music', 'Early Recording', 'Shellac 78rpm']
        }
      })
    );
  } catch (err: any) {
    recordProviderFailure('archive_78rpm', err.message);
    return [];
  }
}

// 7. ccMixter Creative Commons Music & Samples (Remix stems, vocal loops, instrumental CC tracks)
export async function queryCCMixterAudio(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const cleanTag = encodeURIComponent(query.toLowerCase().replace(/[^\w]/g, '')) || 'music';
  const url = `http://ccmixter.org/api/query?tags=${cleanTag}&f=json&limit=15`;

  try {
    const data = await new Promise<any>((resolve, reject) => {
      const req = http.get(url, {
        maxHeaderSize: 131072,
        headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' }
      }, (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(e);
          }
        });
      });
      req.on('error', reject);
      req.setTimeout(6500, () => {
        req.destroy();
        reject(new Error('Timeout'));
      });
    });

    recordProviderSuccess('ccmixter_audio', Date.now() - start);

    if (!Array.isArray(data)) return [];

    return data.map((item: any) => {
      const uploadId = item.upload_id || Math.random().toString(36).substring(7);
      const title = item.upload_name || 'ccMixter CC Track';
      const artist = item.user_real_name || item.user_name || 'ccMixter Community Artist';
      const pageUrl = item.file_page_url || `https://ccmixter.org/files/${item.user_name}/${uploadId}`;
      const files = Array.isArray(item.files) ? item.files : [];
      const mp3File = files.find((f: any) => f.download_url?.endsWith('.mp3')) || files[0] || {};
      const downloadUrl = mp3File.download_url || pageUrl;
      const licenseName = item.license_name || 'Creative Commons Attribution';
      const licenseUrl = item.license_url || 'https://creativecommons.org/licenses/by/4.0/';
      const rawTags = item.upload_extra?.usertags || item.upload_tags || '';
      const tagsList = typeof rawTags === 'string'
        ? rawTags.split(',').map((t: string) => t.trim()).filter(Boolean).slice(0, 5)
        : ['ccMixter', 'CC Music'];

      const streamUrl = downloadUrl.startsWith('http')
        ? `/api/v1/audio-stream?url=${encodeURIComponent(downloadUrl)}`
        : downloadUrl;

      return buildResourceItem({
        id: `ccmixter-${uploadId}`,
        title,
        category: 'music',
        description: `Creative Commons track by ${artist}. Tags: ${tagsList.join(', ')}.`,
        previewUrl: streamUrl,
        downloadUrl,
        providerId: 'ccmixter_audio',
        providerName: 'ccMixter CC Music',
        resourceUrl: pageUrl,
        externalId: String(uploadId),
        creatorName: artist,
        creatorOrg: 'ccMixter Community',
        rawLicense: licenseName,
        licenseUrl,
        attributes: {
          format: 'mp3',
          quality: mp3File.file_format_info?.br || 'MP3 Audio',
          duration: mp3File.file_format_info?.ps || undefined,
          tags: ['ccMixter', 'CC Music', ...tagsList]
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('ccmixter_audio', err.message);
    return [];
  }
}

// 8. Radio Browser Worldwide Community Live Audio Streams (40,000+ open global radio stations)
export async function queryRadioBrowser(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const cleanQ = encodeURIComponent(query.trim() || 'jazz');
  const url = `https://de1.api.radio-browser.info/json/stations/byname/${cleanQ}?limit=15&order=votes&reverse=true`;

  try {
    let data: any = [];
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000)
    });
    if (res.ok) {
      data = await res.json();
    }

    // Fallback to tag search if byname returned empty (e.g. query is a genre like "jazz", "rock", "ambient")
    if ((!Array.isArray(data) || data.length === 0) && cleanQ) {
      try {
        const tagRes = await fetch(`https://de1.api.radio-browser.info/json/stations/bytag/${cleanQ}?limit=15&order=votes&reverse=true`, {
          headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
          signal: AbortSignal.timeout(5000)
        });
        if (tagRes.ok) {
          const tagData = await tagRes.json();
          if (Array.isArray(tagData)) data = tagData;
        }
      } catch {}
    }

    recordProviderSuccess('radio_browser', Date.now() - start);

    if (!Array.isArray(data)) return [];

    return data.map((station: any) => {
      const id = station.stationuuid || Math.random().toString(36).substring(7);
      const streamUrl = station.url_resolved || station.url;
      const title = station.name?.trim() || 'Global Radio Stream';
      const country = station.country || 'International';
      const tags = typeof station.tags === 'string'
        ? station.tags.split(',').map((t: string) => t.trim()).filter(Boolean).slice(0, 5)
        : ['Radio', 'Broadcast'];
      const isMusicStation = /jazz|rock|pop|classical|lofi|chill|electronic|ambient|dance|metal|blues|country|hiphop|indie|music/i.test((station.tags || '') + ' ' + title);

      const proxyStreamUrl = `/api/v1/audio-stream?url=${encodeURIComponent(streamUrl)}`;

      return buildResourceItem({
        id: `radio-${id}`,
        title,
        category: isMusicStation ? 'music' : 'audio',
        description: `Live streaming broadcast from ${country}. Bitrate: ${station.bitrate || 128} kbps ${station.codec || 'MP3'}. Tags: ${tags.join(', ')}.`,
        previewUrl: proxyStreamUrl,
        downloadUrl: streamUrl,
        thumbnailUrl: station.favicon || undefined,
        providerId: 'radio_browser',
        providerName: 'Radio Browser Worldwide',
        resourceUrl: station.homepage || `https://www.radio-browser.info/history/${id}`,
        externalId: id,
        creatorName: title,
        creatorOrg: country,
        rawLicense: 'Public Community Broadcast Stream',
        licenseUrl: 'https://www.radio-browser.info/',
        attributes: {
          format: (station.codec || 'mp3').toLowerCase(),
          quality: station.bitrate ? `${station.bitrate} kbps` : 'Live Stream',
          genre: tags[0] || 'Radio Stream',
          tags: ['Live Radio', country, ...tags]
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('radio_browser', err.message);
    return [];
  }
}

// 9. Apple Podcasts & Open Audio Broadcasts (Millions of indexed shows and audio metadata)
export async function queryApplePodcasts(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=podcast&limit=15`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('apple_podcasts', Date.now() - start);

    const results = data.results || [];
    return results.map((show: any) => {
      const id = String(show.collectionId || show.trackId || Math.random().toString(36).substring(7));
      const title = show.collectionName || show.trackName || 'Open Podcast Broadcast';
      const author = show.artistName || 'Podcast Broadcaster';
      const artwork = show.artworkUrl600 || show.artworkUrl100;
      const genre = show.primaryGenreName || 'Spoken Audio';
      const episodeCount = show.trackCount ? `${show.trackCount} episodes` : undefined;

      return buildResourceItem({
        id: `itunes-pod-${id}`,
        title,
        category: 'audio',
        description: `Audio podcast by ${author}. Category: ${genre}. ${episodeCount ? `Catalog: ${episodeCount}.` : ''}`,
        previewUrl: show.feedUrl || show.collectionViewUrl,
        downloadUrl: show.feedUrl || show.collectionViewUrl,
        thumbnailUrl: artwork,
        providerId: 'apple_podcasts',
        providerName: 'Apple Podcasts Directory',
        resourceUrl: show.collectionViewUrl || `https://podcasts.apple.com`,
        externalId: id,
        creatorName: author,
        creatorOrg: 'Open RSS Feed',
        rawLicense: 'Open RSS Feed Broadcast',
        licenseUrl: 'https://podcasts.apple.com',
        attributes: {
          format: 'podcast/rss',
          quality: 'Digital Audio Broadcast',
          year: show.releaseDate ? new Date(show.releaseDate).getFullYear() : undefined,
          tags: ['Podcast', genre, 'Spoken Audio']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('apple_podcasts', err.message);
    return [];
  }
}

// 10. Internet Archive Live Music Archive (LMA / etree)
export async function queryLiveMusicArchive(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const clean = query.trim();
  const searchUrl = `https://archive.org/advancedsearch.php?q=collection:(etree)%20AND%20mediatype:(audio)%20AND%20(${encodeURIComponent(clean || 'concert')})&fl[]=identifier,title,creator,date,year,description,downloads&sort[]=downloads%20desc&rows=12&page=1&output=json`;

  try {
    const res = await fetch(searchUrl, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6500)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('archive_live_music', Date.now() - start);

    const docs = data.response?.docs || [];
    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || `Live Concert Recording`;
      const artist = doc.creator || 'Live Music Artist';
      const year = doc.year || (doc.date ? doc.date.substring(0, 4) : undefined);
      const resourceUrl = `https://archive.org/details/${id}`;
      const streamUrl = `/api/v1/audio-stream?iaId=${id}`;
      const thumbUrl = `https://archive.org/services/img/${id}`;

      return buildResourceItem({
        id: `lma-${id}`,
        title,
        category: 'music',
        description: `Live concert recording by ${artist} (${year || 'Live'}). Collection: Live Music Archive (etree.org trade-friendly open music).`,
        previewUrl: streamUrl,
        downloadUrl: `https://archive.org/compress/${id}/formats=VBR%20MP3&file=/${id}.zip`,
        thumbnailUrl: thumbUrl,
        providerId: 'archive_live_music',
        providerName: 'Internet Archive Live Music',
        resourceUrl,
        externalId: id,
        creatorName: artist,
        rawLicense: 'Trade-Friendly Open Live Recording (Non-Commercial)',
        licenseUrl: 'https://etree.org',
        attributes: {
          format: 'mp3/flac',
          quality: 'Lossless/Live Soundboard',
          embedUrl: `https://archive.org/embed/${id}`,
          year: year ? parseInt(String(year), 10) : undefined,
          tags: ['Live Music', 'Concert Recording', artist, 'etree'].filter(Boolean)
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_live_music', err.message);
    return [];
  }
}

// 11. LibriVox Free Public Domain Audiobooks
export async function queryLibriVoxAudiobooks(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const clean = query.trim() || 'literature';
  const url = `https://archive.org/advancedsearch.php?q=collection:(librivoxaudio)%20AND%20mediatype:(audio)%20AND%20(${encodeURIComponent(clean)})&fl[]=identifier,title,creator,date,year,description,downloads&sort[]=downloads%20desc&rows=12&page=1&output=json`;

  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('archive_librivox', Date.now() - start);

    const docs = data.response?.docs || [];
    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const author = doc.creator || 'Classic Author';
      const year = doc.year || (doc.date ? doc.date.substring(0, 4) : undefined);
      const resourceUrl = `https://archive.org/details/${id}`;
      const streamUrl = `/api/v1/audio-stream?iaId=${id}`;
      const thumbUrl = `https://archive.org/services/img/${id}`;

      return buildResourceItem({
        id: `librivox-${id}`,
        title,
        category: 'audio',
        description: `Unabridged public domain audiobook by ${author} (${year || 'Audiobook'}). Read by volunteer narrators for LibriVox.`,
        previewUrl: streamUrl,
        downloadUrl: `https://archive.org/compress/${id}/formats=VBR%20MP3&file=/${id}.zip`,
        thumbnailUrl: thumbUrl,
        providerId: 'archive_librivox',
        providerName: 'LibriVox Free Audiobooks',
        resourceUrl,
        externalId: id,
        creatorName: author,
        rawLicense: 'Public Domain / LibriVox Volunteers',
        licenseUrl: 'https://librivox.org/pages/about-librivox/',
        providerDefaultLicense: {
          type: 'Public Domain / CC0',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'mp3/audiobook',
          quality: 'Complete Audiobook Chapter Set',
          embedUrl: `https://archive.org/embed/${id}`,
          year: year ? parseInt(String(year), 10) : undefined,
          tags: ['Audiobook', 'LibriVox', 'Public Domain', author]
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_librivox', err.message);
    return [];
  }
}

// 12. Internet Archive Old Time Radio (OTR)
export async function queryOldTimeRadio(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const clean = query.trim() || 'mystery';
  const url = `https://archive.org/advancedsearch.php?q=collection:(oldtimeradio)%20AND%20(${encodeURIComponent(clean)})&fl[]=identifier,title,creator,date,year,description,downloads&sort[]=downloads%20desc&rows=12&page=1&output=json`;

  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('archive_otr', Date.now() - start);

    const docs = data.response?.docs || [];
    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const creator = doc.creator || 'Golden Age of Radio';
      const year = doc.year || (doc.date ? doc.date.substring(0, 4) : undefined);
      const resourceUrl = `https://archive.org/details/${id}`;
      const streamUrl = `/api/v1/audio-stream?iaId=${id}`;
      const thumbUrl = `https://archive.org/services/img/${id}`;

      return buildResourceItem({
        id: `otr-${id}`,
        title,
        category: 'audio',
        description: `Historical radio broadcast episode (${year || 'Historic'}). Preserved in the Internet Archive Old Time Radio Research Group collection.`,
        previewUrl: streamUrl,
        downloadUrl: `https://archive.org/compress/${id}/formats=VBR%20MP3&file=/${id}.zip`,
        thumbnailUrl: thumbUrl,
        providerId: 'archive_otr',
        providerName: 'Old Time Radio Archives',
        resourceUrl,
        externalId: id,
        creatorName: creator,
        rawLicense: 'Public Domain / Historic Radio Broadcast',
        licenseUrl: 'https://archive.org/details/oldtimeradio',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'mp3',
          quality: 'Historic Radio Broadcast',
          embedUrl: `https://archive.org/embed/${id}`,
          year: year ? parseInt(String(year), 10) : undefined,
          tags: ['Old Time Radio', 'Historic Broadcast', creator]
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_otr', err.message);
    return [];
  }
}

// 13. NASA Historic Space Audio & Astronaut Transmissions
export async function queryNasaAudio(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const clean = query.trim() || 'space';
  const url = `https://images-api.nasa.gov/search?q=${encodeURIComponent(clean)}&media_type=audio`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('nasa_audio', Date.now() - start);

    const rawItems = (data.collection?.items || []).slice(0, 8);
    const results = await Promise.all(
      rawItems.map(async (item: any) => {
        const d = item.data?.[0];
        if (!d) return null;

        const nasaId = d.nasa_id || Math.random().toString(36).substring(7);
        const title = d.title || 'NASA Audio Recording';
        const desc = d.description || 'Historic audio recording from NASA space missions and astronaut communications.';
        const center = d.center || 'NASA';
        const dateStr = d.date_created ? d.date_created.substring(0, 4) : undefined;
        const resourceUrl = `https://images.nasa.gov/details-${encodeURIComponent(nasaId)}`;

        let audioUrl = item.href;
        try {
          if (item.href) {
            const colRes = await fetch(item.href, { signal: AbortSignal.timeout(1500) });
            if (colRes.ok) {
              const files: string[] = await colRes.json();
              const mp3 = files.find((f: string) => f.includes('~128k.mp3') || f.includes('~orig.mp3') || f.endsWith('.mp3'));
              if (mp3) audioUrl = mp3.replace(/^http:\/\//i, 'https://');
            }
          }
        } catch {}

        return buildResourceItem({
          id: `nasa-audio-${nasaId}`,
          title,
          category: 'audio',
          description: desc.length > 280 ? desc.substring(0, 277) + '...' : desc,
          previewUrl: audioUrl,
          downloadUrl: audioUrl,
          thumbnailUrl: 'https://images-assets.nasa.gov/image/PIA12348/PIA12348~thumb.jpg',
          providerId: 'nasa_audio',
          providerName: 'NASA Space Audio Archives',
          resourceUrl,
          externalId: nasaId,
          creatorName: `National Aeronautics and Space Administration (${center})`,
          creatorOrg: 'NASA',
          rawLicense: 'Public Domain (NASA US Government Work)',
          licenseUrl: 'https://www.nasa.gov/multimedia/guidelines/index.html',
          providerDefaultLicense: {
            type: 'Public Domain',
            commercialAllowed: true,
            attributionRequired: false
          },
          attributes: {
            format: 'audio/mp3',
            quality: 'Historical Space Transmission',
            year: dateStr ? parseInt(dateStr, 10) : undefined,
            tags: ['NASA', 'Space', 'Astronaut', center, ...((d.keywords || []).slice(0, 3))]
          }
        });
      })
    );

    const filtered = results.filter(Boolean) as ResourceItem[];
    if (filtered.length > 0) return filtered;
    throw new Error('No items resolved from NASA API');
  } catch (err: any) {
    recordProviderFailure('nasa_audio', err.message);
    try {
      const iaUrl = `https://archive.org/advancedsearch.php?q=collection:(nasaaudio)+AND+(${encodeURIComponent(query)})&fl[]=identifier,title,creator,description,year,licenseurl&rows=10&output=json`;
      const iaRes = await fetch(iaUrl, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(4000) });
      if (iaRes.ok) {
        const iaData = await iaRes.json();
        const docs = iaData.response?.docs || [];
        if (docs.length > 0) {
          recordProviderSuccess('nasa_audio', Date.now() - start);
          return docs.map((doc: any) =>
            buildResourceItem({
              id: `nasa-ia-${doc.identifier}`,
              title: doc.title || 'NASA Historic Mission Audio',
              category: 'audio',
              description: doc.description ? String(doc.description).replace(/<[^>]*>?/gm, '').substring(0, 280) : 'NASA spaceflight audio recording.',
              previewUrl: `https://archive.org/download/${doc.identifier}`,
              downloadUrl: `https://archive.org/download/${doc.identifier}`,
              thumbnailUrl: 'https://images-assets.nasa.gov/image/PIA12348/PIA12348~thumb.jpg',
              providerId: 'nasa_audio',
              providerName: 'NASA Space Audio Archives',
              resourceUrl: `https://archive.org/details/${doc.identifier}`,
              externalId: doc.identifier,
              creatorName: doc.creator || 'NASA',
              creatorOrg: 'NASA',
              rawLicense: 'Public Domain (NASA)',
              licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
              attributes: { format: 'audio/mp3', quality: 'Archive Master' }
            })
          );
        }
      }
    } catch {}
    return [];
  }
}

// 14. Netlabels Creative Commons Independent Music (Internet Archive)
export async function queryArchiveNetlabels(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const clean = encodeURIComponent(query.trim() || 'ambient');
  const url = `https://archive.org/advancedsearch.php?q=collection:(netlabels)+AND+mediatype:(audio)+AND+(${clean})&fl[]=identifier,title,creator,year,description&rows=15&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6500)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('archive_netlabels', Date.now() - start);

    const docs = data.response?.docs || [];
    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || 'Independent Music Release';
      const artist = doc.creator || 'Netlabel Artist';
      const year = doc.year;
      const resourceUrl = `https://archive.org/details/${id}`;
      const streamAudioUrl = `/api/v1/audio-stream?iaId=${encodeURIComponent(id)}`;

      return buildResourceItem({
        id: `netlabel-${id}`,
        title,
        category: 'music',
        description: doc.description
          ? (typeof doc.description === 'string' ? doc.description.substring(0, 260) + '...' : 'Creative Commons netlabel music release.')
          : `Independent Creative Commons musical release by ${artist} (${year || 'Recent'}). Cataloged in the Internet Archive Netlabels collection.`,
        previewUrl: streamAudioUrl,
        downloadUrl: `https://archive.org/download/${id}`,
        thumbnailUrl: `https://archive.org/services/img/${id}`,
        providerId: 'archive_netlabels',
        providerName: 'Netlabels CC Music',
        resourceUrl,
        externalId: id,
        creatorName: artist,
        rawLicense: 'Creative Commons Open Audio License',
        licenseUrl: 'https://creativecommons.org/licenses/',
        providerDefaultLicense: {
          type: 'Creative Commons / CC BY-NC-SA',
          commercialAllowed: false,
          attributionRequired: true
        },
        attributes: {
          format: 'audio/mp3',
          quality: 'Lossless / High-Bitrate MP3',
          embedUrl: `https://archive.org/embed/${id}`,
          year: year ? parseInt(String(year), 10) : undefined,
          tags: ['Netlabel', 'Creative Commons', 'Electronic', 'Independent', artist].filter(Boolean)
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_netlabels', err.message);
    return [];
  }
}

// 15. Apple Music & iTunes Track Previews (Millions of tracks with official 30-sec CDN audio previews)
export async function queryAppleMusicSongs(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const cleanQ = query.trim() || 'popular';
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(cleanQ)}&entity=song&limit=25`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('apple_music', Date.now() - start);

    const tracks = (data.results || []).filter((t: any) => t.previewUrl);
    return tracks.map((track: any) => {
      const id = String(track.trackId);
      const title = track.trackName || 'Music Track';
      const artist = track.artistName || 'Various Artists';
      const album = track.collectionName || 'Single';
      const genre = track.primaryGenreName || 'Music';
      const durationSec = track.trackTimeMillis ? Math.round(track.trackTimeMillis / 1000) : 30;
      const durationMin = Math.floor(durationSec / 60);
      const durationRemainderSec = durationSec % 60;
      const durationFormatted = `${durationMin}:${durationRemainderSec.toString().padStart(2, '0')}`;
      const highResArt = track.artworkUrl100
        ? track.artworkUrl100.replace('100x100bb.jpg', '600x600bb.jpg')
        : undefined;

      return buildResourceItem({
        id: `apple-song-${id}`,
        title,
        category: 'music',
        description: `Song by ${artist} from album "${album}". Genre: ${genre}. Release: ${track.releaseDate ? track.releaseDate.substring(0, 10) : 'Recent'}. Includes 30-second high-definition preview audio.`,
        previewUrl: track.previewUrl,
        downloadUrl: track.trackViewUrl || track.previewUrl,
        thumbnailUrl: highResArt,
        providerId: 'apple_music',
        providerName: 'Apple Music Previews',
        resourceUrl: track.trackViewUrl || track.collectionViewUrl || 'https://music.apple.com',
        externalId: id,
        creatorName: artist,
        creatorOrg: album,
        rawLicense: 'Copyright © Apple Inc. & Rights Holders (Official Preview Stream)',
        licenseUrl: 'https://www.apple.com/legal/internet-services/itunes/',
        providerDefaultLicense: {
          type: 'Promotional Preview Stream',
          commercialAllowed: false,
          attributionRequired: true
        },
        attributes: {
          format: 'm4a/aac',
          duration: durationFormatted,
          quality: '256 kbps AAC Apple Master Audio',
          genre,
          album,
          isStreamable: true,
          tags: [genre, 'Apple Music', 'Official Track', artist].filter(Boolean)
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('apple_music', err.message);
    return [];
  }
}

// 16. Wikimedia Commons Classical & Instrumental Music (Open orchestra, piano, sonatas, symphonies)
export async function queryWikimediaMusic(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const cleanQ = query.trim() || 'classical music';
  const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent('filemime:audio ' + cleanQ)}&gsrnamespace=6&gsrlimit=20&prop=imageinfo&iiprop=url|size|mime|extmetadata&format=json&origin=*`;

  try {
    const res = await fetch(searchUrl, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6500)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('wikimedia_music', Date.now() - start);

    const pages = Object.values(data.query?.pages || {}) as any[];
    return pages
      .filter((p) => p.imageinfo && p.imageinfo.length > 0 && p.imageinfo[0].url)
      .map((p) => {
        const info = p.imageinfo[0];
        const meta = info.extmetadata || {};
        const rawTitle = p.title.replace(/^File:/i, '').replace(/\.[a-z0-9]+$/i, '').replace(/_/g, ' ');
        const artist = meta.Artist?.value?.replace(/<[^>]*>/g, '').trim() || 'Wikimedia Contributor';
        const license = meta.LicenseShortName?.value || 'Creative Commons / Public Domain';
        const licenseUrl = meta.LicenseUrl?.value || 'https://commons.wikimedia.org/wiki/Commons:Licensing';
        const durationSec = info.duration ? Math.round(Number(info.duration)) : undefined;
        let durationFormatted: string | undefined;
        if (durationSec) {
          const min = Math.floor(durationSec / 60);
          const sec = durationSec % 60;
          durationFormatted = `${min}:${sec.toString().padStart(2, '0')}`;
        }

        return buildResourceItem({
          id: `wiki-music-${p.pageid}`,
          title: rawTitle,
          category: 'music',
          description: `${meta.ImageDescription?.value?.replace(/<[^>]*>/g, '').slice(0, 180) || 'Authentic open classical music recording from Wikimedia Commons'}`,
          previewUrl: info.url,
          downloadUrl: info.url,
          providerId: 'wikimedia_music',
          providerName: 'Wikimedia Commons Music',
          resourceUrl: info.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title)}`,
          externalId: String(p.pageid),
          creatorName: artist,
          rawLicense: license,
          licenseUrl,
          attributes: {
            format: info.mime?.includes('ogg') ? 'ogg' : info.mime?.includes('wav') ? 'wav' : 'mp3',
            quality: 'Lossless / Authentic Orchestral Stream',
            duration: durationFormatted,
            genre: 'Classical / Instrumental',
            tags: ['Wikimedia Commons', 'Classical', 'Open Music', 'Public Domain']
          }
        });
      });
  } catch (err: any) {
    recordProviderFailure('wikimedia_music', err.message);
    return [];
  }
}






