import { ResourceItem } from '../../src/types/resource';
import { buildResourceItem } from '../normalizer';
import { registerTracker, recordProviderSuccess, recordProviderFailure } from '../telemetry';

const USER_AGENT = 'URMIL-Universal-Browser/1.0 (https://ai.studio; contact: team@urmil.org)';

// ============================================================================
// Provider Telemetry Registrations
// ============================================================================

registerTracker({
  id: 'nasa_eonet',
  name: 'NASA Earth Observatory Natural Event Tracker (EONET)',
  category: 'Datasets',
  rateLimit: 'Public Open Access (NASA)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'arch_linux_pkgs',
  name: 'Arch Linux Package Database',
  category: 'Code',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'clojars_packages',
  name: 'Clojars Clojure & JVM Repository',
  category: 'Code',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_msdos_games',
  name: 'Internet Archive MS-DOS Games Showcase',
  category: 'Games',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_medical_heritage',
  name: 'Medical Heritage Rare Historical Treatises',
  category: 'Books',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_sheet_music',
  name: 'Historical Sheet Music & Musical Scores',
  category: 'Art',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_old_time_radio',
  name: 'Old Time Radio Golden Age Broadcasts',
  category: 'Audio',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_usgs_bulletins',
  name: 'USGS Geological Survey Historic Bulletins',
  category: 'Datasets',
  rateLimit: 'Public Open Access (USGS / Public Domain)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_nasa_historical',
  name: 'NASA Apollo & Spaceflight Mission Documents',
  category: 'Books',
  rateLimit: 'Public Open Access (NASA / US Govt)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_animation_shorts',
  name: 'Classic Animation & Cartoon Shorts (Golden Age)',
  category: 'Videos',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

// ============================================================================
// 1. NASA Earth Observatory Natural Event Tracker (EONET)
// ============================================================================
export async function queryNasaEonet(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').toLowerCase().trim();
  const url = 'https://eonet.gsfc.nasa.gov/api/v3/events?limit=25&status=all';

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    let events = Array.isArray(data.events) ? data.events : [];

    if (rawQ && rawQ !== 'earth' && rawQ !== 'events' && rawQ !== 'natural') {
      const filtered = events.filter((e: any) =>
        (e.title && e.title.toLowerCase().includes(rawQ)) ||
        (e.categories && e.categories.some((c: any) => c.title && c.title.toLowerCase().includes(rawQ)))
      );
      if (filtered.length > 0) {
        events = filtered;
      }
    }

    recordProviderSuccess('nasa_eonet', Date.now() - start);

    return events.slice(0, 16).map((ev: any) => {
      const id = ev.id || String(Math.random());
      const title = ev.title || 'Earth Natural Event';
      const category = ev.categories?.[0]?.title || 'Earth Observation';
      const geom = ev.geometry?.[ev.geometry.length - 1] || ev.geometry?.[0];
      const coordsText = geom?.coordinates ? JSON.stringify(geom.coordinates) : 'Global';
      const parsedCoords = Array.isArray(geom?.coordinates) && typeof geom.coordinates[0] === 'number' && typeof geom.coordinates[1] === 'number'
        ? [geom.coordinates[1], geom.coordinates[0]] as [number, number]
        : undefined;
      const date = geom?.date || 'Recent';
      const eonetUrl = ev.link || `https://eonet.gsfc.nasa.gov/api/v3/events/${id}`;

      return buildResourceItem({
        id: `nasa-eonet-${id.toLowerCase()}`,
        title: `${title} [${category}]`,
        category: 'datasets',
        description: `NASA Earth Observatory real-time planetary event. Category: ${category}. Latest Coordinate Observation: ${coordsText} on ${date}. Tracked by NASA Goddard Space Flight Center.`,
        thumbnailUrl: 'https://eonet.gsfc.nasa.gov/images/eonet_logo_header.png',
        previewUrl: eonetUrl,
        downloadUrl: eonetUrl,
        providerId: 'nasa_eonet',
        providerName: 'NASA Earth Observatory (EONET)',
        resourceUrl: eonetUrl,
        externalId: id,
        creatorName: 'NASA Goddard Space Flight Center',
        rawLicense: 'Public Domain (NASA / US Federal Government)',
        licenseUrl: 'https://www.nasa.gov/multimedia/guidelines/index.html',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          region: coordsText,
          coordinates: parsedCoords,
          tags: ['nasa', 'eonet', 'earth-science', 'wildfires', 'satellites', 'geography', category.toLowerCase()]
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('nasa_eonet', err.message);
    return [];
  }
}

// ============================================================================
// 2. Arch Linux Package Database
// ============================================================================
export async function queryArchLinuxPackages(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'editor';
  const url = `https://archlinux.org/packages/search/json/?q=${encodeURIComponent(cleanQ)}`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000)
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    const results = Array.isArray(data.results) ? data.results : [];
    recordProviderSuccess('arch_linux_pkgs', Date.now() - start);

    return results.slice(0, 16).map((pkg: any) => {
      const name = pkg.pkgname || 'package';
      const repo = pkg.repo || 'core';
      const arch = pkg.arch || 'x86_64';
      const version = pkg.pkgver ? `${pkg.pkgver}-${pkg.pkgrel || '1'}` : '1.0';
      const desc = pkg.pkgdesc || 'Arch Linux system package';
      const upstream = pkg.url || `https://archlinux.org/packages/${repo}/${arch}/${name}/`;
      const pkgUrl = `https://archlinux.org/packages/${repo}/${arch}/${name}/`;
      const licenses = Array.isArray(pkg.licenses) ? pkg.licenses.join(', ') : (pkg.licenses || 'Open Source');

      return buildResourceItem({
        id: `arch-pkg-${repo}-${name}`,
        title: `${name} ${version} (${repo})`,
        category: 'code',
        description: `${desc}. Arch Linux official package repository [${repo}/${arch}]. Upstream: ${upstream}`,
        thumbnailUrl: 'https://archlinux.org/static/logos/archlogo-icon.png',
        previewUrl: pkgUrl,
        downloadUrl: upstream,
        providerId: 'arch_linux_pkgs',
        providerName: 'Arch Linux Package Database',
        resourceUrl: pkgUrl,
        externalId: `${repo}/${name}`,
        creatorName: pkg.maintainers?.join(', ') || 'Arch Linux Maintainers',
        creatorOrg: 'Arch Linux Development Team',
        rawLicense: licenses,
        licenseUrl: 'https://terms.archlinux.org/',
        providerDefaultLicense: {
          type: 'Open Source',
          commercialAllowed: true,
          attributionRequired: true
        },
        attributes: {
          format: 'pkg.tar.zst',
          tags: ['archlinux', 'linux', repo, arch, name]
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('arch_linux_pkgs', err.message);
    return [];
  }
}

// ============================================================================
// 3. Clojars Clojure & JVM Artifact Registry
// ============================================================================
export async function queryClojarsPackages(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'http';
  const url = `https://clojars.org/api/artifacts`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000)
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    const artifacts = Array.isArray(data) ? data : [];

    const searchLower = cleanQ.toLowerCase();
    const matches = artifacts.filter((item: any) => {
      const jarName = (item.jar_name || '').toLowerCase();
      const groupName = (item.group_name || '').toLowerCase();
      return jarName.includes(searchLower) || groupName.includes(searchLower);
    });

    const itemsToUse = matches.length > 0 ? matches : artifacts.slice(0, 16);
    recordProviderSuccess('clojars_packages', Date.now() - start);

    return itemsToUse.slice(0, 16).map((art: any) => {
      const group = art.group_name || 'org.clojars';
      const jar = art.jar_name || cleanQ;
      const fullCoord = `${group}/${jar}`;
      const clojarsUrl = `https://clojars.org/${fullCoord}`;

      return buildResourceItem({
        id: `clojars-${group.toLowerCase()}-${jar.toLowerCase()}`,
        title: fullCoord,
        category: 'code',
        description: `Clojure & JVM ecosystem package published on Clojars. Coords: [${fullCoord}]. Use with Leiningen, deps.edn, or Gradle.`,
        thumbnailUrl: 'https://clojars.org/images/clojars-logo.png',
        previewUrl: clojarsUrl,
        downloadUrl: clojarsUrl,
        providerId: 'clojars_packages',
        providerName: 'Clojars JVM & Clojure Registry',
        resourceUrl: clojarsUrl,
        externalId: fullCoord,
        creatorName: group,
        creatorOrg: 'Clojars Community',
        rawLicense: 'Eclipse Public License / Open Source',
        licenseUrl: 'https://clojars.org/about',
        providerDefaultLicense: {
          type: 'EPL-1.0 / Open Source',
          commercialAllowed: true,
          attributionRequired: true
        },
        attributes: {
          format: 'jar',
          tags: ['clojure', 'jvm', 'clojars', group, jar]
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('clojars_packages', err.message);
    return [];
  }
}

// ============================================================================
// 4. Internet Archive MS-DOS Games Showcase
// ============================================================================
export async function queryArchiveMsDosGames(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'pacman';
  const searchQuery = `collection:(softwarelibrary_msdos_games) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,mediatype,year,downloads,creator&sort[]=downloads desc&rows=16&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_msdos_games', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const year = doc.year || '1990s';
      const downloads = doc.downloads ? Number(doc.downloads) : undefined;
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;

      return buildResourceItem({
        id: `ia-dos-${id}`,
        title: `${title} (${year})`,
        category: 'games',
        description: `Vintage MS-DOS PC game preserved in the Internet Archive Software Library. Playable in browser via EM-DOSBox. Year: ${year}. Downloads: ${downloads ? downloads.toLocaleString() : 'N/A'}.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: itemUrl,
        providerId: 'archive_msdos_games',
        providerName: 'Internet Archive MS-DOS Games Showcase',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: doc.creator || 'MS-DOS Game Developers',
        rawLicense: 'Vintage Shareware / Historical Preservation',
        licenseUrl: 'https://archive.org/about/terms.php',
        providerDefaultLicense: {
          type: 'Historical Preservation',
          commercialAllowed: false,
          attributionRequired: true
        },
        attributes: {
          format: 'dosbox',
          year: typeof doc.year === 'number' ? doc.year : parseInt(doc.year, 10) || undefined,
          downloads,
          tags: ['ms-dos', 'dosbox', 'retro-gaming', 'pc-games', 'vintage', 'shareware']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_msdos_games', err.message);
    return [];
  }
}

// ============================================================================
// 5. Medical Heritage Library (MHL)
// ============================================================================
export async function queryArchiveMedicalHeritage(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'anatomy';
  const searchQuery = `collection:(medicalheritagelibrary) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,year,downloads,date&sort[]=downloads desc&rows=16&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_medical_heritage', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const year = doc.year || 'Historical';
      const creator = doc.creator || 'Medical Heritage Consortium';
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const pdfUrl = `https://archive.org/download/${id}/${id}.pdf`;

      return buildResourceItem({
        id: `ia-mhl-${id}`,
        title,
        category: 'books',
        description: `Rare historical medical treatise from the Medical Heritage Library. Author/Editor: ${creator}. Publication Year: ${year}. Includes anatomical diagrams, surgery notes, and pharmacopeia.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: pdfUrl,
        providerId: 'archive_medical_heritage',
        providerName: 'Medical Heritage Rare Historical Treatises',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: creator,
        creatorOrg: 'Medical Heritage Library Consortium',
        rawLicense: 'Public Domain / Open Access Cultural Heritage',
        licenseUrl: 'https://archive.org/details/medicalheritagelibrary',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'pdf',
          year: typeof doc.year === 'number' ? doc.year : parseInt(doc.year, 10) || undefined,
          tags: ['medical-heritage', 'history-of-medicine', 'anatomy', 'treatise', 'public-domain']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_medical_heritage', err.message);
    return [];
  }
}

// ============================================================================
// 6. Historical Sheet Music & Musical Scores
// ============================================================================
export async function queryArchiveSheetMusic(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'ragtime';
  const searchQuery = `collection:(sheetmusic) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,year,downloads&sort[]=downloads desc&rows=16&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_sheet_music', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const creator = doc.creator || 'Classical Composer';
      const year = doc.year || '19th/20th Century';
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const pdfUrl = `https://archive.org/download/${id}/${id}.pdf`;

      return buildResourceItem({
        id: `ia-sheet-${id}`,
        title: `${title} [Score]`,
        category: 'art',
        description: `Historic musical score and sheet music notation. Composer: ${creator}. Date: ${year}. Preserved in the Sheet Music Archive with high-resolution page scans and score PDF.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: pdfUrl,
        providerId: 'archive_sheet_music',
        providerName: 'Historical Sheet Music & Musical Scores',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: creator,
        rawLicense: 'Public Domain (Sheet Music Heritage)',
        licenseUrl: 'https://archive.org/details/sheetmusic',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'pdf',
          year: typeof doc.year === 'number' ? doc.year : parseInt(doc.year, 10) || undefined,
          tags: ['sheet-music', 'scores', 'notation', 'music', 'public-domain', 'composition']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_sheet_music', err.message);
    return [];
  }
}

// ============================================================================
// 7. Old Time Radio Golden Age Broadcasts
// ============================================================================
export async function queryArchiveOldTimeRadio(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'sherlock';
  const searchQuery = `collection:(oldtimeradio) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,year,downloads&sort[]=downloads desc&rows=16&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_old_time_radio', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const audioUrl = `https://archive.org/download/${id}/${id}.mp3`;

      return buildResourceItem({
        id: `ia-otr-${id}`,
        title: `${title} [Radio Broadcast]`,
        category: 'audio',
        description: `Golden Age of Radio broadcast. Historic radio drama, mystery, and audio theater preserved in the Old Time Radio collection. Streamable audio archive.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: audioUrl,
        providerId: 'archive_old_time_radio',
        providerName: 'Old Time Radio Golden Age Broadcasts',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: doc.creator || 'Classic Radio Network',
        rawLicense: 'Public Domain / Historic Radio Broadcast',
        licenseUrl: 'https://archive.org/details/oldtimeradio',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'mp3',
          isStreamable: true,
          tags: ['old-time-radio', 'otr', 'radio-drama', 'audio-theater', 'vintage-broadcast']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_old_time_radio', err.message);
    return [];
  }
}

// ============================================================================
// 8. USGS Geological Survey Historic Bulletins
// ============================================================================
export async function queryArchiveUsgsBulletins(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'mineral';
  const searchQuery = `collection:(usgeologicalsurvey) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,year,downloads&sort[]=downloads desc&rows=16&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_usgs_bulletins', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const year = doc.year || 'Historic';
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const pdfUrl = `https://archive.org/download/${id}/${id}.pdf`;

      return buildResourceItem({
        id: `ia-usgs-${id}`,
        title: `${title} (${year})`,
        category: 'datasets',
        description: `United States Geological Survey historical scientific bulletin and field study. Year: ${year}. Detailed mineralogy, strata diagrams, hydrology, and earth science surveys.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: pdfUrl,
        providerId: 'archive_usgs_bulletins',
        providerName: 'USGS Geological Survey Historic Bulletins',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: 'U.S. Geological Survey',
        creatorOrg: 'USGS / Department of the Interior',
        rawLicense: 'Public Domain (US Government Work)',
        licenseUrl: 'https://archive.org/details/usgeologicalsurvey',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'pdf',
          year: typeof doc.year === 'number' ? doc.year : parseInt(doc.year, 10) || undefined,
          tags: ['usgs', 'geology', 'earth-science', 'bulletin', 'minerals', 'public-domain']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_usgs_bulletins', err.message);
    return [];
  }
}

// ============================================================================
// 9. NASA Apollo & Spaceflight Mission Documents
// ============================================================================
export async function queryArchiveNasaHistorical(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'apollo';
  const searchQuery = `collection:(nasa) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,year,downloads&sort[]=downloads desc&rows=16&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_nasa_historical', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const year = doc.year || 'Apollo Era';
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const pdfUrl = `https://archive.org/download/${id}/${id}.pdf`;

      return buildResourceItem({
        id: `ia-nasa-doc-${id}`,
        title: `${title} [NASA Archive]`,
        category: 'books',
        description: `Official historical NASA mission document, flight manual, or technical report. Preserved in the NASA Historical Collection. Year: ${year}.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: pdfUrl,
        providerId: 'archive_nasa_historical',
        providerName: 'NASA Apollo & Spaceflight Mission Documents',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: 'National Aeronautics and Space Administration',
        creatorOrg: 'NASA',
        rawLicense: 'Public Domain (NASA / US Federal Government)',
        licenseUrl: 'https://archive.org/details/nasa',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'pdf',
          year: typeof doc.year === 'number' ? doc.year : parseInt(doc.year, 10) || undefined,
          tags: ['nasa', 'spaceflight', 'apollo', 'astronauts', 'history', 'technical-report']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_nasa_historical', err.message);
    return [];
  }
}

// ============================================================================
// 10. Classic Animation & Cartoon Shorts (Golden Age)
// ============================================================================
export async function queryArchiveAnimationShorts(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'cartoon';
  const searchQuery = `collection:(animationandcartoons) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,year,downloads&sort[]=downloads desc&rows=16&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_animation_shorts', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const videoUrl = `https://archive.org/download/${id}/${id}.mp4`;

      return buildResourceItem({
        id: `ia-anim-${id}`,
        title: `${title} [Classic Animation]`,
        category: 'videos',
        description: `Golden Age public domain animation short. Preserved in the Internet Archive Animation and Cartoons collection with playable cinema stream.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: videoUrl,
        providerId: 'archive_animation_shorts',
        providerName: 'Classic Animation & Cartoon Shorts (Golden Age)',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: doc.creator || 'Golden Age Animation Studios',
        rawLicense: 'Public Domain (Classic Animation Heritage)',
        licenseUrl: 'https://archive.org/details/animationandcartoons',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'mp4',
          tags: ['animation', 'cartoons', 'golden-age', 'classic-cinema', 'public-domain']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_animation_shorts', err.message);
    return [];
  }
}
