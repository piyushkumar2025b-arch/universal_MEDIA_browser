import { ResourceItem } from '../../src/types/resource';
import { buildResourceItem } from '../normalizer';
import { registerTracker, recordProviderSuccess, recordProviderFailure } from '../telemetry';

const USER_AGENT = 'URMIL-Universal-Browser/1.0 (https://ai.studio; contact: team@urmil.org)';

registerTracker({
  id: 'huggingface',
  name: 'Hugging Face Hub',
  category: 'Datasets',
  rateLimit: 'Standard / Open',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'zenodo_datasets',
  name: 'Zenodo Open Science Datasets',
  category: 'Datasets',
  rateLimit: '100 req/min (Open)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'data_gov',
  name: 'Data.gov Official Catalog',
  category: 'Datasets',
  rateLimit: '1,000 req/hr (Open API)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'world_bank',
  name: 'World Bank Open Data',
  category: 'Datasets',
  rateLimit: 'Unlimited / Open',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'nasa_exoplanets',
  name: 'NASA Exoplanet Archive (Caltech/IPAC)',
  category: 'Datasets',
  rateLimit: 'Unlimited / Open TAP API',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'usgs_earthquakes',
  name: 'USGS Real-Time Earthquake Hazards Program',
  category: 'Geophysics & Seismology',
  rateLimit: 'Unlimited Open Public GeoJSON API',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'harvard_dataverse',
  name: 'Harvard Dataverse Open Research Repository',
  category: 'Datasets',
  rateLimit: 'Open Public Dataverse API',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'cern_opendata',
  name: 'CERN Open Data Particle Physics Archive',
  category: 'High-Energy Physics & Open Science',
  rateLimit: 'Open CERN REST API (LHC & Experiments)',
  authRequired: false,
  authConfigured: true
});

// 1. Hugging Face Datasets
export async function queryHuggingFace(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = `https://huggingface.co/api/datasets?search=${encodeURIComponent(query)}&limit=15&full=true`;

  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('huggingface', Date.now() - start);

    return (data || []).map((ds: any) =>
      buildResourceItem({
        id: `hf-${ds.id ? ds.id.replace('/', '-') : Math.random().toString(36).substring(7)}`,
        title: ds.id || 'Hugging Face Dataset',
        category: 'datasets',
        description: ds.description || `Machine learning dataset hosted on Hugging Face Hub. Downloads: ${ds.downloads || 0}, Likes: ${ds.likes || 0}.`,
        previewUrl: `https://huggingface.co/datasets/${ds.id}`,
        downloadUrl: `https://huggingface.co/datasets/${ds.id}`,
        providerId: 'huggingface',
        providerName: 'Hugging Face Hub',
        resourceUrl: `https://huggingface.co/datasets/${ds.id}`,
        externalId: ds.id,
        creatorName: ds.author || ds.id?.split('/')[0],
        rawLicense: ds.cardData?.license || 'Open Source / Community License',
        licenseUrl: ds.cardData?.license ? `https://choosealicense.com/licenses/${ds.cardData.license}` : undefined,
        attributes: {
          format: 'parquet/csv',
          downloads: ds.downloads,
          tags: ds.tags || [],
          quality: 'Original'
        }
      })
    );
  } catch (err: any) {
    recordProviderFailure('huggingface', err.message);
    return [];
  }
}

// 2. Zenodo Open Science Datasets (CERN)
export async function queryZenodoDatasets(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = `https://zenodo.org/api/records?q=${encodeURIComponent(query)}&type=dataset&size=12`;

  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('zenodo_datasets', Date.now() - start);

    const hits = data.hits?.hits || [];
    return hits.map((hit: any) => {
      const meta = hit.metadata || {};
      const creators = (meta.creators || []).map((c: any) => c.name).join(', ');
      const rawLicense = meta.license?.id || 'Open Access Research Dataset';
      const files = hit.files || [];
      const primaryFile = files[0];

      return buildResourceItem({
        id: `zenodo-ds-${hit.id}`,
        title: meta.title || 'Scientific Open Dataset',
        category: 'datasets',
        description: meta.description ? meta.description.replace(/<[^>]*>?/gm, '').substring(0, 300) + '...' : undefined,
        previewUrl: hit.links?.html || `https://zenodo.org/records/${hit.id}`,
        downloadUrl: primaryFile?.links?.self || hit.links?.html || `https://zenodo.org/records/${hit.id}`,
        providerId: 'zenodo_datasets',
        providerName: 'Zenodo (CERN Open Science)',
        resourceUrl: hit.links?.html || `https://zenodo.org/records/${hit.id}`,
        externalId: String(hit.id),
        creatorName: creators || 'Open Science Community',
        rawLicense: rawLicense,
        licenseUrl: 'https://creativecommons.org/licenses/',
        attributes: {
          format: primaryFile?.type || 'dataset/zip',
          fileSize: primaryFile?.size ? `${Math.round(primaryFile.size / 1024)} KB` : undefined,
          doi: meta.doi,
          quality: 'Original',
          tags: meta.keywords || ['Open Science', 'CERN', 'Datasets']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('zenodo_datasets', err.message);
    return [];
  }
}

// 3. Data.gov Official Federal Open Data Catalog (GSA Catalog v4 API)
export async function queryDataGov(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const apiKey = process.env.DATAGOV_API_KEY || 'DEMO_KEY';
  const url = `https://api.gsa.gov/technology/datagov/v4/search?q=${encodeURIComponent(query)}&per_page=15`;

  try {
    const res = await fetch(url, {
      headers: {
        'X-Api-Key': apiKey,
        'User-Agent': USER_AGENT,
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(7000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('data_gov', Date.now() - start);

    const results = data.results || [];
    const items: ResourceItem[] = [];

    for (const r of results) {
      const dcat = r.dcat || {};
      const title = dcat.title || r.name || 'US Federal Dataset';
      const desc = dcat.description ? dcat.description.replace(/<[^>]*>?/gm, '').substring(0, 350) + '...' : undefined;
      const id = r.id || dcat.identifier || Math.random().toString(36).substring(7);
      const publisher = dcat.publisher?.name || dcat.contactPoint?.fn || 'U.S. Federal Government';
      const distributions = dcat.distribution || [];
      const primaryDist = distributions[0] || {};
      const downloadUrl = primaryDist.downloadURL || primaryDist.accessURL || `https://catalog.data.gov/dataset/${id}`;
      const format = primaryDist.format || primaryDist.mediaType || 'dataset/open';

      items.push(
        buildResourceItem({
          id: `datagov-${id.replace(/[^a-zA-Z0-9-_]/g, '_')}`,
          title,
          category: 'datasets',
          description: desc,
          previewUrl: `https://catalog.data.gov/dataset/${id}`,
          downloadUrl,
          providerId: 'data_gov',
          providerName: 'Data.gov Official Catalog',
          resourceUrl: `https://catalog.data.gov/dataset/${id}`,
          externalId: id,
          creatorName: publisher,
          creatorOrg: publisher,
          rawLicense: dcat.license || 'U.S. Government Public Domain / Open Data',
          licenseUrl: dcat.license || 'https://www.usa.gov/publicdomain/label/1.0/',
          attributes: {
            format: typeof format === 'string' ? format.toLowerCase() : 'dataset',
            quality: 'Original',
            tags: Array.isArray(dcat.keyword) ? dcat.keyword.slice(0, 5) : ['Data.gov', 'Federal Open Data', 'US Government']
          }
        })
      );
    }

    // If data.gov returns empty or fails, gracefully fallback to Zenodo datasets
    if (items.length === 0) {
      return await queryZenodoDatasets(query);
    }
    return items;
  } catch (err: any) {
    recordProviderFailure('data_gov', err.message);
    // Graceful fallback to Zenodo datasets so users always get data
    try {
      return await queryZenodoDatasets(query);
    } catch {
      return [];
    }
  }
}

// 4. World Bank Open Development Projects & Indicators
export async function queryWorldBank(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  // Use World Bank project search API with full-text keyword indexing across all global operations
  const url = `https://search.worldbank.org/api/v2/projects?format=json&qterm=${encodeURIComponent(query)}&rows=15`;

  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(6500) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('world_bank', Date.now() - start);

    const projectsObj = data.projects || {};
    const projectList = Object.values(projectsObj) as any[];

    if (projectList.length === 0) {
      return [];
    }

    return projectList.map((proj: any) => {
      const id = proj.id || Math.random().toString(36).substring(7);
      const country = Array.isArray(proj.countryname) ? proj.countryname.join(', ') : (proj.countryshortname || 'Global');
      const abstract = proj.project_abstract ? proj.project_abstract.substring(0, 320) + '...' : undefined;
      const sectors = Array.isArray(proj.sector) ? proj.sector.map((s: any) => s.Name).filter(Boolean) : [];
      const rawAmt = proj.totalamt ? String(proj.totalamt).replace(/[^\d.]/g, '') : '';
      const totalAmt = rawAmt && !isNaN(Number(rawAmt)) ? `$${Number(rawAmt).toLocaleString()}` : undefined;

      return buildResourceItem({
        id: `worldbank-${id}`,
        title: proj.project_name || `World Bank Project (${country})`,
        category: 'datasets',
        description: abstract || `World Bank international development initiative in ${country}. Total Commitment: ${totalAmt || 'Classified'}. Region: ${proj.regionname || 'Global'}.`,
        previewUrl: `https://projects.worldbank.org/en/projects-operations/project-detail/${id}`,
        downloadUrl: `https://projects.worldbank.org/en/projects-operations/project-detail/${id}`,
        providerId: 'world_bank',
        providerName: 'World Bank Open Data',
        resourceUrl: `https://projects.worldbank.org/en/projects-operations/project-detail/${id}`,
        externalId: id,
        creatorName: 'The World Bank Group',
        rawLicense: 'Creative Commons Attribution 4.0 (CC-BY 4.0)',
        licenseUrl: 'https://data.worldbank.org/summary-terms-of-use',
        providerDefaultLicense: {
          type: 'Creative Commons BY',
          commercialAllowed: true,
          attributionRequired: true
        },
        attributes: {
          format: 'json/data',
          quality: 'Original',
          year: proj.boardapprovaldate ? new Date(proj.boardapprovaldate).getFullYear() : undefined,
          tags: ['World Bank', country, ...(sectors.slice(0, 3))].filter(Boolean)
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('world_bank', err.message);
    return [];
  }
}

// 5. NASA Exoplanet Archive (Caltech/NASA IPAC Astronomical Discovery Catalog)
export async function queryNASAExoplanets(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const cleanQ = query.trim().replace(/['"\\]/g, '');
  // Build TAP SQL query: search by planet name, host star, or discovery facility
  let sql = `select top 15 pl_name,hostname,discoverymethod,disc_year,disc_facility from ps where pl_name like '%${cleanQ}%' or hostname like '%${cleanQ}%' or disc_facility like '%${cleanQ}%' order by disc_year desc`;
  if (!cleanQ || cleanQ.toLowerCase() === 'all' || cleanQ.toLowerCase() === 'space' || cleanQ.toLowerCase() === 'planet') {
    sql = `select top 15 pl_name,hostname,discoverymethod,disc_year,disc_facility from ps order by disc_year desc`;
  }
  const url = `https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=${encodeURIComponent(sql)}&format=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6500)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('nasa_exoplanets', Date.now() - start);

    let records = Array.isArray(data) ? data : [];
    if (records.length === 0) {
      try {
        const fallbackSql = 'select top 15 pl_name,hostname,discoverymethod,disc_year,disc_facility from ps order by disc_year desc';
        const fallbackUrl = `https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=${encodeURIComponent(fallbackSql)}&format=json`;
        const fbRes = await fetch(fallbackUrl, { headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' }, signal: AbortSignal.timeout(3500) });
        if (fbRes.ok) {
          const fbData = await fbRes.json();
          if (Array.isArray(fbData)) records = fbData;
        }
      } catch {
        // ignore fallback error
      }
    }

    if (records.length === 0) return [];

    return records.map((planet: any) => {
      const name = planet.pl_name || 'Exoplanet';
      const star = planet.hostname || 'Unknown Host Star';
      const method = planet.discoverymethod || 'Astronomical Observation';
      const year = planet.disc_year || undefined;
      const facility = planet.disc_facility || 'NASA / International Observatories';
      const id = name.toLowerCase().replace(/[^\w]/g, '-');
      const pageUrl = `https://exoplanetarchive.ipac.caltech.edu/overview/${encodeURIComponent(name)}`;

      return buildResourceItem({
        id: `nasa-exo-${id}`,
        title: `${name} (Confirmed Exoplanet)`,
        category: 'datasets',
        description: `Confirmed extrasolar planet orbiting ${star}. Discovered in ${year || 'recent years'} via ${method} by ${facility}.`,
        previewUrl: pageUrl,
        downloadUrl: pageUrl,
        providerId: 'nasa_exoplanets',
        providerName: 'NASA Exoplanet Archive (Caltech/IPAC)',
        resourceUrl: pageUrl,
        externalId: name,
        creatorName: facility,
        creatorOrg: 'NASA / Caltech IPAC',
        rawLicense: 'Public Domain / NASA Open Astronomical Data',
        licenseUrl: 'https://exoplanetarchive.ipac.caltech.edu/',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: true
        },
        attributes: {
          format: 'json/tap',
          quality: 'Verified NASA Scientific Archive',
          year,
          tags: ['Exoplanet', 'Astronomy', 'NASA', method, facility].filter(Boolean)
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('nasa_exoplanets', err.message);
    return [];
  }
}

// 6. USGS Real-Time Earthquake Hazards Program
export async function queryUsgsEarthquakes(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const clean = query.trim().toLowerCase();
  const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&limit=15&orderby=time`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('usgs_earthquakes', Date.now() - start);

    const features = data.features || [];
    const filtered = clean && clean !== 'all' && clean !== 'earthquake'
      ? features.filter((f: any) => (f.properties?.place || '').toLowerCase().includes(clean) || (f.properties?.title || '').toLowerCase().includes(clean))
      : features;

    const list = filtered.length > 0 ? filtered : features.slice(0, 10);

    return list.map((f: any) => {
      const p = f.properties || {};
      const coords = f.geometry?.coordinates || [0, 0, 0];
      const mag = p.mag != null ? p.mag.toFixed(1) : 'N/A';
      const place = p.place || 'Global Coordinate';
      const timeStr = p.time ? new Date(p.time).toUTCString() : 'Recent';
      const eventUrl = p.url || `https://earthquake.usgs.gov/earthquakes/eventpage/${f.id}`;

      return buildResourceItem({
        id: `usgs-quake-${f.id}`,
        title: `M ${mag} Earthquake — ${place}`,
        category: 'datasets',
        description: `Magnitude ${mag} seismic event recorded on ${timeStr}. Epicenter depth: ${coords[2] || 0} km. USGS Real-time Earthquake Hazards Program.`,
        previewUrl: eventUrl,
        downloadUrl: `https://earthquake.usgs.gov/fdsnws/event/1/query?eventid=${f.id}&format=geojson`,
        providerId: 'usgs_earthquakes',
        providerName: 'USGS Earthquake Hazards',
        resourceUrl: eventUrl,
        externalId: String(f.id),
        creatorName: 'United States Geological Survey (USGS)',
        rawLicense: 'Public Domain (USGS Open Data)',
        licenseUrl: 'https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'geojson',
          coordinates: [coords[1], coords[0]],
          region: place,
          quality: 'Official USGS Seismic Sensor Feed',
          tags: [`M ${mag}`, 'Earthquake', 'Seismology', 'USGS', place].filter(Boolean)
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('usgs_earthquakes', err.message);
    return [];
  }
}

// 7. Harvard Dataverse Open Research Repository
export async function queryHarvardDataverse(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const clean = encodeURIComponent(query.trim() || 'climate');
  const url = `https://dataverse.harvard.edu/api/search?q=${clean}&type=dataset&per_page=12`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6500)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('harvard_dataverse', Date.now() - start);

    const items = data.data?.items || [];
    return items.map((ds: any) => {
      const name = ds.name || 'Research Dataset';
      const authors = (ds.authors || []).join(', ') || 'Academic Researchers';
      const doi = ds.global_id || ds.url;
      const pubDate = ds.published_at || '';
      const year = pubDate ? parseInt(pubDate.substring(0, 4), 10) : undefined;
      const resourceUrl = ds.url || `https://doi.org/${ds.global_id}`;

      return buildResourceItem({
        id: `dataverse-${ds.entity_id || Math.random().toString(36).substring(7)}`,
        title: name,
        category: 'datasets',
        description: ds.description
          ? `${ds.description.substring(0, 300)}... Published in Harvard Dataverse (${pubDate || 'Recent'}). Authors: ${authors}.`
          : `Scholarly research dataset deposited in Harvard Dataverse. Authors: ${authors}. Published: ${pubDate}.`,
        previewUrl: resourceUrl,
        downloadUrl: resourceUrl,
        providerId: 'harvard_dataverse',
        providerName: 'Harvard Dataverse',
        resourceUrl,
        externalId: ds.global_id,
        creatorName: authors,
        creatorOrg: 'Harvard Dataverse Network',
        rawLicense: 'CC0 / Open Research Data',
        licenseUrl: 'https://dataverse.harvard.edu/',
        providerDefaultLicense: {
          type: 'Public Domain / CC0',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'tabular/data',
          year,
          doi,
          quality: 'Peer-Reviewed Research Dataset',
          tags: ['Harvard', 'Dataverse', 'Open Data', 'Scientific Research'].filter(Boolean)
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('harvard_dataverse', err.message);
    return [];
  }
}

// 8. CERN Open Data (High-Energy Physics & Particle Collisions)
export async function queryCernOpenData(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const clean = encodeURIComponent(query.trim() || 'higgs');
  const url = `https://opendata.cern.ch/api/records/?q=${clean}&size=12`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(7500)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('cern_opendata', Date.now() - start);

    const hits = data.hits?.hits || [];
    return hits.map((hit: any) => {
      const meta = hit.metadata || {};
      const id = hit.id || meta.recid;
      const title = meta.title || 'CERN Collision Dataset';
      const experiment = (meta.experiment || []).join(', ') || 'CERN';
      const coll = meta.accelerator || 'LHC';
      const desc = meta.abstract?.description || meta.description || `High-energy particle physics collision run from the ${experiment} experiment at the CERN Large Hadron Collider.`;
      const resourceUrl = `https://opendata.cern.ch/record/${id}`;

      return buildResourceItem({
        id: `cern-${id}`,
        title,
        category: 'datasets',
        description: `${desc.substring(0, 300)}... Experiment: ${experiment} (${coll}). CERN Open Data Initiative.`,
        previewUrl: resourceUrl,
        downloadUrl: resourceUrl,
        providerId: 'cern_opendata',
        providerName: 'CERN Open Data',
        resourceUrl,
        externalId: String(id),
        creatorName: `${experiment} Collaboration`,
        creatorOrg: 'European Organization for Nuclear Research (CERN)',
        rawLicense: 'CC0 1.0 Public Domain Dedication',
        licenseUrl: 'https://opendata.cern.ch/about',
        providerDefaultLicense: {
          type: 'Public Domain / CC0',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'root/hdf5/csv',
          quality: 'Primary Particle Physics Detector Data',
          tags: ['CERN', 'LHC', experiment, 'Particle Physics', 'Higgs'].filter(Boolean)
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('cern_opendata', err.message);
    return [];
  }
}



