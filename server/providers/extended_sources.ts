import { ResourceItem } from '../../src/types/resource';
import { buildResourceItem } from '../normalizer';
import { registerTracker, recordProviderSuccess, recordProviderFailure } from '../telemetry';

const USER_AGENT = 'URMIL-Universal-Browser/1.0 (https://ai.studio; contact: team@urmil.org)';

// ============================================================================
// Provider Telemetry Registrations
// ============================================================================

registerTracker({
  id: 'smk_art',
  name: 'Statens Museum for Kunst (National Gallery of Denmark)',
  category: 'Art',
  rateLimit: 'Public Open Access (CC0)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'hex_pm',
  name: 'Hex.pm Elixir & Erlang Package Registry',
  category: 'Code',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'data_gov_uk',
  name: 'UK Government Open Data (data.gov.uk)',
  category: 'Datasets',
  rateLimit: 'Public Open Access (OGL v3.0)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'fontsource',
  name: 'Fontsource Open Typography & Font Registry',
  category: 'Images',
  rateLimit: 'Public Open Access (OFL / Apache 2.0)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'paleo_db',
  name: 'Paleobiology Database (Fossils & Dinosaurs)',
  category: 'Biodiversity',
  rateLimit: 'Public Open Access (CC BY 4.0)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'musopen_classical',
  name: 'Musopen Classical Music & Symphony Archive',
  category: 'Audio',
  rateLimit: 'Public Open Access (CC0 / Public Domain)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_retro_magazines',
  name: 'Historic Computer Magazines (Byte, Compute!, PC Mag)',
  category: 'Books',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_prelinger_films',
  name: 'Prelinger Historic Ephemeral Film Archives',
  category: 'Videos',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_live_music',
  name: 'Live Music Archive (etree.org Concerts)',
  category: 'Audio',
  rateLimit: 'Public Open Access (Trade-Friendly)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_computer_history',
  name: 'Computer History Museum Digital Archive',
  category: 'Knowledge',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_open_movies',
  name: 'Open Source Cinema & Independent Films',
  category: 'Videos',
  rateLimit: 'Public Open Access (Creative Commons)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_historic_cookbooks',
  name: 'Historic Cookbooks & Gastronomy Library',
  category: 'Food',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_folkscanomy',
  name: 'Folkscanomy Historical Manuals & Rare Books',
  category: 'Books',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

// ============================================================================
// 1. Statens Museum for Kunst (SMK) - National Gallery of Denmark
// ============================================================================
export async function querySmkArt(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQuery = (query || '').trim();
  const cleanQ = rawQuery || 'painting';
  const url = `https://api.smk.dk/api/v1/art/search/?keys=*&q=${encodeURIComponent(cleanQ)}&filters=%5Bhas_image%3Atrue%5D&rows=20`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(4500)
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    const items = Array.isArray(data.items) ? data.items : [];

    if (rawQuery && items.length === 0) {
      return [];
    }

    recordProviderSuccess('smk_art', Date.now() - start);

    return items
      .filter((item: any) => item.has_image && (item.image_thumbnail || item.images?.[0]?.thumbnail))
      .slice(0, 16)
      .map((item: any) => {
        const id = item.id || `smk-${Math.random().toString(36).substring(2, 9)}`;
        const title = item.titles?.[0]?.title || 'SMK Masterwork';
        const artist = item.production?.[0]?.creator || 'Unknown Master';
        const date = item.production_date?.[0]?.period || item.created || 'Historic';
        const medium = item.object_names?.[0]?.name || 'Artwork';
        const thumb = item.image_thumbnail || item.images?.[0]?.thumbnail;
        const fullImg = item.images?.[0]?.large || thumb;
        const recordUrl = item.frontend_url || `https://open.smk.dk/en/artwork/image/${encodeURIComponent(id)}`;

        return buildResourceItem({
          id: `smk-${String(id).toLowerCase().replace(/[^a-z0-9_-]/g, '-')}`,
          title,
          category: 'art',
          description: `${medium} created by ${artist} (${date}). Part of the National Gallery of Denmark (SMK) Open Access public domain collection.`,
          thumbnailUrl: thumb,
          previewUrl: fullImg,
          downloadUrl: fullImg,
          providerId: 'smk_art',
          providerName: 'Statens Museum for Kunst (SMK)',
          resourceUrl: recordUrl,
          externalId: id,
          creatorName: artist,
          rawLicense: 'Public Domain (CC0 1.0)',
          licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
          providerDefaultLicense: {
            type: 'Public Domain',
            commercialAllowed: true,
            attributionRequired: false
          },
          attributes: {
            artist,
            date,
            medium,
            museum: 'National Gallery of Denmark',
            iiifManifest: item.iiif_manifest || undefined
          }
        });
      });
  } catch (err: any) {
    recordProviderFailure('smk_art', err.message);
    return [];
  }
}

// ============================================================================
// 2. Hex.pm - Elixir & Erlang Package Registry
// ============================================================================
export async function queryHexPm(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQuery = (query || '').trim();
  const cleanQ = rawQuery || 'web';
  const url = `https://hex.pm/api/packages?search=${encodeURIComponent(cleanQ)}`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(4500)
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const packages = await res.json();
    if (!Array.isArray(packages) || packages.length === 0) {
      return [];
    }

    recordProviderSuccess('hex_pm', Date.now() - start);

    return packages.slice(0, 16).map((pkg: any) => {
      const name = pkg.name || 'unnamed-package';
      const desc = pkg.meta?.description || `Hex package ${name} for the Elixir & Erlang ecosystem.`;
      const version = pkg.latest_version || pkg.releases?.[0]?.version || '1.0.0';
      const hexUrl = pkg.html_url || `https://hex.pm/packages/${name}`;
      const docsUrl = pkg.docs_html_url || `https://hexdocs.pm/${name}`;
      const downloads = pkg.downloads?.all || 0;
      const licenses = Array.isArray(pkg.meta?.licenses) ? pkg.meta.licenses.join(', ') : 'Open Source';

      return buildResourceItem({
        id: `hex-${name.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}`,
        title: `${name} (v${version})`,
        category: 'code',
        description: `${desc} [Total Downloads: ${downloads.toLocaleString()}]`,
        thumbnailUrl: 'https://raw.githubusercontent.com/hexpm/hexpm/main/priv/static/images/hex.png',
        previewUrl: docsUrl,
        downloadUrl: hexUrl,
        providerId: 'hex_pm',
        providerName: 'Hex.pm Package Registry',
        resourceUrl: hexUrl,
        externalId: name,
        creatorName: 'Hex Community / Elixir Core',
        rawLicense: licenses,
        licenseUrl: hexUrl,
        providerDefaultLicense: {
          type: 'MIT',
          commercialAllowed: true,
          attributionRequired: true
        },
        attributes: {
          version,
          ecosystem: 'Elixir / Erlang (BEAM)',
          downloads,
          documentation: docsUrl,
          tags: ['elixir', 'erlang', 'hex', 'beam', 'package']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('hex_pm', err.message);
    return [];
  }
}

// ============================================================================
// 3. UK Government Open Data (data.gov.uk CKAN API)
// ============================================================================
export async function queryDataGovUk(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQuery = (query || '').trim();
  const cleanQ = rawQuery || 'environment';
  const url = `https://data.gov.uk/api/3/action/package_search?q=${encodeURIComponent(cleanQ)}&rows=16`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(4500)
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    const results = data.result?.results || [];

    if (!Array.isArray(results) || results.length === 0) {
      return [];
    }

    recordProviderSuccess('data_gov_uk', Date.now() - start);

    return results.map((pkg: any) => {
      const id = pkg.id || `datagovuk-${Math.random().toString(36).substring(2, 9)}`;
      const title = pkg.title || 'UK National Dataset';
      const notes = pkg.notes ? String(pkg.notes).replace(/<[^>]*>?/gm, '').substring(0, 240) + '...' : 'Published by the UK Government on data.gov.uk';
      const org = pkg.organization?.title || 'HM Government';
      const recordUrl = `https://data.gov.uk/dataset/${pkg.name || id}`;
      const firstResource = pkg.resources?.[0] || {};
      const downloadUrl = firstResource.url || recordUrl;
      const format = firstResource.format || 'CSV/JSON';

      return buildResourceItem({
        id: `datagovuk-${String(id).toLowerCase().replace(/[^a-z0-9_-]/g, '-')}`,
        title,
        category: 'datasets',
        description: `${notes} [Publisher: ${org} | Format: ${format}]`,
        thumbnailUrl: 'https://data.gov.uk/assets/frontend/govuk_crest-786d148e64cbe3905cf4b6a8a4740e532b2a65499252c8b73ad6bead5e148e58.png',
        previewUrl: recordUrl,
        downloadUrl,
        providerId: 'data_gov_uk',
        providerName: 'data.gov.uk Open Data',
        resourceUrl: recordUrl,
        externalId: id,
        creatorName: org,
        rawLicense: 'Open Government Licence v3.0 (OGL)',
        licenseUrl: 'http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/',
        providerDefaultLicense: {
          type: 'Open Data',
          commercialAllowed: true,
          attributionRequired: true
        },
        attributes: {
          organization: org,
          format,
          resourceCount: pkg.resources?.length || 0,
          datasetId: id
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('data_gov_uk', err.message);
    return [];
  }
}

// ============================================================================
// 4. Fontsource Open Typography & Web Font Registry
// ============================================================================
let cachedFontsList: any[] | null = null;
let lastFontFetchTime = 0;

export async function queryFontsource(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQuery = (query || '').toLowerCase().trim();

  try {
    const now = Date.now();
    if (!cachedFontsList || now - lastFontFetchTime > 3600000) {
      const res = await fetch('https://api.fontsource.org/v1/fonts', {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(4500)
      });
      if (res.ok) {
        cachedFontsList = await res.json();
        lastFontFetchTime = now;
      }
    }

    if (!Array.isArray(cachedFontsList) || cachedFontsList.length === 0) {
      return [];
    }

    const filtered = rawQuery
      ? cachedFontsList.filter((f: any) =>
          f.id?.toLowerCase().includes(rawQuery) ||
          f.family?.toLowerCase().includes(rawQuery) ||
          f.category?.toLowerCase().includes(rawQuery)
        )
      : cachedFontsList;

    recordProviderSuccess('fontsource', Date.now() - start);

    return filtered.slice(0, 16).map((font: any) => {
      const fontId = font.id || 'sans-font';
      const family = font.family || fontId;
      const category = font.category || 'sans-serif';
      const weights = Array.isArray(font.weights) ? font.weights.join(', ') : '400, 700';
      const fontsourceUrl = `https://fontsource.org/fonts/${fontId}`;
      const license = font.license || 'OFL (Open Font License)';

      return buildResourceItem({
        id: `fontsource-${fontId.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}`,
        title: `${family} Typeface (${category})`,
        category: 'images',
        description: `Open-source typography font family '${family}'. Category: ${category}. Available weights: [${weights}]. Licensed under ${license}.`,
        thumbnailUrl: `https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=400&auto=format&fit=crop&q=80`,
        previewUrl: fontsourceUrl,
        downloadUrl: fontsourceUrl,
        providerId: 'fontsource',
        providerName: 'Fontsource Typography Registry',
        resourceUrl: fontsourceUrl,
        externalId: fontId,
        creatorName: 'Open Font Community',
        rawLicense: license,
        licenseUrl: 'https://scripts.sil.org/OFL',
        providerDefaultLicense: {
          type: 'OFL',
          commercialAllowed: true,
          attributionRequired: true
        },
        attributes: {
          fontFamily: family,
          fontCategory: category,
          weights,
          styles: font.styles || ['normal'],
          subsets: font.subsets || ['latin'],
          tags: ['font', 'typography', 'webfont', category, 'design']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('fontsource', err.message);
    return [];
  }
}

// ============================================================================
// 5. Paleobiology Database (Fossils & Dinosaurs)
// ============================================================================
export async function queryPaleoDb(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQuery = (query || '').trim();
  const cleanQ = rawQuery || 'dinosauria';
  const url = `https://paleobiodb.org/data1.2/occs/list.json?base_name=${encodeURIComponent(cleanQ)}&limit=20&show=classext,ident`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(4500)
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    const records = Array.isArray(data.records) ? data.records : [];

    if (records.length === 0) {
      return [];
    }

    recordProviderSuccess('paleo_db', Date.now() - start);

    return records.slice(0, 16).map((rec: any, idx: number) => {
      const taxon = rec.tna || cleanQ;
      const era = rec.oei || 'Mesozoic Era';
      const cl = rec.cll || 'Fossil Record';
      const ph = rec.phl || 'Chordata';
      const loc = rec.cnt ? `Found in ${rec.cnt}` : 'Stratigraphic specimen';
      const id = rec.oid || `pbdb-${idx}`;
      const recordUrl = `https://paleobiodb.org/classic/basicCollectionSearch?collection_no=${rec.cid || ''}`;

      return buildResourceItem({
        id: `paleo-${id}`,
        title: `Fossil Taxon: ${taxon}`,
        category: 'biodiversity',
        description: `Prehistoric paleobiology specimen of ${taxon}. Geological Epoch/Period: ${era}. Classification: Phylum ${ph}, Class ${cl}. ${loc}.`,
        thumbnailUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=400&auto=format&fit=crop&q=80',
        previewUrl: recordUrl,
        downloadUrl: recordUrl,
        providerId: 'paleo_db',
        providerName: 'Paleobiology Database',
        resourceUrl: recordUrl,
        externalId: String(id),
        creatorName: 'International Paleobiology Consortium',
        rawLicense: 'Creative Commons Attribution 4.0 (CC BY 4.0)',
        licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
        providerDefaultLicense: {
          type: 'CC-BY',
          commercialAllowed: true,
          attributionRequired: true
        },
        attributes: {
          geologicalEra: era,
          classification: `${ph} > ${cl}`,
          taxonName: taxon,
          tags: ['paleontology', 'fossils', 'dinosaurs', 'geology', 'evolution']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('paleo_db', err.message);
    return [];
  }
}

// ============================================================================
// 6. Musopen Symphony & Classical Music Library
// ============================================================================
export async function queryMusopenClassical(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQuery = (query || '').trim();
  const cleanQ = rawQuery || 'symphony';
  const url = `https://archive.org/advancedsearch.php?q=collection:musopen+AND+(${encodeURIComponent(cleanQ)})&fl[]=identifier,title,creator,description,year,downloads&sort[]=downloads+desc&output=json&rows=16`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(4500)
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    let docs = data.response?.docs || [];

    if (rawQuery && docs.length === 0) {
      // Fallback to general musopen collection search
      const fallbackUrl = `https://archive.org/advancedsearch.php?q=collection:musopen&fl[]=identifier,title,creator,description,year,downloads&sort[]=downloads+desc&output=json&rows=16`;
      const fbRes = await fetch(fallbackUrl, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(3500) });
      if (fbRes.ok) {
        const fbData = await fbRes.json();
        docs = fbData.response?.docs || [];
      }
    }

    recordProviderSuccess('musopen_classical', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || 'Classical Masterpiece Performance';
      const composer = doc.creator || 'Classical Orchestra / Musopen';
      const desc = doc.description
        ? String(doc.description).replace(/<[^>]*>?/gm, '').substring(0, 240) + '...'
        : `Musopen orchestral performance of classical repertoire by ${composer}. Public domain recording released for free open cultural study.`;
      const thumb = `https://archive.org/services/img/${id}`;
      const itemUrl = `https://archive.org/details/${id}`;
      const audioStream = `/api/v1/audio-stream?iaId=${encodeURIComponent(id)}`;

      return buildResourceItem({
        id: `musopen-${id.toLowerCase()}`,
        title,
        category: 'audio',
        description: desc,
        thumbnailUrl: thumb,
        previewUrl: audioStream,
        downloadUrl: itemUrl,
        providerId: 'musopen_classical',
        providerName: 'Musopen Classical Music Library',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: composer,
        rawLicense: 'Public Domain / CC0',
        licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          composer,
          year: doc.year,
          format: 'Audio MP3 / FLAC',
          streamingProxyUrl: audioStream,
          thumbnail: thumb,
          tags: ['classical', 'orchestra', 'symphony', 'musopen', 'audio']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('musopen_classical', err.message);
    return [];
  }
}

// ============================================================================
// 7. Historic Computer Magazines (Byte, Compute!, PC Mag, Creative Computing)
// ============================================================================
export async function queryArchiveRetroMagazines(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQuery = (query || '').trim();
  const cleanQ = rawQuery || 'computer';
  const url = `https://archive.org/advancedsearch.php?q=collection:computermagazines+AND+(${encodeURIComponent(cleanQ)})&fl[]=identifier,title,creator,description,year,downloads&sort[]=downloads+desc&output=json&rows=16`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(4500)
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    let docs = data.response?.docs || [];

    if (rawQuery && docs.length === 0) {
      const fbUrl = `https://archive.org/advancedsearch.php?q=collection:computermagazines&fl[]=identifier,title,creator,description,year,downloads&sort[]=downloads+desc&output=json&rows=16`;
      const fbRes = await fetch(fbUrl, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(3500) });
      if (fbRes.ok) {
        const fbData = await fbRes.json();
        docs = fbData.response?.docs || [];
      }
    }

    recordProviderSuccess('archive_retro_magazines', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || 'Vintage Computing Magazine';
      const publisher = doc.creator || 'Retro Tech Publication';
      const desc = doc.description
        ? String(doc.description).replace(/<[^>]*>?/gm, '').substring(0, 240) + '...'
        : `Preserved historic tech issue from the golden age of computing, detailing early microcomputers, programming languages, and hardware architecture.`;
      const thumb = `https://archive.org/services/img/${id}`;
      const itemUrl = `https://archive.org/details/${id}`;

      return buildResourceItem({
        id: `retromag-${id.toLowerCase()}`,
        title,
        category: 'books',
        description: desc,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: itemUrl,
        providerId: 'archive_retro_magazines',
        providerName: 'Retro Computing Magazines Archive',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: publisher,
        rawLicense: 'Public Domain / Open Cultural Access',
        licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          year: doc.year,
          publisher,
          format: 'Scanned Magazine (PDF/EPUB)',
          thumbnail: thumb,
          tags: ['vintage-tech', 'computing-history', 'retro-programming', 'byte', 'magazines']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_retro_magazines', err.message);
    return [];
  }
}

// ============================================================================
// 8. Rick Prelinger Historic Ephemeral Film Archives
// ============================================================================
export async function queryArchivePrelingerFilms(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQuery = (query || '').trim();
  const cleanQ = rawQuery || 'city';
  const url = `https://archive.org/advancedsearch.php?q=collection:prelinger+AND+(${encodeURIComponent(cleanQ)})&fl[]=identifier,title,creator,description,year,downloads&sort[]=downloads+desc&output=json&rows=16`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(4500)
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    let docs = data.response?.docs || [];

    if (rawQuery && docs.length === 0) {
      const fbUrl = `https://archive.org/advancedsearch.php?q=collection:prelinger&fl[]=identifier,title,creator,description,year,downloads&sort[]=downloads+desc&output=json&rows=16`;
      const fbRes = await fetch(fbUrl, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(3500) });
      if (fbRes.ok) {
        const fbData = await fbRes.json();
        docs = fbData.response?.docs || [];
      }
    }

    recordProviderSuccess('archive_prelinger_films', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || 'Prelinger Historic Ephemeral Film';
      const desc = doc.description
        ? String(doc.description).replace(/<[^>]*>?/gm, '').substring(0, 240) + '...'
        : 'Historic 20th-century educational, industrial, advertising, and cultural film preserved in the Prelinger Archives.';
      const thumb = `https://archive.org/services/img/${id}`;
      const itemUrl = `https://archive.org/details/${id}`;
      const videoStream = `/api/v1/video-stream?iaId=${encodeURIComponent(id)}`;

      return buildResourceItem({
        id: `prelinger-${id.toLowerCase()}`,
        title,
        category: 'videos',
        description: desc,
        thumbnailUrl: thumb,
        previewUrl: videoStream,
        downloadUrl: itemUrl,
        providerId: 'archive_prelinger_films',
        providerName: 'Prelinger Historic Film Archives',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: doc.creator || 'Prelinger Archives Collection',
        rawLicense: 'Public Domain Mark 1.0',
        licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          year: doc.year,
          format: 'Historic Film (MP4)',
          streamingProxyUrl: videoStream,
          thumbnail: thumb,
          tags: ['vintage-film', 'ephemeral', 'prelinger', 'documentary', 'history']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_prelinger_films', err.message);
    return [];
  }
}

// ============================================================================
// 9. Live Music Archive (etree.org Concert Recordings)
// ============================================================================
export async function queryArchiveLiveMusic(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQuery = (query || '').trim();
  const cleanQ = rawQuery || 'concert';
  const url = `https://archive.org/advancedsearch.php?q=collection:etree+AND+(${encodeURIComponent(cleanQ)})&fl[]=identifier,title,creator,description,year,downloads&sort[]=downloads+desc&output=json&rows=16`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(4500)
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    let docs = data.response?.docs || [];

    if (rawQuery && docs.length === 0) {
      const fbUrl = `https://archive.org/advancedsearch.php?q=collection:etree&fl[]=identifier,title,creator,description,year,downloads&sort[]=downloads+desc&output=json&rows=16`;
      const fbRes = await fetch(fbUrl, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(3500) });
      if (fbRes.ok) {
        const fbData = await fbRes.json();
        docs = fbData.response?.docs || [];
      }
    }

    recordProviderSuccess('archive_live_music', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || 'Live Concert Recording';
      const band = doc.creator || 'Touring Artist / Band';
      const desc = doc.description
        ? String(doc.description).replace(/<[^>]*>?/gm, '').substring(0, 240) + '...'
        : `Live concert master soundboard recording by ${band}. Shared under trade-friendly open community distribution.`;
      const thumb = `https://archive.org/services/img/${id}`;
      const itemUrl = `https://archive.org/details/${id}`;
      const audioStream = `/api/v1/audio-stream?iaId=${encodeURIComponent(id)}`;

      return buildResourceItem({
        id: `etree-${id.toLowerCase()}`,
        title,
        category: 'audio',
        description: desc,
        thumbnailUrl: thumb,
        previewUrl: audioStream,
        downloadUrl: itemUrl,
        providerId: 'archive_live_music',
        providerName: 'Live Music Archive (etree.org)',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: band,
        rawLicense: 'Open Music Trade (Non-Commercial)',
        licenseUrl: 'https://etree.org/',
        providerDefaultLicense: {
          type: 'Creative Commons',
          commercialAllowed: false,
          attributionRequired: true
        },
        attributes: {
          band,
          year: doc.year,
          format: 'Live Concert FLAC / MP3',
          streamingProxyUrl: audioStream,
          thumbnail: thumb,
          tags: ['live-music', 'concert', 'soundboard', 'bootleg-legal', 'audio']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_live_music', err.message);
    return [];
  }
}

// ============================================================================
// 10. Computer History Museum Digital Archives
// ============================================================================
export async function queryArchiveComputerHistory(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQuery = (query || '').trim();
  const cleanQ = rawQuery || 'unix';
  const url = `https://archive.org/advancedsearch.php?q=collection:bitsavers+AND+(${encodeURIComponent(cleanQ)})&fl[]=identifier,title,creator,description,year,downloads&sort[]=downloads+desc&output=json&rows=16`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(4500)
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    let docs = data.response?.docs || [];

    if (rawQuery && docs.length === 0) {
      const fbUrl = `https://archive.org/advancedsearch.php?q=collection:bitsavers&fl[]=identifier,title,creator,description,year,downloads&sort[]=downloads+desc&output=json&rows=16`;
      const fbRes = await fetch(fbUrl, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(3500) });
      if (fbRes.ok) {
        const fbData = await fbRes.json();
        docs = fbData.response?.docs || [];
      }
    }

    recordProviderSuccess('archive_computer_history', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || 'Historic Computing Artifact';
      const author = doc.creator || 'Computer History Museum';
      const desc = doc.description
        ? String(doc.description).replace(/<[^>]*>?/gm, '').substring(0, 240) + '...'
        : 'Historic documentation, system architecture specification, and primary computing artifacts from Xerox PARC, Bell Labs, IBM, and DEC.';
      const thumb = `https://archive.org/services/img/${id}`;
      const itemUrl = `https://archive.org/details/${id}`;

      return buildResourceItem({
        id: `chm-${id.toLowerCase()}`,
        title,
        category: 'knowledge',
        description: desc,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: itemUrl,
        providerId: 'archive_computer_history',
        providerName: 'Computer History Museum Archive',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: author,
        rawLicense: 'Historic Document Preservation',
        licenseUrl: 'https://computerhistory.org/',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          year: doc.year,
          format: 'Technical Whitepaper / Manual',
          thumbnail: thumb,
          tags: ['computing-history', 'museum', 'architecture', 'retro-hardware', 'knowledge']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_computer_history', err.message);
    return [];
  }
}

// ============================================================================
// 11. Open Source Cinema & Independent Films
// ============================================================================
export async function queryArchiveOpenMovies(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQuery = (query || '').trim();
  const cleanQ = rawQuery || 'cinema';
  const url = `https://archive.org/advancedsearch.php?q=collection:opensource_movies+AND+(${encodeURIComponent(cleanQ)})&fl[]=identifier,title,creator,description,year,downloads&sort[]=downloads+desc&output=json&rows=16`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(4500)
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    let docs = data.response?.docs || [];

    if (rawQuery && docs.length === 0) {
      const fbUrl = `https://archive.org/advancedsearch.php?q=collection:opensource_movies&fl[]=identifier,title,creator,description,year,downloads&sort[]=downloads+desc&output=json&rows=16`;
      const fbRes = await fetch(fbUrl, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(3500) });
      if (fbRes.ok) {
        const fbData = await fbRes.json();
        docs = fbData.response?.docs || [];
      }
    }

    recordProviderSuccess('archive_open_movies', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || 'Independent Open Movie';
      const creator = doc.creator || 'Open Cinema Filmmaker';
      const desc = doc.description
        ? String(doc.description).replace(/<[^>]*>?/gm, '').substring(0, 240) + '...'
        : 'Independent film, open documentary, and Creative Commons artistic film distributed openly.';
      const thumb = `https://archive.org/services/img/${id}`;
      const itemUrl = `https://archive.org/details/${id}`;
      const videoStream = `/api/v1/video-stream?iaId=${encodeURIComponent(id)}`;

      return buildResourceItem({
        id: `openmovie-${id.toLowerCase()}`,
        title,
        category: 'videos',
        description: desc,
        thumbnailUrl: thumb,
        previewUrl: videoStream,
        downloadUrl: itemUrl,
        providerId: 'archive_open_movies',
        providerName: 'Open Source Cinema & Films',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: creator,
        rawLicense: 'Creative Commons Open Cinema',
        licenseUrl: 'https://creativecommons.org/',
        providerDefaultLicense: {
          type: 'Creative Commons',
          commercialAllowed: true,
          attributionRequired: true
        },
        attributes: {
          year: doc.year,
          format: 'Open Movie (MP4)',
          streamingProxyUrl: videoStream,
          thumbnail: thumb,
          tags: ['cinema', 'open-source', 'film', 'creative-commons', 'video']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_open_movies', err.message);
    return [];
  }
}

// ============================================================================
// 12. Historic Cookbooks & Gastronomy Library
// ============================================================================
export async function queryArchiveCookbooks(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQuery = (query || '').trim();
  const cleanQ = rawQuery || 'cooking';
  const url = `https://archive.org/advancedsearch.php?q=mediatype:texts+AND+subject:cookery+AND+(${encodeURIComponent(cleanQ)})&fl[]=identifier,title,creator,description,year,downloads&sort[]=downloads+desc&output=json&rows=16`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(4500)
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    let docs = data.response?.docs || [];

    if (rawQuery && docs.length === 0) {
      const fbUrl = `https://archive.org/advancedsearch.php?q=mediatype:texts+AND+subject:cookery&fl[]=identifier,title,creator,description,year,downloads&sort[]=downloads+desc&output=json&rows=16`;
      const fbRes = await fetch(fbUrl, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(3500) });
      if (fbRes.ok) {
        const fbData = await fbRes.json();
        docs = fbData.response?.docs || [];
      }
    }

    recordProviderSuccess('archive_historic_cookbooks', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || 'Historic Cookbook & Culinary Guide';
      const author = doc.creator || 'Historic Gastronomist / Chef';
      const desc = doc.description
        ? String(doc.description).replace(/<[^>]*>?/gm, '').substring(0, 240) + '...'
        : 'Historic culinary recipe collection, traditional baking guides, and gastronomy literature preserved in the public domain.';
      const thumb = `https://archive.org/services/img/${id}`;
      const itemUrl = `https://archive.org/details/${id}`;

      return buildResourceItem({
        id: `cookbook-${id.toLowerCase()}`,
        title,
        category: 'food',
        description: desc,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: itemUrl,
        providerId: 'archive_historic_cookbooks',
        providerName: 'Historic Cookbooks & Gastronomy Library',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: author,
        rawLicense: 'Public Domain Mark 1.0',
        licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          year: doc.year,
          author,
          format: 'Historic Book (PDF/EPUB)',
          thumbnail: thumb,
          tags: ['cookbooks', 'recipes', 'culinary-history', 'gastronomy', 'food']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_historic_cookbooks', err.message);
    return [];
  }
}

// ============================================================================
// 13. Folkscanomy Historical Manuals & Rare Books
// ============================================================================
export async function queryArchiveFolkscanomy(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQuery = (query || '').trim();
  const cleanQ = rawQuery || 'electronics';
  const url = `https://archive.org/advancedsearch.php?q=collection:folkscanomy+AND+(${encodeURIComponent(cleanQ)})&fl[]=identifier,title,creator,description,year,downloads&sort[]=downloads+desc&output=json&rows=16`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(4500)
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    let docs = data.response?.docs || [];

    if (rawQuery && docs.length === 0) {
      const fbUrl = `https://archive.org/advancedsearch.php?q=collection:folkscanomy&fl[]=identifier,title,creator,description,year,downloads&sort[]=downloads+desc&output=json&rows=16`;
      const fbRes = await fetch(fbUrl, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(3500) });
      if (fbRes.ok) {
        const fbData = await fbRes.json();
        docs = fbData.response?.docs || [];
      }
    }

    recordProviderSuccess('archive_folkscanomy', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || 'Folkscanomy Rare Historical Book';
      const author = doc.creator || 'Community Cultural Archive';
      const desc = doc.description
        ? String(doc.description).replace(/<[^>]*>?/gm, '').substring(0, 240) + '...'
        : 'Rare technical handbook, historical manuscript, or specialized craft documentation curated by the global Folkscanomy community.';
      const thumb = `https://archive.org/services/img/${id}`;
      const itemUrl = `https://archive.org/details/${id}`;

      return buildResourceItem({
        id: `folkscanomy-${id.toLowerCase()}`,
        title,
        category: 'books',
        description: desc,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: itemUrl,
        providerId: 'archive_folkscanomy',
        providerName: 'Folkscanomy Curated Historical Texts',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: author,
        rawLicense: 'Public Domain / Community Curated',
        licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          year: doc.year,
          author,
          format: 'Scanned Document (PDF/EPUB)',
          thumbnail: thumb,
          tags: ['folkscanomy', 'rare-books', 'manuals', 'technical-history', 'archive']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_folkscanomy', err.message);
    return [];
  }
}

