import { ResourceItem } from '../../src/types/resource';
import { buildResourceItem } from '../normalizer';
import { registerTracker, recordProviderSuccess, recordProviderFailure } from '../telemetry';

const USER_AGENT = 'URMIL-Universal-Browser/1.0 (https://ai.studio; contact: team@urmil.org)';

// ============================================================================
// Provider Telemetry Registrations
// ============================================================================

registerTracker({
  id: 'archive_historical_menus',
  name: 'Historical Restaurant & Ocean Liner Menus (1850s-1980s)',
  category: 'Food & Art',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_sherlock_holmes_radio',
  name: 'Sherlock Holmes Golden Age Radio Mysteries',
  category: 'Audio',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_weird_tales',
  name: 'Weird Tales & Classic Supernatural Pulp Archive',
  category: 'Books',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_astronomy_heritage',
  name: 'Historical Observatory Sky Surveys & Lunar Atlases',
  category: 'NASA & Datasets',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_classic_horror',
  name: 'Classic Gothic Horror & Monster Cinema (1920s-1960s)',
  category: 'Videos',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_tin_pan_alley',
  name: 'Tin Pan Alley & Broadway Sheet Music Lithographs',
  category: 'Art & Music',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_oral_history',
  name: 'Historical Eyewitness Testimonies & Spoken Memoirs',
  category: 'Audio',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_trade_catalogs',
  name: 'Industrial Machinery & Craft Tool Trade Catalogs',
  category: 'Books',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_naturalist_expeditions',
  name: 'Naturalist Field Notes & Historical Expedition Journals',
  category: 'Biodiversity',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_ham_radio_technical',
  name: 'Vintage Ham Radio & Vacuum Tube Schematics',
  category: 'Code & Technology',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_childrens_audio_classics',
  name: 'Golden Age Children\'s Storybook Audio & Fables',
  category: 'Audio',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'rest_countries_geo',
  name: 'REST Countries Global Geopolitical Database',
  category: 'Datasets & Maps',
  rateLimit: 'Public Open Access (Unlimited)',
  authRequired: false,
  authConfigured: true
});

// ============================================================================
// 1. Historical Restaurant & Ocean Liner Menus (1850s-1980s)
// ============================================================================
export async function queryArchiveHistoricalMenus(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'dinner';
  const searchQuery = `collection:(historicalmenus) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,year,downloads,date&sort[]=downloads desc&rows=16&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_historical_menus', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const restaurant = doc.creator || 'Historic Dining Establishment';
      const year = doc.year || doc.date || 'Historical Era';
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const pdfUrl = `https://archive.org/download/${id}/${id}.pdf`;

      return buildResourceItem({
        id: `ia-menu-${id}`,
        title: `${title} (${year}) [Vintage Menu]`,
        category: 'food',
        description: `Historical dining menu preserved in the Historical Menus Collection. Dining venue/Liner: ${restaurant}. Features period culinary offerings, wine lists, and vintage graphic typography.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: pdfUrl,
        providerId: 'archive_historical_menus',
        providerName: 'Historical Restaurant & Ocean Liner Menus (1850s-1980s)',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: restaurant,
        rawLicense: 'Public Domain / Historical Ephemera',
        licenseUrl: 'https://archive.org/details/historicalmenus',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'pdf',
          year: typeof doc.year === 'number' ? doc.year : parseInt(doc.year, 10) || undefined,
          tags: ['vintage-menu', 'gastronomy', 'culinary-history', 'ephemera', 'ocean-liner', 'dining']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_historical_menus', err.message);
    return [];
  }
}

// ============================================================================
// 2. Sherlock Holmes Golden Age Radio Mysteries
// ============================================================================
export async function queryArchiveSherlockHolmesRadio(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'sherlock';
  const searchQuery = `collection:(sherlockholmes_otr) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,year,downloads&sort[]=downloads desc&rows=16&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_sherlock_holmes_radio', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const year = doc.year || '1940s';
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const audioUrl = `https://archive.org/download/${id}/${id}.mp3`;

      return buildResourceItem({
        id: `ia-sherlock-${id}`,
        title: `${title} [Sherlock Holmes Radio Mystery]`,
        category: 'audio',
        description: `The New Adventures of Sherlock Holmes original radio broadcast starring Basil Rathbone as Holmes and Nigel Bruce as Dr. Watson. Written by Denis Green and Anthony Boucher.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: audioUrl,
        providerId: 'archive_sherlock_holmes_radio',
        providerName: 'Sherlock Holmes Golden Age Radio Mysteries',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: 'Sir Arthur Conan Doyle / Basil Rathbone & Nigel Bruce',
        rawLicense: 'Public Domain / Historic Radio Drama',
        licenseUrl: 'https://archive.org/details/sherlockholmes_otr',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'mp3',
          isStreamable: true,
          year: typeof doc.year === 'number' ? doc.year : parseInt(doc.year, 10) || undefined,
          tags: ['sherlock-holmes', 'conan-doyle', 'radio-mystery', 'old-time-radio', 'watson', 'detective']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_sherlock_holmes_radio', err.message);
    return [];
  }
}

// ============================================================================
// 3. Weird Tales & Classic Supernatural Pulp Archive
// ============================================================================
export async function queryArchiveWeirdTales(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'weird';
  const searchQuery = `collection:(pulpmagazinearchive) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,year,downloads&sort[]=downloads desc&rows=16&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_weird_tales', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const year = doc.year || '1930s';
      const creator = doc.creator || 'Pulp Fiction Publishers';
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const pdfUrl = `https://archive.org/download/${id}/${id}.pdf`;

      return buildResourceItem({
        id: `ia-weird-${id}`,
        title: `${title} (${year}) [Classic Pulp Magazine]`,
        category: 'books',
        description: `Vintage pulp magazine scanned from the Pulp Magazine Archive. Publisher: ${creator}. Featuring classic dark fantasy, weird fiction, cosmic horror, and iconic illustrated cover art.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: pdfUrl,
        providerId: 'archive_weird_tales',
        providerName: 'Weird Tales & Classic Supernatural Pulp Archive',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: creator,
        rawLicense: 'Public Domain / Open Pulp Fiction',
        licenseUrl: 'https://archive.org/details/pulpmagazinearchive',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'pdf',
          year: typeof doc.year === 'number' ? doc.year : parseInt(doc.year, 10) || undefined,
          tags: ['pulp-magazine', 'weird-tales', 'dark-fantasy', 'horror', 'vintage-illustration', 'scifi']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_weird_tales', err.message);
    return [];
  }
}

// ============================================================================
// 4. Historical Observatory Sky Surveys & Lunar Atlases
// ============================================================================
export async function queryArchiveAstronomyHeritage(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'nebula';
  const searchQuery = `collection:(astronomy) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,year,downloads&sort[]=downloads desc&rows=16&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_astronomy_heritage', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const observatory = doc.creator || 'Astronomical Observatory';
      const year = doc.year || 'Historical';
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const pdfUrl = `https://archive.org/download/${id}/${id}.pdf`;

      return buildResourceItem({
        id: `ia-astro-${id}`,
        title: `${title} (${year}) [Astronomy Survey]`,
        category: 'datasets',
        description: `Historic astronomical survey atlas, stellar spectroscopic plates, or lunar surface maps. Observatory/Astronomer: ${observatory}. Preserved in the Astronomy Heritage Archive.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: pdfUrl,
        providerId: 'archive_astronomy_heritage',
        providerName: 'Historical Observatory Sky Surveys & Lunar Atlases',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: observatory,
        rawLicense: 'Public Domain / Open Astronomy Heritage',
        licenseUrl: 'https://archive.org/details/astronomy',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'pdf',
          year: typeof doc.year === 'number' ? doc.year : parseInt(doc.year, 10) || undefined,
          tags: ['astronomy', 'observatory', 'lunar-atlas', 'telescope', 'astrophysics', 'stellar-catalog']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_astronomy_heritage', err.message);
    return [];
  }
}

// ============================================================================
// 5. Classic Gothic Horror & Monster Cinema (1920s-1960s)
// ============================================================================
export async function queryArchiveClassicHorror(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'vampire';
  const searchQuery = `collection:(classic_horror) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,year,downloads,director&sort[]=downloads desc&rows=16&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_classic_horror', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const director = doc.director || doc.creator || 'Horror Cinema Pioneer';
      const year = doc.year || 'Classic Era';
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const videoUrl = `https://archive.org/download/${id}/${id}.mp4`;

      return buildResourceItem({
        id: `ia-horror-${id}`,
        title: `${title} (${year}) [Classic Horror Film]`,
        category: 'videos',
        description: `Public domain gothic horror feature or early creature movie. Director/Studio: ${director}. Preserved in the Classic Horror Cinema Archive with streamable video.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: videoUrl,
        providerId: 'archive_classic_horror',
        providerName: 'Classic Gothic Horror & Monster Cinema (1920s-1960s)',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: director,
        rawLicense: 'Public Domain (Classic Horror Cinema)',
        licenseUrl: 'https://archive.org/details/classic_horror',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'mp4',
          year: typeof doc.year === 'number' ? doc.year : parseInt(doc.year, 10) || undefined,
          tags: ['horror', 'gothic', 'vampire', 'monster-movie', 'classic-cinema', 'public-domain']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_classic_horror', err.message);
    return [];
  }
}

// ============================================================================
// 6. Tin Pan Alley & Broadway Sheet Music Lithographs
// ============================================================================
export async function queryArchiveTinPanAlley(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'waltz';
  const searchQuery = `collection:(sheetmusic) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,year,downloads&sort[]=downloads desc&rows=16&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_tin_pan_alley', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const composer = doc.creator || 'Tin Pan Alley Composer';
      const year = doc.year || '1900s-1920s';
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const pdfUrl = `https://archive.org/download/${id}/${id}.pdf`;

      return buildResourceItem({
        id: `ia-tpa-${id}`,
        title: `${title} (${year}) [Tin Pan Alley Score]`,
        category: 'art',
        description: `Original vintage Tin Pan Alley piano sheet music with ornate illustrated cover lithograph. Composer/Lyricist: ${composer}. High-resolution PDF score download.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: pdfUrl,
        providerId: 'archive_tin_pan_alley',
        providerName: 'Tin Pan Alley & Broadway Sheet Music Lithographs',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: composer,
        rawLicense: 'Public Domain (Historic Musical Scores)',
        licenseUrl: 'https://archive.org/details/sheetmusic',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'pdf',
          year: typeof doc.year === 'number' ? doc.year : parseInt(doc.year, 10) || undefined,
          tags: ['tin-pan-alley', 'sheet-music', 'lithograph', 'piano-score', 'vintage-music', 'broadway']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_tin_pan_alley', err.message);
    return [];
  }
}

// ============================================================================
// 7. Historical Eyewitness Testimonies & Spoken Memoirs
// ============================================================================
export async function queryArchiveOralHistory(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'interview';
  const searchQuery = `collection:(oralhistory) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,year,downloads&sort[]=downloads desc&rows=16&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_oral_history', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const speaker = doc.creator || 'Oral History Narrator';
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const audioUrl = `https://archive.org/download/${id}/${id}.mp3`;

      return buildResourceItem({
        id: `ia-oral-${id}`,
        title: `${title} [Oral History Interview]`,
        category: 'audio',
        description: `Primary source oral history audio recording. Eyewitness narrator/Interviewee: ${speaker}. Features first-person recollections of significant 20th-century historical events.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: audioUrl,
        providerId: 'archive_oral_history',
        providerName: 'Historical Eyewitness Testimonies & Spoken Memoirs',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: speaker,
        rawLicense: 'Creative Commons / Educational Oral History Archive',
        licenseUrl: 'https://archive.org/details/oralhistory',
        providerDefaultLicense: {
          type: 'Creative Commons',
          commercialAllowed: false,
          attributionRequired: true
        },
        attributes: {
          format: 'mp3',
          isStreamable: true,
          tags: ['oral-history', 'first-person', 'memoirs', 'eyewitness', 'historical-interview', 'audio']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_oral_history', err.message);
    return [];
  }
}

// ============================================================================
// 8. Industrial Machinery & Craft Tool Trade Catalogs
// ============================================================================
export async function queryArchiveTradeCatalogs(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'machinery';
  const searchQuery = `collection:(tradecatalogs) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,year,downloads&sort[]=downloads desc&rows=16&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_trade_catalogs', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const manufacturer = doc.creator || 'Foundry / Machinery Works';
      const year = doc.year || 'Historical';
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const pdfUrl = `https://archive.org/download/${id}/${id}.pdf`;

      return buildResourceItem({
        id: `ia-trade-cat-${id}`,
        title: `${title} (${year}) [Trade Catalog]`,
        category: 'books',
        description: `19th- or early 20th-century commercial trade catalog. Manufacturer/Foundry: ${manufacturer}. Detailed engravings of machine tools, steam engines, architectural hardware, and craft implements.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: pdfUrl,
        providerId: 'archive_trade_catalogs',
        providerName: 'Industrial Machinery & Craft Tool Trade Catalogs',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: manufacturer,
        rawLicense: 'Public Domain / Historical Trade Literature',
        licenseUrl: 'https://archive.org/details/tradecatalogs',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'pdf',
          year: typeof doc.year === 'number' ? doc.year : parseInt(doc.year, 10) || undefined,
          tags: ['trade-catalog', 'machinery', 'tools', 'industrial-history', 'engraving', 'craftsmanship']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_trade_catalogs', err.message);
    return [];
  }
}

// ============================================================================
// 9. Naturalist Field Notes & Historical Expedition Journals
// ============================================================================
export async function queryArchiveNaturalistExpeditions(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'botanical';
  const searchQuery = `collection:(fieldnotes) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,year,downloads&sort[]=downloads desc&rows=16&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_naturalist_expeditions', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const naturalist = doc.creator || 'Field Naturalist / Explorer';
      const year = doc.year || 'Historical';
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const pdfUrl = `https://archive.org/download/${id}/${id}.pdf`;

      return buildResourceItem({
        id: `ia-exped-${id}`,
        title: `${title} [Naturalist Field Notes]`,
        category: 'biodiversity',
        description: `Historical field journal or expedition notebook. Naturalist/Explorer: ${naturalist}. Handwritten observations, habitat descriptions, botanical drawings, and taxonomy logbooks.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: pdfUrl,
        providerId: 'archive_naturalist_expeditions',
        providerName: 'Naturalist Field Notes & Historical Expedition Journals',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: naturalist,
        rawLicense: 'Public Domain / Open Natural History Fieldwork',
        licenseUrl: 'https://archive.org/details/fieldnotes',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'pdf',
          year: typeof doc.year === 'number' ? doc.year : parseInt(doc.year, 10) || undefined,
          tags: ['field-notes', 'natural-history', 'expedition', 'botany', 'zoology', 'biodiversity']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_naturalist_expeditions', err.message);
    return [];
  }
}

// ============================================================================
// 10. Vintage Ham Radio & Vacuum Tube Schematics
// ============================================================================
export async function queryArchiveHamRadioTechnical(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'transmitter';
  const searchQuery = `collection:(hamradio) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,year,downloads&sort[]=downloads desc&rows=16&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_ham_radio_technical', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const creator = doc.creator || 'Amateur Radio League / Engineer';
      const year = doc.year || 'Historical';
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const pdfUrl = `https://archive.org/download/${id}/${id}.pdf`;

      return buildResourceItem({
        id: `ia-ham-${id}`,
        title: `${title} (${year}) [Ham Radio Schematic]`,
        category: 'code',
        description: `Vintage amateur radio engineering handbook, antenna schematic, or vacuum tube circuit guide. Publisher/Author: ${creator}. Technical heritage documentation.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: pdfUrl,
        providerId: 'archive_ham_radio_technical',
        providerName: 'Vintage Ham Radio & Vacuum Tube Schematics',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: creator,
        rawLicense: 'Open Technical Preservation / Public Domain',
        licenseUrl: 'https://archive.org/details/hamradio',
        providerDefaultLicense: {
          type: 'Historical Technical Preservation',
          commercialAllowed: false,
          attributionRequired: true
        },
        attributes: {
          format: 'pdf',
          year: typeof doc.year === 'number' ? doc.year : parseInt(doc.year, 10) || undefined,
          tags: ['ham-radio', 'electronics', 'schematics', 'vacuum-tubes', 'telecommunications', 'rf-engineering']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_ham_radio_technical', err.message);
    return [];
  }
}

// ============================================================================
// 11. Golden Age Children's Storybook Audio & Fables
// ============================================================================
export async function queryArchiveChildrensAudioClassics(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'fable';
  const searchQuery = `collection:(childrensrecords) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,year,downloads&sort[]=downloads desc&rows=16&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_childrens_audio_classics', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const narrator = doc.creator || 'Storybook Narrator / Children\'s Troupe';
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const audioUrl = `https://archive.org/download/${id}/${id}.mp3`;

      return buildResourceItem({
        id: `ia-kid-aud-${id}`,
        title: `${title} [Storybook Audio Record]`,
        category: 'audio',
        description: `Vintage children's storybook phonograph record with musical accompaniment and character voices. Narrator/Artist: ${narrator}. Preserved in the Children's Record Guild archive.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: audioUrl,
        providerId: 'archive_childrens_audio_classics',
        providerName: 'Golden Age Children\'s Storybook Audio & Fables',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: narrator,
        rawLicense: 'Public Domain / Historic Children\'s Records',
        licenseUrl: 'https://archive.org/details/childrensrecords',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'mp3',
          isStreamable: true,
          tags: ['childrens-audio', 'fables', 'fairytales', 'storytelling', 'vintage-records', 'spoken-word']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_childrens_audio_classics', err.message);
    return [];
  }
}

// ============================================================================
// 12. REST Countries Global Geopolitical Database
// ============================================================================
export async function queryRestCountriesGeo(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'united';
  const url = `https://restcountries.com/v3.1/name/${encodeURIComponent(cleanQ)}`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const countries = Array.isArray(data) ? data : [];
    recordProviderSuccess('rest_countries_geo', Date.now() - start);

    return countries.slice(0, 12).map((c: any) => {
      const commonName = c.name?.common || 'Nation';
      const officialName = c.name?.official || commonName;
      const capital = Array.isArray(c.capital) ? c.capital.join(', ') : (c.capital || 'N/A');
      const region = c.region || '';
      const subregion = c.subregion || '';
      const population = c.population ? c.population.toLocaleString() : 'N/A';
      const flagUrl = c.flags?.png || c.flags?.svg || undefined;
      const mapsUrl = c.maps?.openStreetMaps || `https://www.openstreetmap.org/search?query=${encodeURIComponent(commonName)}`;
      const cca2 = c.cca2 || '';
      const currencies = c.currencies ? Object.values(c.currencies).map((curr: any) => `${curr.name} (${curr.symbol || ''})`).join(', ') : 'N/A';
      const languages = c.languages ? Object.values(c.languages).join(', ') : 'N/A';
      const coords = Array.isArray(c.latlng) && c.latlng.length === 2 ? [c.latlng[0], c.latlng[1]] as [number, number] : undefined;

      return buildResourceItem({
        id: `geo-country-${cca2 || Math.random().toString(36).substring(7)}`,
        title: `${commonName} (${officialName})`,
        category: 'datasets',
        description: `Geopolitical Profile. Capital: ${capital}. Region: ${region} (${subregion}). Population: ${population}. Currencies: ${currencies}. Languages: ${languages}.`,
        thumbnailUrl: flagUrl,
        previewUrl: mapsUrl,
        downloadUrl: mapsUrl,
        providerId: 'rest_countries_geo',
        providerName: 'REST Countries Global Geopolitical Database',
        resourceUrl: mapsUrl,
        externalId: cca2,
        creatorName: 'REST Countries Consortium',
        creatorOrg: 'Open Geopolitical Data Project',
        rawLicense: 'Mozilla Public License 2.0 (Open Data)',
        licenseUrl: 'https://restcountries.com/',
        providerDefaultLicense: {
          type: 'MPL 2.0',
          commercialAllowed: true,
          attributionRequired: true
        },
        attributes: {
          region: `${region}, ${subregion}`.trim(),
          coordinates: coords,
          tags: ['geography', 'country', 'demographics', 'geopolitics', commonName.toLowerCase(), region.toLowerCase()]
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('rest_countries_geo', err.message);
    return [];
  }
}
