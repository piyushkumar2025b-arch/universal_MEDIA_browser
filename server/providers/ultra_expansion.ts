import { ResourceItem } from '../../src/types/resource';
import { buildResourceItem } from '../normalizer';
import { registerTracker, recordProviderSuccess, recordProviderFailure } from '../telemetry';

const USER_AGENT = 'URMIL-Universal-Browser/1.0 (https://ai.studio; contact: team@urmil.org)';

// ============================================================================
// Provider Telemetry Registrations
// ============================================================================

registerTracker({
  id: 'loc_chronicling_america',
  name: 'Library of Congress Chronicling America (1777-1963)',
  category: 'History & News',
  rateLimit: 'Public Open Access (LOC / NEH)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_x_minus_one',
  name: 'NBC X Minus One Sci-Fi Radio Theater',
  category: 'Audio',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_silent_comedy',
  name: 'Classic Silent Comedy & Slapstick Masterpieces',
  category: 'Videos',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_railroad_history',
  name: 'Historic Railroad Documents & Locomotive Schematics',
  category: 'Books',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_auto_brochures',
  name: 'Classic Automotive Brochures & Coachwork Design',
  category: 'Art',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_early_cgi',
  name: 'SIGGRAPH Early Computer Graphics & CGI Animation',
  category: 'Videos',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_wildlife_audio',
  name: 'Avian Bioacoustics & Wildlife Soundscapes',
  category: 'Audio',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_78rpm_jazz',
  name: 'The Great 78 Project Early Jazz & Blues Discs',
  category: 'Music',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_vintage_boardgames',
  name: 'Vintage Tabletop Board Game Manuals & Box Art',
  category: 'Games',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_usgs_topomaps',
  name: 'USGS Historical Topographic Quadrangle Maps',
  category: 'Maps',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

// ============================================================================
// 1. Library of Congress Chronicling America (1777-1963)
// ============================================================================
export async function queryLocChroniclingAmerica(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'invention';
  const url = `https://chroniclingamerica.loc.gov/search/pages/results/?andtext=${encodeURIComponent(cleanQ)}&format=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const items = data.items || [];
    recordProviderSuccess('loc_chronicling_america', Date.now() - start);

    return items.slice(0, 16).map((item: any) => {
      const id = item.id || '';
      const pubTitle = item.title || 'Historic American Newspaper';
      const rawDate = item.date || '';
      const formattedDate = rawDate.length === 8
        ? `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`
        : rawDate || 'Historic Edition';
      const year = rawDate.length >= 4 ? parseInt(rawDate.slice(0, 4), 10) : undefined;
      const city = Array.isArray(item.city) ? item.city.join(', ') : (item.city || '');
      const state = Array.isArray(item.state) ? item.state.join(', ') : (item.state || '');
      const location = [city, state].filter(Boolean).join(', ');
      const viewerUrl = `https://chroniclingamerica.loc.gov${id}`;
      const thumbUrl = `https://chroniclingamerica.loc.gov${id}thumbnail.jpg`;
      const pdfUrl = `https://chroniclingamerica.loc.gov${id.replace(/\/$/, '')}.pdf`;

      return buildResourceItem({
        id: `loc-chron-${encodeURIComponent(id).substring(0, 45)}`,
        title: `${pubTitle} (${formattedDate})`,
        category: 'books',
        description: `Historic American newspaper front page preserved in the National Digital Newspaper Program. Published in ${location || 'United States'}. Features contemporary journalism, headlines, and advertisements.`,
        thumbnailUrl: thumbUrl,
        previewUrl: viewerUrl,
        downloadUrl: pdfUrl,
        providerId: 'loc_chronicling_america',
        providerName: 'Library of Congress Chronicling America (1777-1963)',
        resourceUrl: viewerUrl,
        externalId: id,
        creatorName: pubTitle,
        creatorOrg: 'National Endowment for the Humanities & Library of Congress',
        rawLicense: 'Public Domain (Historic American Newspapers)',
        licenseUrl: 'https://chroniclingamerica.loc.gov/about/',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'pdf',
          year,
          region: location,
          tags: ['newspaper', 'chronicling-america', 'journalism', '19th-century', '20th-century', 'library-of-congress']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('loc_chronicling_america', err.message);
    return [];
  }
}

// ============================================================================
// 2. NBC X Minus One Sci-Fi Radio Theater
// ============================================================================
export async function queryArchiveXMinusOne(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'mars';
  const searchQuery = `collection:(x_minus_one) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,year,downloads&sort[]=downloads desc&rows=16&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_x_minus_one', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const year = doc.year || '1955-1958';
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const audioUrl = `https://archive.org/download/${id}/${id}.mp3`;

      return buildResourceItem({
        id: `ia-x-minus-${id}`,
        title: `${title} [NBC X Minus One]`,
        category: 'audio',
        description: `NBC Radio Golden Age science fiction dramatization adapted from Galaxy Science Fiction & Astounding Stories. Features works by Asimov, Heinlein, and Bradbury.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: audioUrl,
        providerId: 'archive_x_minus_one',
        providerName: 'NBC X Minus One Sci-Fi Radio Theater',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: 'NBC Radio Network / Galaxy Science Fiction',
        rawLicense: 'Public Domain / Historic Radio Drama',
        licenseUrl: 'https://archive.org/details/x_minus_one',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'mp3',
          isStreamable: true,
          year: typeof doc.year === 'number' ? doc.year : parseInt(doc.year, 10) || undefined,
          tags: ['x-minus-one', 'scifi', 'old-time-radio', 'nbc', 'galaxy-scifi', 'golden-age']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_x_minus_one', err.message);
    return [];
  }
}

// ============================================================================
// 3. Classic Silent Comedy & Slapstick Masterpieces
// ============================================================================
export async function queryArchiveSilentComedy(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'chaplin';
  const searchQuery = `collection:(silent_films) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,year,downloads,director&sort[]=downloads desc&rows=16&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_silent_comedy', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const year = doc.year || '1910s/1920s';
      const director = doc.director || doc.creator || 'Silent Cinema Comedian';
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const videoUrl = `https://archive.org/download/${id}/${id}.mp4`;

      return buildResourceItem({
        id: `ia-silent-com-${id}`,
        title: `${title} (${year}) [Silent Slapstick]`,
        category: 'videos',
        description: `Early 20th-century physical comedy and slapstick masterpiece. Creator/Performer: ${director}. Preserved in the Silent Motion Picture Collection.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: videoUrl,
        providerId: 'archive_silent_comedy',
        providerName: 'Classic Silent Comedy & Slapstick Masterpieces',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: director,
        rawLicense: 'Public Domain (Silent Cinema)',
        licenseUrl: 'https://archive.org/details/silent_films',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'mp4',
          year: typeof doc.year === 'number' ? doc.year : parseInt(doc.year, 10) || undefined,
          tags: ['silent-film', 'slapstick', 'comedy', 'chaplin', 'keaton', '1920s', 'cinema-heritage']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_silent_comedy', err.message);
    return [];
  }
}

// ============================================================================
// 4. Historic Railroad Documents & Locomotive Schematics
// ============================================================================
export async function queryArchiveRailroadHistory(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'locomotive';
  const searchQuery = `collection:(railroaddocuments) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,year,downloads&sort[]=downloads desc&rows=16&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_railroad_history', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const creator = doc.creator || 'Railroad Line / Locomotive Works';
      const year = doc.year || 'Historical';
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const pdfUrl = `https://archive.org/download/${id}/${id}.pdf`;

      return buildResourceItem({
        id: `ia-rail-${id}`,
        title: `${title} (${year}) [Railroad History]`,
        category: 'books',
        description: `Vintage railway timetable, steam locomotive blueprint, or transit operating manual. Publisher: ${creator}. Preserved in the Railroad Documents Collection.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: pdfUrl,
        providerId: 'archive_railroad_history',
        providerName: 'Historic Railroad Documents & Locomotive Schematics',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: creator,
        rawLicense: 'Public Domain / Historical Transportation Heritage',
        licenseUrl: 'https://archive.org/details/railroaddocuments',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'pdf',
          year: typeof doc.year === 'number' ? doc.year : parseInt(doc.year, 10) || undefined,
          tags: ['railroad', 'locomotive', 'trains', 'steam-engine', 'transit-history', 'timetables']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_railroad_history', err.message);
    return [];
  }
}

// ============================================================================
// 5. Classic Automotive Brochures & Coachwork Design
// ============================================================================
export async function queryArchiveAutoBrochures(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'ford';
  const searchQuery = `collection:(classiccarbrochures) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,year,downloads&sort[]=downloads desc&rows=16&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_auto_brochures', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const creator = doc.creator || 'Automobile Manufacturer';
      const year = doc.year || 'Classic Era';
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const pdfUrl = `https://archive.org/download/${id}/${id}.pdf`;

      return buildResourceItem({
        id: `ia-car-broch-${id}`,
        title: `${title} (${year}) [Auto Brochure]`,
        category: 'art',
        description: `Vintage automotive showroom sales catalog, concept car illustration, or coachwork design portfolio. Manufacturer: ${creator}.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: pdfUrl,
        providerId: 'archive_auto_brochures',
        providerName: 'Classic Automotive Brochures & Coachwork Design',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: creator,
        rawLicense: 'Historical Automotive Documentation / Open Access',
        licenseUrl: 'https://archive.org/details/classiccarbrochures',
        providerDefaultLicense: {
          type: 'Historical Documentation',
          commercialAllowed: false,
          attributionRequired: true
        },
        attributes: {
          format: 'pdf',
          year: typeof doc.year === 'number' ? doc.year : parseInt(doc.year, 10) || undefined,
          tags: ['automotive', 'classic-cars', 'coachwork', 'vintage-design', 'car-brochure']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_auto_brochures', err.message);
    return [];
  }
}

// ============================================================================
// 6. SIGGRAPH Early Computer Graphics & CGI Animation
// ============================================================================
export async function queryArchiveEarlyCgi(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'computer';
  const searchQuery = `collection:(siggraph) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,year,downloads&sort[]=downloads desc&rows=16&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_early_cgi', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const creator = doc.creator || 'CGI Pioneer / SIGGRAPH';
      const year = doc.year || '1980s/1990s';
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const videoUrl = `https://archive.org/download/${id}/${id}.mp4`;

      return buildResourceItem({
        id: `ia-siggraph-${id}`,
        title: `${title} (${year}) [SIGGRAPH CGI]`,
        category: 'videos',
        description: `Pioneering early 3D computer graphics animation from the SIGGRAPH Electronic Theater festival. Researcher/Studio: ${creator}. Includes wireframe, raytracing, and procedural rendering milestones.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: videoUrl,
        providerId: 'archive_early_cgi',
        providerName: 'SIGGRAPH Early Computer Graphics & CGI Animation',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: creator,
        rawLicense: 'Educational & Research CGI Preservation',
        licenseUrl: 'https://archive.org/details/siggraph',
        providerDefaultLicense: {
          type: 'Research Preservation',
          commercialAllowed: false,
          attributionRequired: true
        },
        attributes: {
          format: 'mp4',
          year: typeof doc.year === 'number' ? doc.year : parseInt(doc.year, 10) || undefined,
          tags: ['siggraph', 'computer-graphics', '3d-animation', 'cgi', 'raytracing', 'digital-art']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_early_cgi', err.message);
    return [];
  }
}

// ============================================================================
// 7. Avian Bioacoustics & Wildlife Soundscapes
// ============================================================================
export async function queryArchiveWildlifeAudio(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'forest';
  const searchQuery = `collection:(wildlife_sound_recording) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,year,downloads&sort[]=downloads desc&rows=16&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_wildlife_audio', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const creator = doc.creator || 'Field Bioacoustician';
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const audioUrl = `https://archive.org/download/${id}/${id}.mp3`;

      return buildResourceItem({
        id: `ia-wildlife-${id}`,
        title: `${title} [Bioacoustic Recording]`,
        category: 'audio',
        description: `Wild bioacoustic sound recording capturing wildlife vocalizations, bird song repertoires, or pristine natural wilderness soundscapes. Recordist: ${creator}.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: audioUrl,
        providerId: 'archive_wildlife_audio',
        providerName: 'Avian Bioacoustics & Wildlife Soundscapes',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: creator,
        rawLicense: 'Creative Commons / Open Bioacoustics',
        licenseUrl: 'https://archive.org/details/wildlife_sound_recording',
        providerDefaultLicense: {
          type: 'Creative Commons',
          commercialAllowed: true,
          attributionRequired: true
        },
        attributes: {
          format: 'mp3',
          isStreamable: true,
          tags: ['bioacoustics', 'wildlife', 'nature-sounds', 'bird-songs', 'field-recording', 'ecology']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_wildlife_audio', err.message);
    return [];
  }
}

// ============================================================================
// 8. The Great 78 Project Early Jazz & Blues Discs
// ============================================================================
export async function queryArchive78rpmJazz(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'jazz';
  const searchQuery = `collection:(georgeblood) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,year,downloads&sort[]=downloads desc&rows=16&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_78rpm_jazz', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const artist = doc.creator || 'Early Jazz / Blues Artist';
      const year = doc.year || '1920s-1940s';
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const audioUrl = `https://archive.org/download/${id}/${id}.mp3`;

      return buildResourceItem({
        id: `ia-78-jazz-${id}`,
        title: `${title} (${year}) [78 RPM Shellac]`,
        category: 'music',
        description: `Digitized shellac 78 RPM disc from The Great 78 Project. Artist: ${artist}. Mastered directly from physical historical phonograph records with authentic acoustic warm fidelity.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: audioUrl,
        providerId: 'archive_78rpm_jazz',
        providerName: 'The Great 78 Project Early Jazz & Blues Discs',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: artist,
        rawLicense: 'Public Domain / Historical Sound Recording Preservation',
        licenseUrl: 'https://great78.archive.org/',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'mp3',
          isStreamable: true,
          year: typeof doc.year === 'number' ? doc.year : parseInt(doc.year, 10) || undefined,
          tags: ['78rpm', 'jazz', 'blues', 'shellac-records', 'great-78-project', 'vintage-music']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_78rpm_jazz', err.message);
    return [];
  }
}

// ============================================================================
// 9. Vintage Tabletop Board Game Manuals & Box Art
// ============================================================================
export async function queryArchiveVintageBoardgames(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'game';
  const searchQuery = `collection:(boardgamemanuals) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,year,downloads&sort[]=downloads desc&rows=16&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_vintage_boardgames', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const creator = doc.creator || 'Board Game Publisher';
      const year = doc.year || 'Vintage';
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const pdfUrl = `https://archive.org/download/${id}/${id}.pdf`;

      return buildResourceItem({
        id: `ia-boardgame-${id}`,
        title: `${title} [Board Game Manual & Art]`,
        category: 'games',
        description: `Vintage tabletop board game rulebook, box art illustration, and component guide. Publisher: ${creator}. Preserved in the Tabletop Board Game Collection.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: pdfUrl,
        providerId: 'archive_vintage_boardgames',
        providerName: 'Vintage Tabletop Board Game Manuals & Box Art',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: creator,
        rawLicense: 'Historical Game Preservation / Open Access',
        licenseUrl: 'https://archive.org/details/boardgamemanuals',
        providerDefaultLicense: {
          type: 'Historical Preservation',
          commercialAllowed: false,
          attributionRequired: true
        },
        attributes: {
          format: 'pdf',
          year: typeof doc.year === 'number' ? doc.year : parseInt(doc.year, 10) || undefined,
          tags: ['board-games', 'tabletop', 'game-rules', 'box-art', 'vintage-gaming', 'analog-games']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_vintage_boardgames', err.message);
    return [];
  }
}

// ============================================================================
// 10. USGS Historical Topographic Quadrangle Maps
// ============================================================================
export async function queryArchiveUsgsTopomaps(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'valley';
  const searchQuery = `collection:(usgstopomaps) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,year,downloads&sort[]=downloads desc&rows=16&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_usgs_topomaps', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const creator = doc.creator || 'USGS Topographic Survey';
      const year = doc.year || 'Historical';
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const downloadImg = `https://archive.org/download/${id}/${id}.jpg`;

      return buildResourceItem({
        id: `ia-topo-${id}`,
        title: `${title} (${year}) [USGS Topo Quad]`,
        category: 'maps',
        description: `Official US Geological Survey topographic quadrangle map. Features elevation contour lines, watersheds, historical settlements, and survey markers.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: downloadImg,
        providerId: 'archive_usgs_topomaps',
        providerName: 'USGS Historical Topographic Quadrangle Maps',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: creator,
        creatorOrg: 'United States Geological Survey (USGS)',
        rawLicense: 'Public Domain (USGS Topographic Survey)',
        licenseUrl: 'https://archive.org/details/usgstopomaps',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'jpg',
          year: typeof doc.year === 'number' ? doc.year : parseInt(doc.year, 10) || undefined,
          tags: ['usgs', 'topographic-map', 'cartography', 'quadrangle', 'elevation', 'public-domain']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_usgs_topomaps', err.message);
    return [];
  }
}
