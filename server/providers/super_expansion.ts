import { ResourceItem } from '../../src/types/resource';
import { buildResourceItem } from '../normalizer';
import { registerTracker, recordProviderSuccess, recordProviderFailure } from '../telemetry';

const USER_AGENT = 'URMIL-Universal-Browser/1.0 (https://ai.studio; contact: team@urmil.org)';

// ============================================================================
// Provider Telemetry Registrations
// ============================================================================

registerTracker({
  id: 'archive_film_noir',
  name: 'Internet Archive Film Noir Masterpieces',
  category: 'Videos',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_speedruns',
  name: 'Video Game Speedruns & Longplays Archive',
  category: 'Videos',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_bhl_botany',
  name: 'Biodiversity Heritage Library Historic Volumes',
  category: 'Biodiversity',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'nih_pubchem',
  name: 'NIH National Library of Medicine PubChem',
  category: 'Datasets',
  rateLimit: 'Public Open Access (NIH / NLM)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_apollo_audio',
  name: 'NASA Apollo Lunar Mission Audio Archives',
  category: 'Audio',
  rateLimit: 'Public Open Access (NASA / Public Domain)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_historic_radio_news',
  name: '20th Century Historic Radio News Broadcasts',
  category: 'Audio',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_computer_manuals',
  name: 'Vintage Computer Manuals & Schematics',
  category: 'Books',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_golden_age_comics',
  name: 'Golden Age Comics & Graphic Novels (1930s-1950s)',
  category: 'Books',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_us_patents',
  name: 'US Patent Office Historic Inventions & Schematics',
  category: 'Datasets',
  rateLimit: 'Public Open Access (US Patent Office / Public Domain)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_david_rumsey_maps',
  name: 'Historical Cartography & Antique World Maps',
  category: 'Maps',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

// ============================================================================
// 1. Internet Archive Film Noir Masterpieces
// ============================================================================
export async function queryArchiveFilmNoir(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'noir';
  const searchQuery = `collection:(film_noir) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,year,downloads,director&sort[]=downloads desc&rows=16&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_film_noir', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const year = doc.year || '1940s/1950s';
      const director = doc.director || doc.creator || 'Classic Cinema Director';
      const downloads = doc.downloads ? Number(doc.downloads) : undefined;
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const videoUrl = `https://archive.org/download/${id}/${id}.mp4`;

      return buildResourceItem({
        id: `ia-noir-${id}`,
        title: `${title} (${year}) [Film Noir]`,
        category: 'videos',
        description: `Public domain Film Noir cinematic classic. Directed by ${director}. Features iconic high-contrast chiaroscuro cinematography, hardboiled narrative, and dramatic suspense.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: videoUrl,
        providerId: 'archive_film_noir',
        providerName: 'Internet Archive Film Noir Masterpieces',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: director,
        rawLicense: 'Public Domain (Film Noir Classics)',
        licenseUrl: 'https://archive.org/details/film_noir',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'mp4',
          year: typeof doc.year === 'number' ? doc.year : parseInt(doc.year, 10) || undefined,
          downloads,
          tags: ['film-noir', 'classic-movies', 'cinema', 'public-domain', '1940s', '1950s']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_film_noir', err.message);
    return [];
  }
}

// ============================================================================
// 2. Video Game Speedruns & Longplays Archive
// ============================================================================
export async function queryArchiveSpeedruns(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'mario';
  const searchQuery = `collection:(speed_runs) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,year,downloads&sort[]=downloads desc&rows=16&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_speedruns', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const downloads = doc.downloads ? Number(doc.downloads) : undefined;
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const videoUrl = `https://archive.org/download/${id}/${id}.mp4`;

      return buildResourceItem({
        id: `ia-speed-${id}`,
        title: `${title} [Speedrun / Longplay]`,
        category: 'videos',
        description: `Documented video game speedrun, TAS playthrough, or complete walkthrough from the Speedruns Archive. Playable MP4 stream.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: videoUrl,
        providerId: 'archive_speedruns',
        providerName: 'Video Game Speedruns & Longplays Archive',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: doc.creator || 'Speedrun Community',
        rawLicense: 'Creative Commons / Gameplay Documentation',
        licenseUrl: 'https://archive.org/details/speed_runs',
        providerDefaultLicense: {
          type: 'Creative Commons',
          commercialAllowed: false,
          attributionRequired: true
        },
        attributes: {
          format: 'mp4',
          downloads,
          tags: ['speedrun', 'longplay', 'gaming', 'walkthrough', 'retrogaming', 'tas']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_speedruns', err.message);
    return [];
  }
}

// ============================================================================
// 3. Biodiversity Heritage Library Historic Volumes
// ============================================================================
export async function queryArchiveBhlBotany(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'flora';
  const searchQuery = `collection:(biodiversity) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,year,downloads&sort[]=downloads desc&rows=16&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_bhl_botany', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const creator = doc.creator || 'Naturalist / Botanist';
      const year = doc.year || 'Historical';
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const pdfUrl = `https://archive.org/download/${id}/${id}.pdf`;

      return buildResourceItem({
        id: `ia-bhl-${id}`,
        title: `${title} (${year})`,
        category: 'biodiversity',
        description: `Digitized rare natural history treatise from the Biodiversity Heritage Library. Author: ${creator}. Featuring botanical illustrations, zoological descriptions, and taxonomy monographs.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: pdfUrl,
        providerId: 'archive_bhl_botany',
        providerName: 'Biodiversity Heritage Library Historic Volumes',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: creator,
        creatorOrg: 'Biodiversity Heritage Library Consortium',
        rawLicense: 'Public Domain / Open Access Natural History',
        licenseUrl: 'https://archive.org/details/biodiversity',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'pdf',
          year: typeof doc.year === 'number' ? doc.year : parseInt(doc.year, 10) || undefined,
          tags: ['biodiversity', 'botany', 'zoology', 'natural-history', 'bhl', 'public-domain']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_bhl_botany', err.message);
    return [];
  }
}

// ============================================================================
// 4. NIH National Library of Medicine PubChem Database
// ============================================================================
export async function queryNihPubChem(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'aspirin';
  const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(cleanQ)}/property/MolecularFormula,MolecularWeight,CanonicalSMILES,IUPACName/JSON`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const properties = data.PropertyTable?.Properties || [];
    recordProviderSuccess('nih_pubchem', Date.now() - start);

    return properties.slice(0, 12).map((item: any) => {
      const cid = item.CID;
      const formula = item.MolecularFormula || 'Formula N/A';
      const weight = item.MolecularWeight ? `${item.MolecularWeight} g/mol` : '';
      const smiles = item.CanonicalSMILES || '';
      const iupac = item.IUPACName || cleanQ;
      const pubchemUrl = `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`;
      const thumb = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/PNG`;

      return buildResourceItem({
        id: `nih-pubchem-${cid}`,
        title: `${iupac} [CID: ${cid}]`,
        category: 'datasets',
        description: `NIH PubChem Compound Record. Formula: ${formula}. Molecular Weight: ${weight}. Canonical SMILES: ${smiles}. Verified by the National Center for Biotechnology Information (NCBI).`,
        thumbnailUrl: thumb,
        previewUrl: pubchemUrl,
        downloadUrl: `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/SDF`,
        providerId: 'nih_pubchem',
        providerName: 'NIH National Library of Medicine PubChem',
        resourceUrl: pubchemUrl,
        externalId: String(cid),
        creatorName: 'NCBI / National Library of Medicine',
        creatorOrg: 'National Institutes of Health (NIH)',
        rawLicense: 'Public Domain (US Federal Government Work)',
        licenseUrl: 'https://pubchem.ncbi.nlm.nih.gov/about/',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'sdf',
          tags: ['pubchem', 'chemistry', 'molecular-formula', formula, 'pharmacology', 'nih', 'ncbi']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('nih_pubchem', err.message);
    return [];
  }
}

// ============================================================================
// 5. NASA Apollo Lunar Mission Audio Archives
// ============================================================================
export async function queryArchiveApolloAudio(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'apollo';
  const searchQuery = `collection:(nasaaudiocollection) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,year,downloads&sort[]=downloads desc&rows=16&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_apollo_audio', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const audioUrl = `https://archive.org/download/${id}/${id}.mp3`;

      return buildResourceItem({
        id: `ia-apollo-aud-${id}`,
        title: `${title} [NASA Audio Transmission]`,
        category: 'audio',
        description: `Historic Apollo & space exploration mission audio loop from NASA Mission Control Houston. Includes astronaut air-to-ground dialogue and launch commentaries.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: audioUrl,
        providerId: 'archive_apollo_audio',
        providerName: 'NASA Apollo Lunar Mission Audio Archives',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: 'NASA Johnson Space Center / Houston CapCom',
        rawLicense: 'Public Domain (NASA / US Federal Government)',
        licenseUrl: 'https://archive.org/details/nasaaudiocollection',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'mp3',
          isStreamable: true,
          tags: ['nasa', 'apollo', 'spaceflight', 'audio-loop', 'astronauts', 'mission-control']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_apollo_audio', err.message);
    return [];
  }
}

// ============================================================================
// 6. 20th Century Historic Radio News Broadcasts
// ============================================================================
export async function queryArchiveHistoricRadioNews(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'broadcast';
  const searchQuery = `collection:(radioprograms) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,year,downloads&sort[]=downloads desc&rows=16&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_historic_radio_news', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const year = doc.year || '20th Century';
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const audioUrl = `https://archive.org/download/${id}/${id}.mp3`;

      return buildResourceItem({
        id: `ia-rad-news-${id}`,
        title: `${title} (${year}) [Radio News]`,
        category: 'audio',
        description: `Historic 20th century radio journalism and special news bulletin archive. Features original audio recordings of pivotal world events as they unfolded on the airwaves.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: audioUrl,
        providerId: 'archive_historic_radio_news',
        providerName: '20th Century Historic Radio News Broadcasts',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: doc.creator || 'Broadcast Radio News Network',
        rawLicense: 'Public Domain / Historic News Archives',
        licenseUrl: 'https://archive.org/details/radioprograms',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'mp3',
          isStreamable: true,
          year: typeof doc.year === 'number' ? doc.year : parseInt(doc.year, 10) || undefined,
          tags: ['radio-news', 'journalism', '20th-century', 'history', 'broadcast']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_historic_radio_news', err.message);
    return [];
  }
}

// ============================================================================
// 7. Vintage Computer Manuals & Schematics
// ============================================================================
export async function queryArchiveComputerManuals(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'apple';
  const searchQuery = `collection:(computermanuals) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,year,downloads&sort[]=downloads desc&rows=16&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_computer_manuals', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const creator = doc.creator || 'Hardware Manufacturer';
      const year = doc.year || '1970s/1980s';
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const pdfUrl = `https://archive.org/download/${id}/${id}.pdf`;

      return buildResourceItem({
        id: `ia-comp-man-${id}`,
        title: `${title} (${year}) [Manual]`,
        category: 'books',
        description: `Vintage computer hardware manual, schematic diagram, or programming reference manual. Preserved in the Computer Manuals Collection. Publisher: ${creator}.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: pdfUrl,
        providerId: 'archive_computer_manuals',
        providerName: 'Vintage Computer Manuals & Schematics',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: creator,
        rawLicense: 'Vintage Documentation / Historical Preservation',
        licenseUrl: 'https://archive.org/details/computermanuals',
        providerDefaultLicense: {
          type: 'Historical Preservation',
          commercialAllowed: false,
          attributionRequired: true
        },
        attributes: {
          format: 'pdf',
          year: typeof doc.year === 'number' ? doc.year : parseInt(doc.year, 10) || undefined,
          tags: ['computer-history', 'manuals', 'schematics', 'hardware', 'vintage-computing']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_computer_manuals', err.message);
    return [];
  }
}

// ============================================================================
// 8. Golden Age Comics & Graphic Novels (1930s-1950s)
// ============================================================================
export async function queryArchiveGoldenAgeComics(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'marvel';
  const searchQuery = `collection:(comicbooksandgraphicnovels) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,year,downloads&sort[]=downloads desc&rows=16&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_golden_age_comics', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const creator = doc.creator || 'Golden Age Comic Publishers';
      const year = doc.year || '1940s';
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const pdfUrl = `https://archive.org/download/${id}/${id}.pdf`;

      return buildResourceItem({
        id: `ia-comic-ga-${id}`,
        title: `${title} [Golden Age Comic]`,
        category: 'books',
        description: `Classic Golden Age comic book publication preserved in high resolution. Publisher: ${creator}. Featuring original vintage color line art, superheroes, sci-fi, and adventure stories.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: pdfUrl,
        providerId: 'archive_golden_age_comics',
        providerName: 'Golden Age Comics & Graphic Novels (1930s-1950s)',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: creator,
        rawLicense: 'Public Domain (Golden Age Comics)',
        licenseUrl: 'https://archive.org/details/comicbooksandgraphicnovels',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'pdf',
          year: typeof doc.year === 'number' ? doc.year : parseInt(doc.year, 10) || undefined,
          tags: ['comics', 'golden-age', 'vintage', 'graphic-novels', 'comic-books', 'public-domain']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_golden_age_comics', err.message);
    return [];
  }
}

// ============================================================================
// 9. US Patent Office Historic Inventions & Schematics
// ============================================================================
export async function queryArchiveUsPatents(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'electricity';
  const searchQuery = `collection:(uspto_patents) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,year,downloads,date&sort[]=downloads desc&rows=16&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_us_patents', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const creator = doc.creator || 'Inventor / Patent Assignee';
      const year = doc.year || 'Historical';
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const pdfUrl = `https://archive.org/download/${id}/${id}.pdf`;

      return buildResourceItem({
        id: `ia-patent-${id}`,
        title: `${title} [US Patent]`,
        category: 'datasets',
        description: `Official historical US Patent Office patent grant and invention specification. Inventor/Assignee: ${creator}. Date/Year: ${year}. Includes original blueprint schematics and technical claims.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: pdfUrl,
        providerId: 'archive_us_patents',
        providerName: 'US Patent Office Historic Inventions & Schematics',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: creator,
        creatorOrg: 'United States Patent and Trademark Office (USPTO)',
        rawLicense: 'Public Domain (US Government Patent Work)',
        licenseUrl: 'https://archive.org/details/uspto_patents',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'pdf',
          year: typeof doc.year === 'number' ? doc.year : parseInt(doc.year, 10) || undefined,
          tags: ['patent', 'invention', 'schematic', 'engineering', 'blueprint', 'uspto', 'public-domain']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_us_patents', err.message);
    return [];
  }
}

// ============================================================================
// 10. Historical Cartography & Antique World Maps
// ============================================================================
export async function queryArchiveDavidRumseyMaps(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'world';
  const searchQuery = `collection:(maps_usgs) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,year,downloads&sort[]=downloads desc&rows=16&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_david_rumsey_maps', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const creator = doc.creator || 'Historical Cartographer';
      const year = doc.year || 'Antique';
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const downloadImg = `https://archive.org/download/${id}/${id}.jpg`;

      return buildResourceItem({
        id: `ia-map-antique-${id}`,
        title: `${title} (${year}) [Antique Map]`,
        category: 'maps',
        description: `Historical cartography and antique survey map. Preserved with ultra-high resolution scans in the Historical Maps Archive. Cartographer: ${creator}. Date: ${year}.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: downloadImg,
        providerId: 'archive_david_rumsey_maps',
        providerName: 'Historical Cartography & Antique World Maps',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: creator,
        rawLicense: 'Public Domain (Antique Cartography)',
        licenseUrl: 'https://archive.org/details/maps_usgs',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'jpg',
          year: typeof doc.year === 'number' ? doc.year : parseInt(doc.year, 10) || undefined,
          tags: ['cartography', 'antique-maps', 'historical-geography', 'topography', 'public-domain']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_david_rumsey_maps', err.message);
    return [];
  }
}
