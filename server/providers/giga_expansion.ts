import { ResourceItem } from '../../src/types/resource';
import { buildResourceItem } from '../normalizer';
import { registerTracker, recordProviderSuccess, recordProviderFailure } from '../telemetry';

const USER_AGENT = 'URMIL-Universal-Browser/1.0 (https://ai.studio; contact: team@urmil.org)';

// ============================================================================
// Provider Telemetry Registrations
// ============================================================================

registerTracker({
  id: 'archive_dragnet_radio',
  name: 'Dragnet Golden Age Detective Radio OTR',
  category: 'Audio',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_vintage_seed_catalogs',
  name: 'Heirloom Seed & Botanical Nursery Catalogs (1850-1980)',
  category: 'Biodiversity & Art',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_classic_western_movies',
  name: 'Classic Western & Frontier Cinema Masterpieces',
  category: 'Videos',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_delta_blues',
  name: 'Early Delta Blues & Country Blues Field Recordings',
  category: 'Music',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_scientific_american_vintage',
  name: 'Scientific American Historical Archive (1845-1909)',
  category: 'Books & Science',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_jack_benny_comedy',
  name: 'The Jack Benny Program Golden Age Radio Comedy',
  category: 'Audio',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_architectural_pattern_books',
  name: 'Victorian Architectural Pattern & Carpentry Handbooks',
  category: 'Art & Books',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_vintage_sound_effects',
  name: 'Historic Foley & Radio Drama Sound Effects Archive',
  category: 'Audio',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_brewing_history',
  name: 'Historic Brewing Treatises & Zymurgy Heritage',
  category: 'Food & Science',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_vintage_magic_books',
  name: 'Houdini & Historic Conjuring Arts Manuals',
  category: 'Books',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_historic_microscopy',
  name: 'Historic Microscopy Drawings & Micro-Life Atlases',
  category: 'Biodiversity',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_wargame_simulations',
  name: 'Historical Tabletop Conflict Simulation & Wargame Manuals',
  category: 'Games',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

// ============================================================================
// 1. Dragnet Golden Age Detective Radio OTR
// ============================================================================
export async function queryArchiveDragnetRadio(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'friday';
  const searchQuery = `collection:(dragnet_otr) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,year,downloads&sort[]=downloads desc&rows=16&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_dragnet_radio', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const year = doc.year || '1950s';
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const audioUrl = `https://archive.org/download/${id}/${id}.mp3`;

      return buildResourceItem({
        id: `ia-dragnet-${id}`,
        title: `${title} [Dragnet Police Radio]`,
        category: 'audio',
        description: `Classic Dragnet radio drama broadcast starring Jack Webb as Sergeant Joe Friday. Authentic Los Angeles Police Department investigative procedural.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: audioUrl,
        providerId: 'archive_dragnet_radio',
        providerName: 'Dragnet Golden Age Detective Radio OTR',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: 'Jack Webb / NBC Radio Network',
        rawLicense: 'Public Domain / Historic Radio Drama',
        licenseUrl: 'https://archive.org/details/dragnet_otr',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'mp3',
          isStreamable: true,
          year: typeof doc.year === 'number' ? doc.year : parseInt(doc.year, 10) || undefined,
          tags: ['dragnet', 'jack-webb', 'joe-friday', 'detective', 'police-procedural', 'old-time-radio']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_dragnet_radio', err.message);
    return [];
  }
}

// ============================================================================
// 2. Heirloom Seed & Botanical Nursery Catalogs (1850-1980)
// ============================================================================
export async function queryArchiveVintageSeedCatalogs(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'tomato';
  const searchQuery = `collection:(usda-nurseryandseedcatalog) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,year,downloads&sort[]=downloads desc&rows=16&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_vintage_seed_catalogs', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const creator = doc.creator || 'Seed Nursery / Horticulturist';
      const year = doc.year || 'Historical';
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const pdfUrl = `https://archive.org/download/${id}/${id}.pdf`;

      return buildResourceItem({
        id: `ia-seed-${id}`,
        title: `${title} (${year}) [Heirloom Seed Catalog]`,
        category: 'biodiversity',
        description: `Historic heirloom seed and botanical nursery trade catalog. Publisher/Grower: ${creator}. Featuring vintage chromolithographs of heirloom fruits, vegetables, flowers, and horticultural lore.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: pdfUrl,
        providerId: 'archive_vintage_seed_catalogs',
        providerName: 'Heirloom Seed & Botanical Nursery Catalogs (1850-1980)',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: creator,
        rawLicense: 'Public Domain / Historical Agricultural Heritage',
        licenseUrl: 'https://archive.org/details/usda-nurseryandseedcatalog',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'pdf',
          year: typeof doc.year === 'number' ? doc.year : parseInt(doc.year, 10) || undefined,
          tags: ['botany', 'seeds', 'heirloom', 'gardening', 'horticulture', 'lithograph', 'biodiversity']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_vintage_seed_catalogs', err.message);
    return [];
  }
}

// ============================================================================
// 3. Classic Western & Frontier Cinema Masterpieces
// ============================================================================
export async function queryArchiveClassicWesternMovies(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'sheriff';
  const searchQuery = `collection:(western_films) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,year,downloads,director&sort[]=downloads desc&rows=16&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_classic_western_movies', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const director = doc.director || doc.creator || 'Western Film Director';
      const year = doc.year || 'Classic Era';
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const videoUrl = `https://archive.org/download/${id}/${id}.mp4`;

      return buildResourceItem({
        id: `ia-west-mov-${id}`,
        title: `${title} (${year}) [Classic Western]`,
        category: 'videos',
        description: `Golden Age Western feature film. Director/Star: ${director}. Preserved in the Western Motion Picture Collection with direct streamable video playback.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: videoUrl,
        providerId: 'archive_classic_western_movies',
        providerName: 'Classic Western & Frontier Cinema Masterpieces',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: director,
        rawLicense: 'Public Domain (Classic Western Cinema)',
        licenseUrl: 'https://archive.org/details/western_films',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'mp4',
          year: typeof doc.year === 'number' ? doc.year : parseInt(doc.year, 10) || undefined,
          tags: ['western', 'cowboy', 'frontier', 'classic-film', 'public-domain', 'cinema']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_classic_western_movies', err.message);
    return [];
  }
}

// ============================================================================
// 4. Early Delta Blues & Country Blues Field Recordings
// ============================================================================
export async function queryArchiveDeltaBlues(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'blues';
  const searchQuery = `collection:(78rpm_blues) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,year,downloads&sort[]=downloads desc&rows=16&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_delta_blues', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const artist = doc.creator || 'Blues Musician';
      const year = doc.year || '1920s-1930s';
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const audioUrl = `https://archive.org/download/${id}/${id}.mp3`;

      return buildResourceItem({
        id: `ia-blues-${id}`,
        title: `${title} (${year}) [Delta Blues Recording]`,
        category: 'music',
        description: `Acoustic Delta blues and country blues historic 78 RPM shellac recording. Artist: ${artist}. Raw acoustic guitars, slide guitar, harmonica, and authentic blues vocals.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: audioUrl,
        providerId: 'archive_delta_blues',
        providerName: 'Early Delta Blues & Country Blues Field Recordings',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: artist,
        rawLicense: 'Public Domain / Historic Blues Preservation',
        licenseUrl: 'https://archive.org/details/78rpm_blues',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'mp3',
          isStreamable: true,
          year: typeof doc.year === 'number' ? doc.year : parseInt(doc.year, 10) || undefined,
          tags: ['blues', 'delta-blues', 'country-blues', '78rpm', 'acoustic-blues', 'slide-guitar']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_delta_blues', err.message);
    return [];
  }
}

// ============================================================================
// 5. Scientific American Historical Archive (1845-1909)
// ============================================================================
export async function queryArchiveScientificAmericanVintage(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'electricity';
  const searchQuery = `collection:(scientificamerican) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,year,downloads&sort[]=downloads desc&rows=16&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_scientific_american_vintage', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const year = doc.year || '19th Century';
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const pdfUrl = `https://archive.org/download/${id}/${id}.pdf`;

      return buildResourceItem({
        id: `ia-sci-am-${id}`,
        title: `${title} [Scientific American Archive]`,
        category: 'books',
        description: `Historical issue of Scientific American from the Industrial Revolution. Features contemporary reports on steam power, telegraphy, electrical dynamos, locomotives, and pioneering patent inventions.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: pdfUrl,
        providerId: 'archive_scientific_american_vintage',
        providerName: 'Scientific American Historical Archive (1845-1909)',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: 'Munn & Company / Scientific American',
        rawLicense: 'Public Domain (Historic Periodical)',
        licenseUrl: 'https://archive.org/details/scientificamerican',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'pdf',
          year: typeof doc.year === 'number' ? doc.year : parseInt(doc.year, 10) || undefined,
          tags: ['scientific-american', 'inventions', 'industrial-revolution', 'patents', 'steam-power', 'technology']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_scientific_american_vintage', err.message);
    return [];
  }
}

// ============================================================================
// 6. The Jack Benny Program Golden Age Radio Comedy
// ============================================================================
export async function queryArchiveJackBennyComedy(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'benny';
  const searchQuery = `collection:(jackbenny) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,year,downloads&sort[]=downloads desc&rows=16&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_jack_benny_comedy', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const year = doc.year || '1940s/1950s';
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const audioUrl = `https://archive.org/download/${id}/${id}.mp3`;

      return buildResourceItem({
        id: `ia-benny-${id}`,
        title: `${title} [Jack Benny Radio Comedy]`,
        category: 'audio',
        description: `The Jack Benny Program original radio broadcast. Starring Jack Benny, Mary Livingstone, Rochester (Eddie Anderson), and Phil Harris. Golden Age radio comedy benchmark.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: audioUrl,
        providerId: 'archive_jack_benny_comedy',
        providerName: 'The Jack Benny Program Golden Age Radio Comedy',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: 'Jack Benny / CBS Radio Network',
        rawLicense: 'Public Domain / Historic Radio Comedy',
        licenseUrl: 'https://archive.org/details/jackbenny',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'mp3',
          isStreamable: true,
          year: typeof doc.year === 'number' ? doc.year : parseInt(doc.year, 10) || undefined,
          tags: ['jack-benny', 'comedy', 'radio-comedy', 'rochester', 'old-time-radio', 'humor']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_jack_benny_comedy', err.message);
    return [];
  }
}

// ============================================================================
// 7. Victorian Architectural Pattern & Carpentry Handbooks
// ============================================================================
export async function queryArchiveArchitecturalPatternBooks(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'cottage';
  const searchQuery = `collection:(architecturalpatternbooks) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,year,downloads&sort[]=downloads desc&rows=16&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_architectural_pattern_books', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const architect = doc.creator || 'Master Architect / Carpenter';
      const year = doc.year || '19th Century';
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const pdfUrl = `https://archive.org/download/${id}/${id}.pdf`;

      return buildResourceItem({
        id: `ia-arch-pat-${id}`,
        title: `${title} (${year}) [Architectural Pattern Book]`,
        category: 'art',
        description: `Historical architectural pattern book. Architect/Author: ${architect}. Complete with Victorian building elevations, floor plans, carpentry framing joinery, and ornate wood trim details.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: pdfUrl,
        providerId: 'archive_architectural_pattern_books',
        providerName: 'Victorian Architectural Pattern & Carpentry Handbooks',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: architect,
        rawLicense: 'Public Domain / Historical Architecture Heritage',
        licenseUrl: 'https://archive.org/details/architecturalpatternbooks',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'pdf',
          year: typeof doc.year === 'number' ? doc.year : parseInt(doc.year, 10) || undefined,
          tags: ['architecture', 'pattern-book', 'victorian', 'carpentry', 'floor-plans', 'elevations']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_architectural_pattern_books', err.message);
    return [];
  }
}

// ============================================================================
// 8. Historic Foley & Radio Drama Sound Effects Archive
// ============================================================================
export async function queryArchiveVintageSoundEffects(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'thunder';
  const searchQuery = `collection:(soundeffects) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,year,downloads&sort[]=downloads desc&rows=16&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_vintage_sound_effects', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const soundEngineer = doc.creator || 'Foley Artist / Sound Studio';
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const audioUrl = `https://archive.org/download/${id}/${id}.mp3`;

      return buildResourceItem({
        id: `ia-foley-${id}`,
        title: `${title} [Historic Foley SFX]`,
        category: 'audio',
        description: `Vintage foley sound effect from historic radio, theater, and cinema sound design libraries. Engineer: ${soundEngineer}. Free streaming and high-fidelity sound design resource.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: audioUrl,
        providerId: 'archive_vintage_sound_effects',
        providerName: 'Historic Foley & Radio Drama Sound Effects Archive',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: soundEngineer,
        rawLicense: 'Creative Commons / Public Domain Foley Effects',
        licenseUrl: 'https://archive.org/details/soundeffects',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'mp3',
          isStreamable: true,
          tags: ['sound-effects', 'foley', 'audio-production', 'sfx', 'radio-drama', 'sound-design']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_vintage_sound_effects', err.message);
    return [];
  }
}

// ============================================================================
// 9. Historic Brewing Treatises & Zymurgy Heritage
// ============================================================================
export async function queryArchiveBrewingHistory(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'fermentation';
  const searchQuery = `collection:(brewinghistory) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,year,downloads&sort[]=downloads desc&rows=16&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_brewing_history', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const author = doc.creator || 'Master Brewer / Chemist';
      const year = doc.year || 'Historical';
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const pdfUrl = `https://archive.org/download/${id}/${id}.pdf`;

      return buildResourceItem({
        id: `ia-brew-${id}`,
        title: `${title} [Brewing Treatise]`,
        category: 'food',
        description: `Historical brewing treatise, zymurgy scientific handbook, or heritage brewery recipe manual. Author: ${author}. Preserved in the Brewing History Collection.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: pdfUrl,
        providerId: 'archive_brewing_history',
        providerName: 'Historic Brewing Treatises & Zymurgy Heritage',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: author,
        rawLicense: 'Public Domain / Historical Brewing Lore',
        licenseUrl: 'https://archive.org/details/brewinghistory',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'pdf',
          year: typeof doc.year === 'number' ? doc.year : parseInt(doc.year, 10) || undefined,
          tags: ['brewing', 'zymurgy', 'fermentation', 'beer-history', 'craft-brewing', 'culinary-science']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_brewing_history', err.message);
    return [];
  }
}

// ============================================================================
// 10. Houdini & Historic Conjuring Arts Manuals
// ============================================================================
export async function queryArchiveVintageMagicBooks(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'magic';
  const searchQuery = `collection:(conjuringarts) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,year,downloads&sort[]=downloads desc&rows=16&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_vintage_magic_books', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const magician = doc.creator || 'Master Illusionist / Author';
      const year = doc.year || 'Historical';
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const pdfUrl = `https://archive.org/download/${id}/${id}.pdf`;

      return buildResourceItem({
        id: `ia-magic-${id}`,
        title: `${title} (${year}) [Conjuring Arts]`,
        category: 'books',
        description: `Rare historical stage magic manual, sleight of hand guide, or illusionism treatise. Author/Magician: ${magician}. Preserved in the Conjuring Arts Historical Collection.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: pdfUrl,
        providerId: 'archive_vintage_magic_books',
        providerName: 'Houdini & Historic Conjuring Arts Manuals',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: magician,
        rawLicense: 'Public Domain / Historic Conjuring Arts',
        licenseUrl: 'https://archive.org/details/conjuringarts',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'pdf',
          year: typeof doc.year === 'number' ? doc.year : parseInt(doc.year, 10) || undefined,
          tags: ['magic', 'conjuring', 'illusionism', 'houdini', 'sleight-of-hand', 'stage-magic']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_vintage_magic_books', err.message);
    return [];
  }
}

// ============================================================================
// 11. Historic Microscopy Drawings & Micro-Life Atlases
// ============================================================================
export async function queryArchiveHistoricMicroscopy(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'diatom';
  const searchQuery = `collection:(microscopy) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,year,downloads&sort[]=downloads desc&rows=16&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_historic_microscopy', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const microscopist = doc.creator || 'Microscopist / Naturalist';
      const year = doc.year || 'Historical';
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const pdfUrl = `https://archive.org/download/${id}/${id}.pdf`;

      return buildResourceItem({
        id: `ia-micro-${id}`,
        title: `${title} [Microscopy Atlas]`,
        category: 'biodiversity',
        description: `Historic microscopic atlas or optical investigation treatise. Microscopist: ${microscopist}. Featuring intricate engravings of diatoms, radiolaria, infusoria, and cellular biology.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: pdfUrl,
        providerId: 'archive_historic_microscopy',
        providerName: 'Historic Microscopy Drawings & Micro-Life Atlases',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: microscopist,
        rawLicense: 'Public Domain / Open Scientific Heritage',
        licenseUrl: 'https://archive.org/details/microscopy',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'pdf',
          year: typeof doc.year === 'number' ? doc.year : parseInt(doc.year, 10) || undefined,
          tags: ['microscopy', 'micro-life', 'diatoms', 'biology', 'cells', 'scientific-illustration']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_historic_microscopy', err.message);
    return [];
  }
}

// ============================================================================
// 12. Historical Tabletop Conflict Simulation & Wargame Manuals
// ============================================================================
export async function queryArchiveWargameSimulations(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'tactical';
  const searchQuery = `collection:(wargaming) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,year,downloads&sort[]=downloads desc&rows=16&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_wargame_simulations', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const designer = doc.creator || 'Game Designer / Military Historian';
      const year = doc.year || 'Historical';
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const pdfUrl = `https://archive.org/download/${id}/${id}.pdf`;

      return buildResourceItem({
        id: `ia-wargame-${id}`,
        title: `${title} [Conflict Simulation]`,
        category: 'games',
        description: `Vintage historical tabletop conflict simulation rulebook, tactical scenario guide, or hex wargame manual. Designer/Publisher: ${designer}.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: pdfUrl,
        providerId: 'archive_wargame_simulations',
        providerName: 'Historical Tabletop Conflict Simulation & Wargame Manuals',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: designer,
        rawLicense: 'Historical Simulation Preservation / Open Access',
        licenseUrl: 'https://archive.org/details/wargaming',
        providerDefaultLicense: {
          type: 'Historical Simulation Preservation',
          commercialAllowed: false,
          attributionRequired: true
        },
        attributes: {
          format: 'pdf',
          year: typeof doc.year === 'number' ? doc.year : parseInt(doc.year, 10) || undefined,
          tags: ['wargames', 'tabletop', 'military-history', 'strategy', 'simulation', 'hex-grid']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_wargame_simulations', err.message);
    return [];
  }
}
