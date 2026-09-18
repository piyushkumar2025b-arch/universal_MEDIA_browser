import { ResourceItem } from '../../src/types/resource';
import { buildResourceItem } from '../normalizer';
import { registerTracker, recordProviderSuccess, recordProviderFailure } from '../telemetry';

const USER_AGENT = 'URMIL-Universal-Browser/1.0 (https://ai.studio; contact: team@urmil.org)';

// ============================================================================
// Provider Telemetry Registrations
// ============================================================================

registerTracker({
  id: 'nuget_packages',
  name: 'NuGet .NET Package Registry (Microsoft)',
  category: 'Code',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'metacpan_perl',
  name: 'MetaCPAN Comprehensive Perl Archive Network',
  category: 'Code',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'data_gov_ca',
  name: 'Government of Canada Open Data (open.canada.ca)',
  category: 'Datasets',
  rateLimit: 'Public Open Access (Open Government Licence - Canada)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'catalogue_of_life',
  name: 'Catalogue of Life (COL Living Species Taxonomy)',
  category: 'Biodiversity',
  rateLimit: 'Public Open Access (CC-BY)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'itis_taxonomy',
  name: 'Integrated Taxonomic Information System (USGS / ITIS)',
  category: 'Biodiversity',
  rateLimit: 'Public Domain (US Federal Government)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_bthl_architecture',
  name: 'Building Technology Heritage Library (BTHL)',
  category: 'Art',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_movie_trailers',
  name: 'Historic Cinema Previews & Film Trailers',
  category: 'Videos',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_vintage_posters',
  name: 'Vintage Travel & Advertising Posters Archive',
  category: 'Art',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_otr_scifi',
  name: 'Golden Age Science Fiction Radio Theater',
  category: 'Audio',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_field_recordings',
  name: 'Global Nature Sounds & Acoustic Field Recordings',
  category: 'Audio',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

// ============================================================================
// 1. NuGet .NET Package Registry
// ============================================================================
export async function queryNuGetPackages(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQuery = (query || '').trim();
  const cleanQ = rawQuery || 'web';
  const url = `https://azuresearch-usnc.nuget.org/query?q=${encodeURIComponent(cleanQ)}&take=16&prerelease=false`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(4500)
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    let items = data.data || [];

    if (rawQuery && items.length === 0) {
      const fbRes = await fetch(`https://azuresearch-usnc.nuget.org/query?q=web&take=16`, {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(3500)
      });
      if (fbRes.ok) {
        const fbData = await fbRes.json();
        items = fbData.data || [];
      }
    }

    recordProviderSuccess('nuget_packages', Date.now() - start);

    return items.map((pkg: any) => {
      const id = pkg.id;
      const title = pkg.title || id;
      const authors = Array.isArray(pkg.authors) ? pkg.authors.join(', ') : pkg.authors || 'NuGet Author';
      const desc = pkg.description
        ? pkg.description.substring(0, 240) + '...'
        : 'Official .NET package distributed via Microsoft NuGet repository with binary assemblies and dependencies.';
      const icon = pkg.iconUrl || 'https://assets.nuget.org/images/nuget.svg';
      const projectUrl = pkg.projectUrl || `https://www.nuget.org/packages/${id}`;
      const packageUrl = `https://www.nuget.org/packages/${id}`;

      return buildResourceItem({
        id: `nuget-${id.toLowerCase()}`,
        title: `${title} (v${pkg.version || '1.0'})`,
        category: 'code',
        description: desc,
        thumbnailUrl: icon,
        previewUrl: projectUrl,
        downloadUrl: packageUrl,
        providerId: 'nuget_packages',
        providerName: 'NuGet .NET Registry',
        resourceUrl: packageUrl,
        externalId: id,
        creatorName: authors,
        rawLicense: pkg.licenseUrl ? 'Open Source (.NET)' : 'NuGet Community License',
        licenseUrl: pkg.licenseUrl || 'https://opensource.org/licenses',
        providerDefaultLicense: {
          type: 'Open Source',
          commercialAllowed: true,
          attributionRequired: true
        },
        attributes: {
          version: pkg.version,
          authors,
          totalDownloads: pkg.totalDownloads,
          tags: pkg.tags || ['dotnet', 'csharp', 'nuget', 'package']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('nuget_packages', err.message);
    return [];
  }
}

// ============================================================================
// 2. MetaCPAN (Perl Package Registry)
// ============================================================================
export async function queryMetaCPAN(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQuery = (query || '').trim();
  const cleanQ = rawQuery || 'json';
  const url = `https://fastapi.metacpan.org/v1/release/_search?q=${encodeURIComponent(cleanQ)}&size=16`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(4500)
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    let hits = data.hits?.hits || [];

    if (rawQuery && hits.length === 0) {
      const fbRes = await fetch(`https://fastapi.metacpan.org/v1/release/_search?q=moose&size=16`, {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(3500)
      });
      if (fbRes.ok) {
        const fbData = await fbRes.json();
        hits = fbData.hits?.hits || [];
      }
    }

    recordProviderSuccess('metacpan_perl', Date.now() - start);

    return hits.map((hit: any) => {
      const src = hit._source || {};
      const name = src.name || src.distribution || 'Perl-Module';
      const desc = src.abstract || 'CPAN (Comprehensive Perl Archive Network) open-source software distribution and documentation.';
      const author = src.author || 'CPAN Contributor';
      const cpanUrl = `https://metacpan.org/dist/${src.distribution || name}`;

      return buildResourceItem({
        id: `cpan-${name.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}`,
        title: `${name} (v${src.version || '1.0'})`,
        category: 'code',
        description: desc,
        thumbnailUrl: 'https://metacpan.org/static/icons/metacpan-icon.svg',
        previewUrl: cpanUrl,
        downloadUrl: src.download_url || cpanUrl,
        providerId: 'metacpan_perl',
        providerName: 'MetaCPAN (Perl Archive)',
        resourceUrl: cpanUrl,
        externalId: name,
        creatorName: author,
        rawLicense: Array.isArray(src.license) ? src.license.join(', ') : src.license || 'Artistic / GPL (Perl 5)',
        licenseUrl: 'https://dev.perl.org/licenses/',
        providerDefaultLicense: {
          type: 'Open Source',
          commercialAllowed: true,
          attributionRequired: true
        },
        attributes: {
          distribution: src.distribution,
          version: src.version,
          author,
          date: src.date,
          tags: ['perl', 'cpan', 'metacpan', 'open-source']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('metacpan_perl', err.message);
    return [];
  }
}

// ============================================================================
// 3. Government of Canada Open Data (open.canada.ca)
// ============================================================================
export async function queryDataGovCanada(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQuery = (query || '').trim();
  const cleanQ = rawQuery || 'environment';
  const url = `https://open.canada.ca/data/en/api/3/action/package_search?q=${encodeURIComponent(cleanQ)}&rows=16`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(4500)
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    let results = data.result?.results || [];

    if (rawQuery && results.length === 0) {
      const fbRes = await fetch(`https://open.canada.ca/data/en/api/3/action/package_search?q=climate&rows=16`, {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(3500)
      });
      if (fbRes.ok) {
        const fbData = await fbRes.json();
        results = fbData.result?.results || [];
      }
    }

    recordProviderSuccess('data_gov_ca', Date.now() - start);

    return results.map((item: any) => {
      const id = item.id;
      const title = typeof item.title === 'string' ? item.title : item.title_translated?.en || item.name || 'Canadian Open Dataset';
      const org = item.organization?.title || 'Government of Canada';
      const desc = item.notes
        ? String(item.notes).replace(/<[^>]*>?/gm, '').substring(0, 240) + '...'
        : 'Official public dataset cataloged by the federal departments and agencies of the Government of Canada.';
      const webUrl = `https://open.canada.ca/data/en/dataset/${id}`;
      const firstResource = item.resources?.[0];
      const downloadUrl = firstResource?.url || webUrl;
      const format = firstResource?.format || 'CSV / GeoJSON';

      return buildResourceItem({
        id: `datagovca-${id.substring(0, 24)}`,
        title,
        category: 'datasets',
        description: desc,
        thumbnailUrl: 'https://open.canada.ca/assets/img/sig-blk-en.svg',
        previewUrl: webUrl,
        downloadUrl,
        providerId: 'data_gov_ca',
        providerName: 'Open Data Canada (open.canada.ca)',
        resourceUrl: webUrl,
        externalId: id,
        creatorName: org,
        rawLicense: 'Open Government Licence - Canada',
        licenseUrl: 'https://open.canada.ca/en/open-government-licence-canada',
        providerDefaultLicense: {
          type: 'Open Government Licence',
          commercialAllowed: true,
          attributionRequired: true
        },
        attributes: {
          format,
          organization: org,
          metadataModified: item.metadata_modified,
          tags: (item.tags || []).map((t: any) => t.display_name || t.name).slice(0, 5)
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('data_gov_ca', err.message);
    return [];
  }
}

// ============================================================================
// 4. Catalogue of Life (COL 2M Living Species Taxonomy)
// ============================================================================
export async function queryCatalogueOfLife(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQuery = (query || '').trim();
  const cleanQ = rawQuery || 'Panthera';
  const url = `https://api.catalogueoflife.org/dataset/3LR/nameusage/search?q=${encodeURIComponent(cleanQ)}&limit=16`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(4500)
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    let results = data.result || [];

    if (rawQuery && results.length === 0) {
      const fbRes = await fetch(`https://api.catalogueoflife.org/dataset/3LR/nameusage/search?q=Canis&limit=16`, {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(3500)
      });
      if (fbRes.ok) {
        const fbData = await fbRes.json();
        results = fbData.result || [];
      }
    }

    recordProviderSuccess('catalogue_of_life', Date.now() - start);

    return results.map((item: any) => {
      const taxon = item.usage || item;
      const name = taxon.name?.scientificName || taxon.label || 'Living Species';
      const rank = taxon.name?.rank || taxon.rank || 'species';
      const status = taxon.status || 'accepted';
      const colId = taxon.id || item.id;
      const classification = Array.isArray(item.classification)
        ? item.classification.map((c: any) => c.name).join(' > ')
        : 'Kingdom Animalia / Plantae';
      const colUrl = `https://www.catalogueoflife.org/data/taxon/${colId}`;

      return buildResourceItem({
        id: `col-${colId}`,
        title: `${name} [${rank.toUpperCase()}]`,
        category: 'biodiversity',
        description: `Verified taxonomic entry in Catalogue of Life. Status: ${status}. Lineage: ${classification}`,
        thumbnailUrl: 'https://www.catalogueoflife.org/images/col-logo.png',
        previewUrl: colUrl,
        downloadUrl: colUrl,
        providerId: 'catalogue_of_life',
        providerName: 'Catalogue of Life (COL)',
        resourceUrl: colUrl,
        externalId: colId,
        creatorName: taxon.name?.authorship || 'Taxonomic Authority',
        rawLicense: 'Creative Commons Attribution 4.0 (CC-BY)',
        licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
        providerDefaultLicense: {
          type: 'Creative Commons',
          commercialAllowed: true,
          attributionRequired: true
        },
        attributes: {
          scientificName: name,
          rank,
          status,
          classification,
          tags: ['taxonomy', 'catalogue-of-life', 'biodiversity', 'species', rank]
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('catalogue_of_life', err.message);
    return [];
  }
}

// ============================================================================
// 5. Integrated Taxonomic Information System (USGS / ITIS)
// ============================================================================
export async function queryItisTaxonomy(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQuery = (query || '').trim();
  const cleanQ = rawQuery || 'Panthera';
  const url = `https://www.itis.gov/ITISWebService/jsonservice/searchByScientificName?srchKey=${encodeURIComponent(cleanQ)}`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(4500)
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    let names = data.scientificNames || [];

    if (rawQuery && names.length === 0) {
      const fbRes = await fetch(`https://www.itis.gov/ITISWebService/jsonservice/searchByScientificName?srchKey=Ursus`, {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(3500)
      });
      if (fbRes.ok) {
        const fbData = await fbRes.json();
        names = fbData.scientificNames || [];
      }
    }

    recordProviderSuccess('itis_taxonomy', Date.now() - start);

    return names.slice(0, 16).map((taxon: any) => {
      const name = taxon.combinedName || 'Organism';
      const tsn = taxon.tsn;
      const kingdom = taxon.kingdom || 'Biota';
      const author = taxon.author || 'Taxonomic Authority';
      const itisUrl = `https://www.itis.gov/servlet/SingleRpt/SingleRpt?search_topic=TSN&search_value=${tsn}`;

      return buildResourceItem({
        id: `itis-${tsn}`,
        title: `${name} (TSN ${tsn})`,
        category: 'biodiversity',
        description: `Official taxonomic entry in the Integrated Taxonomic Information System (ITIS). Kingdom: ${kingdom}. Authority: ${author}. TSN: ${tsn}.`,
        thumbnailUrl: 'https://www.itis.gov/images/itis_logo.png',
        previewUrl: itisUrl,
        downloadUrl: itisUrl,
        providerId: 'itis_taxonomy',
        providerName: 'Integrated Taxonomic Information System (ITIS)',
        resourceUrl: itisUrl,
        externalId: tsn,
        creatorName: author,
        rawLicense: 'Public Domain (US Federal Government Work)',
        licenseUrl: 'https://www.itis.gov/legal.html',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          scientificName: name,
          tsn,
          kingdom,
          author,
          tags: ['taxonomy', 'itis', 'usgs', 'biology', 'species', kingdom.toLowerCase()]
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('itis_taxonomy', err.message);
    return [];
  }
}

// ============================================================================
// 6. Building Technology Heritage Library (BTHL Architectural Catalogs)
// ============================================================================
export async function queryBthlArchitecture(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQuery = (query || '').trim();
  const cleanQ = rawQuery || 'house';
  const url = `https://archive.org/advancedsearch.php?q=collection:buildingtechnologyheritagelibrary+AND+(${encodeURIComponent(cleanQ)})&fl[]=identifier,title,creator,description,year,downloads&sort[]=downloads+desc&output=json&rows=16`;

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
      const fbUrl = `https://archive.org/advancedsearch.php?q=collection:buildingtechnologyheritagelibrary&fl[]=identifier,title,creator,description,year,downloads&sort[]=downloads+desc&output=json&rows=16`;
      const fbRes = await fetch(fbUrl, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(3500) });
      if (fbRes.ok) {
        const fbData = await fbRes.json();
        docs = fbData.response?.docs || [];
      }
    }

    recordProviderSuccess('archive_bthl_architecture', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || 'Historic Architecture Catalog';
      const architect = doc.creator || 'American Architectural Archive';
      const desc = doc.description
        ? String(doc.description).replace(/<[^>]*>?/gm, '').substring(0, 240) + '...'
        : 'Historic architectural trade catalog, blueprint spec book, Victorian house pattern guide, and building technology record.';
      const thumb = `https://archive.org/services/img/${id}`;
      const itemUrl = `https://archive.org/details/${id}`;

      return buildResourceItem({
        id: `bthl-${id.toLowerCase()}`,
        title,
        category: 'art',
        description: desc,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: itemUrl,
        providerId: 'archive_bthl_architecture',
        providerName: 'Building Technology Heritage Library',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: architect,
        rawLicense: 'Public Domain Mark 1.0',
        licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          year: doc.year,
          architect,
          format: 'Architectural Catalog (PDF/EPUB)',
          thumbnail: thumb,
          tags: ['architecture', 'blueprints', 'building-heritage', 'historic-design', 'trade-catalog']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_bthl_architecture', err.message);
    return [];
  }
}

// ============================================================================
// 7. Historic Cinema Trailers & Previews
// ============================================================================
export async function queryMovieTrailers(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQuery = (query || '').trim();
  const cleanQ = rawQuery || 'cinema';
  const url = `https://archive.org/advancedsearch.php?q=mediatype:movies+AND+subject:trailer+AND+(${encodeURIComponent(cleanQ)})&fl[]=identifier,title,creator,description,year,downloads&sort[]=downloads+desc&output=json&rows=16`;

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
      const fbUrl = `https://archive.org/advancedsearch.php?q=mediatype:movies+AND+subject:trailer&fl[]=identifier,title,creator,description,year,downloads&sort[]=downloads+desc&output=json&rows=16`;
      const fbRes = await fetch(fbUrl, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(3500) });
      if (fbRes.ok) {
        const fbData = await fbRes.json();
        docs = fbData.response?.docs || [];
      }
    }

    recordProviderSuccess('archive_movie_trailers', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || 'Original Theatrical Movie Trailer';
      const studio = doc.creator || 'Cinema Studio / Archive';
      const desc = doc.description
        ? String(doc.description).replace(/<[^>]*>?/gm, '').substring(0, 240) + '...'
        : 'Original theatrical preview and cinema teaser film reel preserving classic Hollywood and international film history.';
      const thumb = `https://archive.org/services/img/${id}`;
      const itemUrl = `https://archive.org/details/${id}`;
      const videoStream = `/api/v1/video-stream?iaId=${encodeURIComponent(id)}`;

      return buildResourceItem({
        id: `trailer-${id.toLowerCase()}`,
        title,
        category: 'videos',
        description: desc,
        thumbnailUrl: thumb,
        previewUrl: videoStream,
        downloadUrl: itemUrl,
        providerId: 'archive_movie_trailers',
        providerName: 'Historic Cinema Previews & Trailers',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: studio,
        rawLicense: 'Public Domain / Open Film Access',
        licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          year: doc.year,
          studio,
          format: 'Film Preview (MP4)',
          streamingProxyUrl: videoStream,
          thumbnail: thumb,
          tags: ['cinema', 'trailers', 'vintage-movies', 'film-history', 'previews']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_movie_trailers', err.message);
    return [];
  }
}

// ============================================================================
// 8. Vintage Travel & Advertising Posters Archive
// ============================================================================
export async function queryVintagePosters(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQuery = (query || '').trim();
  const cleanQ = rawQuery || 'travel';
  const url = `https://archive.org/advancedsearch.php?q=mediatype:image+AND+subject:posters+AND+(${encodeURIComponent(cleanQ)})&fl[]=identifier,title,creator,description,year,downloads&sort[]=downloads+desc&output=json&rows=16`;

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
      const fbUrl = `https://archive.org/advancedsearch.php?q=mediatype:image+AND+subject:posters&fl[]=identifier,title,creator,description,year,downloads&sort[]=downloads+desc&output=json&rows=16`;
      const fbRes = await fetch(fbUrl, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(3500) });
      if (fbRes.ok) {
        const fbData = await fbRes.json();
        docs = fbData.response?.docs || [];
      }
    }

    recordProviderSuccess('archive_vintage_posters', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || 'Vintage Illustrated Poster';
      const artist = doc.creator || 'Graphic Artist / Lithographer';
      const desc = doc.description
        ? String(doc.description).replace(/<[^>]*>?/gm, '').substring(0, 240) + '...'
        : 'Historical illustrated lithograph, vintage travel advertising art, or public service poster preserved in high resolution.';
      const thumb = `https://archive.org/services/img/${id}`;
      const itemUrl = `https://archive.org/details/${id}`;

      return buildResourceItem({
        id: `poster-${id.toLowerCase()}`,
        title,
        category: 'images',
        description: desc,
        thumbnailUrl: thumb,
        previewUrl: thumb,
        downloadUrl: itemUrl,
        providerId: 'archive_vintage_posters',
        providerName: 'Vintage Posters & Lithographs',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: artist,
        rawLicense: 'Public Domain Mark 1.0',
        licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          year: doc.year,
          artist,
          format: 'High-Res Lithograph / Poster Scan',
          thumbnail: thumb,
          tags: ['vintage-poster', 'graphic-design', 'lithograph', 'art', 'advertising']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_vintage_posters', err.message);
    return [];
  }
}

// ============================================================================
// 9. Golden Age Science Fiction Radio Theater (X Minus One, Dimension X)
// ============================================================================
export async function queryOtrSciFi(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQuery = (query || '').trim();
  const cleanQ = rawQuery || 'space';
  const url = `https://archive.org/advancedsearch.php?q=collection:oldtimeradio+AND+(x_minus_one+OR+dimension_x+OR+suspense)+AND+(${encodeURIComponent(cleanQ)})&fl[]=identifier,title,creator,description,year,downloads&sort[]=downloads+desc&output=json&rows=16`;

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
      const fbUrl = `https://archive.org/advancedsearch.php?q=collection:oldtimeradio+AND+(x_minus_one+OR+dimension_x)&fl[]=identifier,title,creator,description,year,downloads&sort[]=downloads+desc&output=json&rows=16`;
      const fbRes = await fetch(fbUrl, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(3500) });
      if (fbRes.ok) {
        const fbData = await fbRes.json();
        docs = fbData.response?.docs || [];
      }
    }

    recordProviderSuccess('archive_otr_scifi', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || 'Sci-Fi Radio Broadcast';
      const network = doc.creator || 'NBC / CBS Radio Workshop';
      const desc = doc.description
        ? String(doc.description).replace(/<[^>]*>?/gm, '').substring(0, 240) + '...'
        : 'Legendary Golden Age radio drama adaptation of Ray Bradbury, Isaac Asimov, Robert Heinlein, and Philip K. Dick.';
      const thumb = `https://archive.org/services/img/${id}`;
      const itemUrl = `https://archive.org/details/${id}`;
      const audioStream = `/api/v1/audio-stream?iaId=${encodeURIComponent(id)}`;

      return buildResourceItem({
        id: `otrscifi-${id.toLowerCase()}`,
        title,
        category: 'audio',
        description: desc,
        thumbnailUrl: thumb,
        previewUrl: audioStream,
        downloadUrl: itemUrl,
        providerId: 'archive_otr_scifi',
        providerName: 'Sci-Fi & Mystery Radio Theater',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: network,
        rawLicense: 'Public Domain Mark 1.0',
        licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          year: doc.year,
          network,
          format: 'Radio Drama Broadcast (MP3)',
          streamingProxyUrl: audioStream,
          thumbnail: thumb,
          tags: ['old-time-radio', 'scifi-theater', 'x-minus-one', 'audio-drama', 'retro-future']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_otr_scifi', err.message);
    return [];
  }
}

// ============================================================================
// 10. Global Environmental Audio & Field Recordings
// ============================================================================
export async function queryFieldRecordings(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQuery = (query || '').trim();
  const cleanQ = rawQuery || 'rain';
  const url = `https://archive.org/advancedsearch.php?q=mediatype:audio+AND+subject:%22field+recording%22+AND+(${encodeURIComponent(cleanQ)})&fl[]=identifier,title,creator,description,year,downloads&sort[]=downloads+desc&output=json&rows=16`;

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
      const fbUrl = `https://archive.org/advancedsearch.php?q=mediatype:audio+AND+subject:%22field+recording%22&fl[]=identifier,title,creator,description,year,downloads&sort[]=downloads+desc&output=json&rows=16`;
      const fbRes = await fetch(fbUrl, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(3500) });
      if (fbRes.ok) {
        const fbData = await fbRes.json();
        docs = fbData.response?.docs || [];
      }
    }

    recordProviderSuccess('archive_field_recordings', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || 'Acoustic Field Recording';
      const recordist = doc.creator || 'Acoustic Ecology Recordist';
      const desc = doc.description
        ? String(doc.description).replace(/<[^>]*>?/gm, '').substring(0, 240) + '...'
        : 'High-fidelity natural acoustic recording, ambient weather soundscape, wildlife chorus, or urban environmental audio.';
      const thumb = `https://archive.org/services/img/${id}`;
      const itemUrl = `https://archive.org/details/${id}`;
      const audioStream = `/api/v1/audio-stream?iaId=${encodeURIComponent(id)}`;

      return buildResourceItem({
        id: `fieldrec-${id.toLowerCase()}`,
        title,
        category: 'audio',
        description: desc,
        thumbnailUrl: thumb,
        previewUrl: audioStream,
        downloadUrl: itemUrl,
        providerId: 'archive_field_recordings',
        providerName: 'Global Field Recordings & Ambiances',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: recordist,
        rawLicense: 'Creative Commons Open Audio',
        licenseUrl: 'https://creativecommons.org/',
        providerDefaultLicense: {
          type: 'Creative Commons',
          commercialAllowed: true,
          attributionRequired: true
        },
        attributes: {
          year: doc.year,
          recordist,
          format: 'Acoustic Soundscape (FLAC/MP3)',
          streamingProxyUrl: audioStream,
          thumbnail: thumb,
          tags: ['field-recording', 'nature-sounds', 'soundscape', 'ambient', 'acoustic-ecology']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_field_recordings', err.message);
    return [];
  }
}
