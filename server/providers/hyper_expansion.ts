import { ResourceItem } from '../../src/types/resource';
import { buildResourceItem } from '../normalizer';
import { registerTracker, recordProviderSuccess, recordProviderFailure } from '../telemetry';

const USER_AGENT = 'URMIL-Universal-Browser/1.0 (https://ai.studio; contact: team@urmil.org)';

// ============================================================================
// Provider Telemetry Registrations
// ============================================================================

registerTracker({
  id: 'loc_digital_collections',
  name: 'Library of Congress Digital Collections',
  category: 'Art & History',
  rateLimit: 'Public Open Access (US Library of Congress)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'nih_clinical_trials',
  name: 'NIH ClinicalTrials.gov Protocol Registry',
  category: 'Datasets',
  rateLimit: 'Public Open Access (NIH / NLM)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_cbs_mystery_theater',
  name: 'CBS Radio Mystery Theater Complete Archive',
  category: 'Audio',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_demoscene',
  name: 'International Demoscene Art & Music',
  category: 'Art & Code',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_flight_manuals',
  name: 'Aviation History & Flight Operations Manuals',
  category: 'Books',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_vintage_fashion',
  name: 'Historical Costume & Fashion Plates (18th-20th C.)',
  category: 'Art',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_vintage_audiobooks',
  name: 'Spoken Word Classic Literature & Poetry',
  category: 'Audio',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_drive_in_intermissions',
  name: 'Classic Drive-In Theater Intermission Reels',
  category: 'Videos',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_historic_software',
  name: 'Historical Software & Digital Computing Showcase',
  category: 'Code',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_classic_sci_fi_movies',
  name: 'Atomic Age Sci-Fi & Drive-In Cinema Classics',
  category: 'Videos',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

// ============================================================================
// 1. Library of Congress Digital Collections
// ============================================================================
export async function queryLocDigitalCollections(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'photographs';
  const url = `https://www.loc.gov/search/?q=${encodeURIComponent(cleanQ)}&fo=json&c=16`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const results = data.results || [];
    recordProviderSuccess('loc_digital_collections', Date.now() - start);

    return results.filter((item: any) => item.title).map((item: any) => {
      const id = item.id || item.url || Math.random().toString(36).substring(7);
      const title = Array.isArray(item.title) ? item.title[0] : (item.title || 'Library of Congress Item');
      const date = item.date || item.dates?.[0] || 'Historical';
      const contributor = Array.isArray(item.contributor) ? item.contributor[0] : (item.contributor || 'Library of Congress');
      const description = Array.isArray(item.description) ? item.description[0] : (item.description || 'Digitized item from the national collections of the United States Library of Congress.');
      const thumb = item.image_url?.[0] || item.featured_image || undefined;
      const resourceUrl = item.url || `https://www.loc.gov/item/${id}`;

      return buildResourceItem({
        id: `loc-${encodeURIComponent(id).substring(0, 40)}`,
        title: `${title} (${date})`,
        category: 'art',
        description: `${description} Contributor: ${contributor}. Preserved in the Library of Congress digital repository.`,
        thumbnailUrl: thumb,
        previewUrl: resourceUrl,
        downloadUrl: resourceUrl,
        providerId: 'loc_digital_collections',
        providerName: 'Library of Congress Digital Collections',
        resourceUrl: resourceUrl,
        externalId: String(id),
        creatorName: contributor,
        creatorOrg: 'Library of Congress (Washington, D.C.)',
        rawLicense: 'Public Domain / Open Cultural Records',
        licenseUrl: 'https://www.loc.gov/legal/',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          year: parseInt(date, 10) || undefined,
          tags: ['library-of-congress', 'history', 'loc', 'american-history', 'archives']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('loc_digital_collections', err.message);
    return [];
  }
}

// ============================================================================
// 2. NIH ClinicalTrials.gov Protocol Registry
// ============================================================================
export async function queryNihClinicalTrials(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'cardiovascular';
  const url = `https://clinicaltrials.gov/api/v2/studies?query.term=${encodeURIComponent(cleanQ)}&pageSize=12`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const studies = data.studies || [];
    recordProviderSuccess('nih_clinical_trials', Date.now() - start);

    return studies.map((item: any) => {
      const protocol = item.protocolSection || {};
      const idModule = protocol.identificationModule || {};
      const nctId = idModule.nctId || 'NCT00000000';
      const briefTitle = idModule.briefTitle || nctId;
      const statusModule = protocol.statusModule || {};
      const overallStatus = statusModule.overallStatus || 'Active';
      const sponsorModule = protocol.sponsorCollaboratorsModule || {};
      const leadSponsor = sponsorModule.leadSponsor?.name || 'NIH / Academic Medical Center';
      const designModule = protocol.designModule || {};
      const phases = designModule.phases ? designModule.phases.join(', ') : 'Not Applicable';
      const conditions = protocol.conditionsModule?.conditions ? protocol.conditionsModule.conditions.join(', ') : cleanQ;
      const studyUrl = `https://clinicaltrials.gov/study/${nctId}`;

      return buildResourceItem({
        id: `nih-ct-${nctId}`,
        title: `${briefTitle} [${nctId}]`,
        category: 'datasets',
        description: `ClinicalTrials.gov Protocol. Status: ${overallStatus}. Phase: ${phases}. Conditions Investigated: ${conditions}. Lead Sponsor: ${leadSponsor}.`,
        previewUrl: studyUrl,
        downloadUrl: `https://clinicaltrials.gov/api/v2/studies/${nctId}?format=json`,
        providerId: 'nih_clinical_trials',
        providerName: 'NIH ClinicalTrials.gov Protocol Registry',
        resourceUrl: studyUrl,
        externalId: nctId,
        creatorName: leadSponsor,
        creatorOrg: 'National Library of Medicine (NIH)',
        rawLicense: 'Public Domain (US Government Health Data)',
        licenseUrl: 'https://clinicaltrials.gov/about-site/terms-conditions',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'json',
          tags: ['clinical-trials', 'medicine', 'nih', nctId, 'healthcare', overallStatus.toLowerCase()]
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('nih_clinical_trials', err.message);
    return [];
  }
}

// ============================================================================
// 3. CBS Radio Mystery Theater Complete Archive
// ============================================================================
export async function queryArchiveCbsMysteryTheater(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'ghost';
  const searchQuery = `collection:(cbs_radio_mystery_theater) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,year,downloads&sort[]=downloads desc&rows=16&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_cbs_mystery_theater', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const year = doc.year || '1970s';
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const audioUrl = `https://archive.org/download/${id}/${id}.mp3`;

      return buildResourceItem({
        id: `ia-cbs-m-th-${id}`,
        title: `${title} [CBS Mystery Theater]`,
        category: 'audio',
        description: `CBS Radio Mystery Theater full broadcast episode hosted by E.G. Marshall. Features suspense, supernatural thrillers, gothic tales, and psychological drama.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: audioUrl,
        providerId: 'archive_cbs_mystery_theater',
        providerName: 'CBS Radio Mystery Theater Complete Archive',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: 'Himan Brown / E.G. Marshall (CBS Radio)',
        rawLicense: 'Public Domain / Historic Radio Drama',
        licenseUrl: 'https://archive.org/details/cbs_radio_mystery_theater',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'mp3',
          isStreamable: true,
          year: typeof doc.year === 'number' ? doc.year : parseInt(doc.year, 10) || undefined,
          tags: ['cbs-radio', 'mystery-theater', 'suspense', 'audio-drama', 'old-time-radio']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_cbs_mystery_theater', err.message);
    return [];
  }
}

// ============================================================================
// 4. International Demoscene Art & Music
// ============================================================================
export async function queryArchiveDemoscene(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'amiga';
  const searchQuery = `collection:(demoscene) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,year,downloads&sort[]=downloads desc&rows=16&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_demoscene', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const creator = doc.creator || 'Demoscene Group';
      const year = doc.year || '1990s';
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const mediaUrl = `https://archive.org/download/${id}/${id}.mp4`;

      return buildResourceItem({
        id: `ia-demo-${id}`,
        title: `${title} (${year}) [Demoscene]`,
        category: 'art',
        description: `International demoscene computer production. Group/Author: ${creator}. Featuring real-time procedural graphics, 3D rasterizers, and tracker chiptunes.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: mediaUrl,
        providerId: 'archive_demoscene',
        providerName: 'International Demoscene Art & Music',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: creator,
        rawLicense: 'Demoscene Community Freeware / Creative Commons',
        licenseUrl: 'https://archive.org/details/demoscene',
        providerDefaultLicense: {
          type: 'Creative Commons',
          commercialAllowed: false,
          attributionRequired: true
        },
        attributes: {
          year: typeof doc.year === 'number' ? doc.year : parseInt(doc.year, 10) || undefined,
          tags: ['demoscene', 'chiptune', 'pixel-art', 'procedural-graphics', 'amiga', 'pc-demo']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_demoscene', err.message);
    return [];
  }
}

// ============================================================================
// 5. Aviation History & Flight Operations Manuals
// ============================================================================
export async function queryArchiveFlightManuals(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'boeing';
  const searchQuery = `collection:(flightmanuals) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,year,downloads&sort[]=downloads desc&rows=16&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_flight_manuals', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const creator = doc.creator || 'Aviation Manufacturer / Air Force';
      const year = doc.year || 'Historical';
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const pdfUrl = `https://archive.org/download/${id}/${id}.pdf`;

      return buildResourceItem({
        id: `ia-flight-${id}`,
        title: `${title} [Flight Manual]`,
        category: 'books',
        description: `Official aircraft flight manual, pilot operating handbook (POH), emergency checklist, or aircraft systems guide. Publisher/Author: ${creator}.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: pdfUrl,
        providerId: 'archive_flight_manuals',
        providerName: 'Aviation History & Flight Operations Manuals',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: creator,
        rawLicense: 'Historical Flight Documentation / Open Access',
        licenseUrl: 'https://archive.org/details/flightmanuals',
        providerDefaultLicense: {
          type: 'Historical Documentation',
          commercialAllowed: false,
          attributionRequired: true
        },
        attributes: {
          format: 'pdf',
          year: typeof doc.year === 'number' ? doc.year : parseInt(doc.year, 10) || undefined,
          tags: ['aviation', 'flight-manual', 'cockpit', 'aerospace', 'pilot-handbook', 'aircraft']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_flight_manuals', err.message);
    return [];
  }
}

// ============================================================================
// 6. Historical Costume & Fashion Plates (18th-20th C.)
// ============================================================================
export async function queryArchiveVintageFashion(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'dress';
  const searchQuery = `collection:(costume_plates) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,year,downloads&sort[]=downloads desc&rows=16&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_vintage_fashion', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const creator = doc.creator || 'Costume Designer / Fashion House';
      const year = doc.year || '19th Century';
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const imgUrl = `https://archive.org/download/${id}/${id}.jpg`;

      return buildResourceItem({
        id: `ia-costume-${id}`,
        title: `${title} (${year}) [Fashion Plate]`,
        category: 'art',
        description: `Historical hand-colored fashion plate or theatrical costume engraving. Couturier/Illustrator: ${creator}. Preserved in the Costume & Fashion Plates Collection.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: imgUrl,
        providerId: 'archive_vintage_fashion',
        providerName: 'Historical Costume & Fashion Plates (18th-20th C.)',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: creator,
        rawLicense: 'Public Domain (Historic Fashion Plates)',
        licenseUrl: 'https://archive.org/details/costume_plates',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'jpg',
          year: typeof doc.year === 'number' ? doc.year : parseInt(doc.year, 10) || undefined,
          tags: ['fashion-history', 'costume-design', 'vintage-couture', 'engraving', 'fashion-plates']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_vintage_fashion', err.message);
    return [];
  }
}

// ============================================================================
// 7. Spoken Word Classic Literature & Poetry
// ============================================================================
export async function queryArchiveVintageAudiobooks(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'poetry';
  const searchQuery = `collection:(audio_bookspoetry) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,year,downloads&sort[]=downloads desc&rows=16&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_vintage_audiobooks', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const creator = doc.creator || 'Voice Performer / Author';
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const audioUrl = `https://archive.org/download/${id}/${id}.mp3`;

      return buildResourceItem({
        id: `ia-spoken-${id}`,
        title: `${title} [Spoken Word / Poetry]`,
        category: 'audio',
        description: `Spoken word literary performance, poetry reading, or dramatic narration. Performer/Author: ${creator}. Free streaming audio playback.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: audioUrl,
        providerId: 'archive_vintage_audiobooks',
        providerName: 'Spoken Word Classic Literature & Poetry',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: creator,
        rawLicense: 'Public Domain / Open Spoken Word',
        licenseUrl: 'https://archive.org/details/audio_bookspoetry',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'mp3',
          isStreamable: true,
          tags: ['poetry', 'spoken-word', 'literature', 'recitation', 'audiobook']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_vintage_audiobooks', err.message);
    return [];
  }
}

// ============================================================================
// 8. Classic Drive-In Theater Intermission Reels
// ============================================================================
export async function queryArchiveDriveInIntermissions(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'intermission';
  const searchQuery = `collection:(drive_in_movie_ads) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,year,downloads&sort[]=downloads desc&rows=16&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_drive_in_intermissions', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const videoUrl = `https://archive.org/download/${id}/${id}.mp4`;

      return buildResourceItem({
        id: `ia-drivein-${id}`,
        title: `${title} [Drive-In Intermission Reel]`,
        category: 'videos',
        description: `Nostalgic 1950s/1960s drive-in cinema intermission reel, concession stand animation, and countdown reel. Preserved from original 35mm motion picture film.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: videoUrl,
        providerId: 'archive_drive_in_intermissions',
        providerName: 'Classic Drive-In Theater Intermission Reels',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: 'Drive-In Theater Intermission Producers',
        rawLicense: 'Public Domain / Nostalgic Cinema Heritage',
        licenseUrl: 'https://archive.org/details/drive_in_movie_ads',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'mp4',
          tags: ['drive-in', 'intermission', 'cinema-ads', '1950s', 'retro-americana', 'film-reels']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_drive_in_intermissions', err.message);
    return [];
  }
}

// ============================================================================
// 9. Historical Software & Digital Computing Showcase
// ============================================================================
export async function queryArchiveHistoricSoftware(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'unix';
  const searchQuery = `collection:(historicalsoftware) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,year,downloads&sort[]=downloads desc&rows=16&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_historic_software', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const creator = doc.creator || 'Software Pioneer';
      const year = doc.year || '1980s';
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const zipUrl = `https://archive.org/download/${id}/${id}.zip`;

      return buildResourceItem({
        id: `ia-hist-sw-${id}`,
        title: `${title} (${year}) [Historic Software]`,
        category: 'code',
        description: `Landmark historic software package, operating system distribution, or early computer compiler. Pioneer/Publisher: ${creator}. Preserved in the Historical Software Archive.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: zipUrl,
        providerId: 'archive_historic_software',
        providerName: 'Historical Software & Digital Computing Showcase',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: creator,
        rawLicense: 'Historical Software Preservation / Open Access',
        licenseUrl: 'https://archive.org/details/historicalsoftware',
        providerDefaultLicense: {
          type: 'Historical Preservation',
          commercialAllowed: false,
          attributionRequired: true
        },
        attributes: {
          format: 'zip',
          year: typeof doc.year === 'number' ? doc.year : parseInt(doc.year, 10) || undefined,
          tags: ['software-history', 'operating-systems', 'computing', 'compilers', 'retro-software']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_historic_software', err.message);
    return [];
  }
}

// ============================================================================
// 10. Atomic Age Sci-Fi & Drive-In Cinema Classics
// ============================================================================
export async function queryArchiveClassicSciFiMovies(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'moon';
  const searchQuery = `collection:(SciFi_Horror) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,year,downloads,director&sort[]=downloads desc&rows=16&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_classic_sci_fi_movies', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const director = doc.director || doc.creator || 'Sci-Fi Film Director';
      const year = doc.year || '1950s';
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const videoUrl = `https://archive.org/download/${id}/${id}.mp4`;

      return buildResourceItem({
        id: `ia-scifi-mov-${id}`,
        title: `${title} (${year}) [Sci-Fi Classic]`,
        category: 'videos',
        description: `Golden Age Atomic Era science fiction motion picture. Directed by ${director}. Features vintage special effects, rocket travel, alien encounters, and drive-in nostalgia.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: videoUrl,
        providerId: 'archive_classic_sci_fi_movies',
        providerName: 'Atomic Age Sci-Fi & Drive-In Cinema Classics',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: director,
        rawLicense: 'Public Domain (Classic Sci-Fi Cinema)',
        licenseUrl: 'https://archive.org/details/SciFi_Horror',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'mp4',
          year: typeof doc.year === 'number' ? doc.year : parseInt(doc.year, 10) || undefined,
          tags: ['scifi', 'classic-movies', '1950s', 'space-cinema', 'drive-in', 'public-domain']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_classic_sci_fi_movies', err.message);
    return [];
  }
}
