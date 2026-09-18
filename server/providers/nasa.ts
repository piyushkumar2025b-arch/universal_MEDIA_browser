import { ResourceItem, NasaSubCategory } from '../../src/types/resource';
import { buildResourceItem } from '../normalizer';
import { recordProviderSuccess, recordProviderFailure, registerTracker } from '../telemetry';

const USER_AGENT = 'URMIL-UniversalMediaBrowser/2.0 (open-access-bot; contact@example.com)';

// Register all NASA telemetry trackers
registerTracker({
  id: 'nasa',
  name: 'NASA Image & Video Library',
  category: 'nasa',
  rateLimit: 'Open Unlimited',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'nasa_apod',
  name: 'NASA Astronomy Picture of the Day (APOD)',
  category: 'nasa',
  rateLimit: '1000/hr',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'nasa_mars_rovers',
  name: 'NASA Mars Exploration Rovers (Curiosity & Perseverance)',
  category: 'nasa',
  rateLimit: 'Open Unlimited',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'nasa_epic',
  name: 'NASA DSCOVR Earth Polychromatic Imaging Camera (EPIC)',
  category: 'nasa',
  rateLimit: 'Open Unlimited',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'nasa_video',
  name: 'NASA Video Archive & Missions',
  category: 'nasa',
  rateLimit: 'Open Unlimited',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'nasa_audio',
  name: 'NASA Space Sounds & Mission Transmissions',
  category: 'nasa',
  rateLimit: 'Open Unlimited',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'nasa_asteroids',
  name: 'NASA JPL Near-Earth Asteroid Close Approach Data (CAD)',
  category: 'nasa',
  rateLimit: 'Open Unlimited',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'nasa_exoplanets',
  name: 'NASA Exoplanet Archive (Caltech IPAC)',
  category: 'nasa',
  rateLimit: 'Open Unlimited',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'nasa_ntrs',
  name: 'NASA Technical Reports Server (NTRS)',
  category: 'nasa',
  rateLimit: 'Open Unlimited',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'nasa_osdr',
  name: 'NASA Open Science Data Repository (Astrobiology & Spaceflight)',
  category: 'nasa',
  rateLimit: 'Open Unlimited',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'nasa_spaceweather',
  name: 'NOAA / NASA Space Weather Prediction Center (SWPC)',
  category: 'nasa',
  rateLimit: 'Open Unlimited',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_nasa_docs',
  name: 'NASA Historical Mission Documentation & Transcripts Archive',
  category: 'nasa',
  rateLimit: 'Open Unlimited',
  authRequired: false,
  authConfigured: true
});

// 1. General NASA Imagery
export async function queryNASAImages(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const cleanQ = (query || '').trim() || 'nebula';
  const url = `https://images-api.nasa.gov/search?q=${encodeURIComponent(cleanQ)}&media_type=image&page_size=15`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('nasa', Date.now() - start);

    const items = data.collection?.items || [];
    return items.map((item: any) => {
      const d = item.data?.[0] || {};
      const thumb = item.links?.find((l: any) => l.rel === 'preview')?.href;
      return buildResourceItem({
        id: `nasa-${d.nasa_id || Math.random().toString(36).substring(7)}`,
        title: d.title || 'NASA Mission Imagery',
        category: 'nasa',
        description: d.description || undefined,
        previewUrl: thumb,
        thumbnailUrl: thumb,
        downloadUrl: thumb,
        providerId: 'nasa',
        providerName: 'NASA Imagery & Science Archive',
        resourceUrl: `https://images.nasa.gov/details/${encodeURIComponent(d.nasa_id || '')}`,
        externalId: d.nasa_id,
        creatorName: d.center ? `NASA ${d.center}` : 'NASA',
        creatorOrg: 'National Aeronautics and Space Administration',
        rawLicense: 'Public Domain / NASA Open Access',
        licenseUrl: 'https://www.nasa.gov/multimedia/guidelines/index.html',
        providerDefaultLicense: {
          type: 'Public Domain / CC0',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'jpg',
          year: d.date_created ? new Date(d.date_created).getFullYear() : undefined,
          quality: 'Original',
          tags: ['nasa', 'space', ...(d.keywords || [])],
          center: d.center,
          nasaSubCategory: 'images'
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('nasa', err.message);
    return [];
  }
}

// 2. NASA Astronomy Picture of the Day (APOD)
export async function queryNasaApod(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const apiKey = process.env.NASA_API_KEY || 'DEMO_KEY';
  const url = `https://api.nasa.gov/planetary/apod?api_key=${encodeURIComponent(apiKey)}&count=8`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) {
      // Fallback: search images-api for astronomy picture of the day
      return await queryApodFallback(query);
    }
    const data = await res.json();
    if (data.error || !Array.isArray(data)) {
      return await queryApodFallback(query);
    }
    recordProviderSuccess('nasa_apod', Date.now() - start);

    return data
      .filter((item: any) => item && (item.media_type === 'image' || item.url))
      .map((item: any) =>
        buildResourceItem({
          id: `nasa-apod-${item.date || Math.random().toString(36).substring(7)}`,
          title: item.title ? `APOD: ${item.title}` : 'NASA Astronomy Picture of the Day',
          category: 'nasa',
          description: item.explanation,
          thumbnailUrl: item.url,
          previewUrl: item.hdurl || item.url,
          downloadUrl: item.hdurl || item.url,
          providerId: 'nasa_apod',
          providerName: 'NASA APOD (Astronomy Picture of the Day)',
          resourceUrl: `https://apod.nasa.gov/apod/ap${(item.date || '').replace(/-/g, '').substring(2)}.html`,
          externalId: item.date,
          creatorName: item.copyright ? item.copyright.trim() : 'NASA / APOD',
          creatorOrg: 'NASA Astronomy Picture of the Day',
          rawLicense: 'Public Domain / NASA Open Access',
          licenseUrl: 'https://www.nasa.gov/multimedia/guidelines/index.html',
          providerDefaultLicense: {
            type: 'Public Domain / CC0',
            commercialAllowed: true,
            attributionRequired: false
          },
          attributes: {
            date: item.date,
            format: 'jpg',
            quality: item.hdurl ? '4K' : 'HD',
            tags: ['apod', 'astronomy', 'nasa', 'deep-space'],
            nasaSubCategory: 'images'
          }
        })
      );
  } catch (err: any) {
    recordProviderFailure('nasa_apod', err.message);
    return await queryApodFallback(query);
  }
}

async function queryApodFallback(query: string): Promise<ResourceItem[]> {
  const cleanQ = (query || '').trim() || 'astronomy picture of the day';
  const url = `https://images-api.nasa.gov/search?q=${encodeURIComponent(cleanQ)}&media_type=image&page_size=8`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const data = await res.json();
    const items = data.collection?.items || [];
    return items.map((item: any) => {
      const d = item.data?.[0] || {};
      const thumb = item.links?.find((l: any) => l.rel === 'preview')?.href;
      return buildResourceItem({
        id: `nasa-apod-fb-${d.nasa_id || Math.random().toString(36).substring(7)}`,
        title: `APOD Archive: ${d.title || 'Cosmic Deep Space'}`,
        category: 'nasa',
        description: d.description,
        thumbnailUrl: thumb,
        previewUrl: thumb,
        downloadUrl: thumb,
        providerId: 'nasa_apod',
        providerName: 'NASA APOD Archive',
        resourceUrl: `https://images.nasa.gov/details/${encodeURIComponent(d.nasa_id || '')}`,
        externalId: d.nasa_id,
        creatorName: 'NASA / STScI / JPL',
        creatorOrg: 'NASA',
        rawLicense: 'Public Domain / CC0',
        licenseUrl: 'https://www.nasa.gov/multimedia/guidelines/index.html',
        attributes: {
          format: 'jpg',
          quality: 'HD',
          tags: ['apod', 'space', 'cosmos'],
          nasaSubCategory: 'images'
        }
      });
    });
  } catch {
    return [];
  }
}

// 3. Mars Rovers (Curiosity, Perseverance, Opportunity, Spirit)
export async function queryMarsRovers(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const cleanQ = (query || '').trim();
  const searchQuery = cleanQ ? `mars rover ${cleanQ}` : 'mars rover curiosity perseverance';
  const url = `https://images-api.nasa.gov/search?q=${encodeURIComponent(searchQuery)}&media_type=image&page_size=15`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('nasa_mars_rovers', Date.now() - start);

    const items = data.collection?.items || [];
    return items.map((item: any) => {
      const d = item.data?.[0] || {};
      const thumb = item.links?.find((l: any) => l.rel === 'preview')?.href;
      return buildResourceItem({
        id: `nasa-mars-${d.nasa_id || Math.random().toString(36).substring(7)}`,
        title: d.title || 'Mars Rover Surface Mission Photography',
        category: 'nasa',
        description: d.description || 'NASA Mars Science Laboratory and Mars 2020 surface exploration photography.',
        thumbnailUrl: thumb,
        previewUrl: thumb,
        downloadUrl: thumb,
        providerId: 'nasa_mars_rovers',
        providerName: 'NASA Mars Exploration Rovers',
        resourceUrl: `https://images.nasa.gov/details/${encodeURIComponent(d.nasa_id || '')}`,
        externalId: d.nasa_id,
        creatorName: 'NASA / JPL-Caltech',
        creatorOrg: 'Jet Propulsion Laboratory',
        rawLicense: 'Public Domain / NASA Open Access',
        licenseUrl: 'https://www.nasa.gov/multimedia/guidelines/index.html',
        providerDefaultLicense: {
          type: 'Public Domain / CC0',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          mission: 'Mars Exploration Program',
          target: 'Mars Red Planet',
          center: 'JPL',
          year: d.date_created ? new Date(d.date_created).getFullYear() : 2024,
          format: 'jpg',
          quality: 'Original',
          tags: ['mars', 'rover', 'curiosity', 'perseverance', 'red-planet', 'jpl'],
          nasaSubCategory: 'mars'
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('nasa_mars_rovers', err.message);
    return [];
  }
}

// 4. NASA DSCOVR Earth Polychromatic Imaging Camera (EPIC)
export async function queryNasaEpic(_query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = 'https://epic.gsfc.nasa.gov/api/natural';

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('nasa_epic', Date.now() - start);

    const items = Array.isArray(data) ? data.slice(0, 12) : [];
    return items.map((item: any) => {
      const dateParts = (item.date || '').split(' ')[0]?.split('-') || ['2026', '01', '01'];
      const year = dateParts[0];
      const month = dateParts[1];
      const day = dateParts[2];
      const imageName = item.image;

      const pngUrl = `https://epic.gsfc.nasa.gov/archive/natural/${year}/${month}/${day}/png/${imageName}.png`;
      const thumbUrl = `https://epic.gsfc.nasa.gov/archive/natural/${year}/${month}/${day}/thumbs/${imageName}.jpg`;

      const coords = item.centroid_coordinates
        ? `Lat: ${item.centroid_coordinates.lat.toFixed(1)}°, Lon: ${item.centroid_coordinates.lon.toFixed(1)}°`
        : 'Earth Centroid';

      return buildResourceItem({
        id: `nasa-epic-${item.identifier || item.image}`,
        title: `DSCOVR EPIC: Full-Disc Earth (${item.date || 'Sun-Earth L1'})`,
        category: 'nasa',
        description: `Natural colour whole-globe photograph of Earth captured from 1 million miles away at Sun-Earth Lagrange point 1 (L1) by NASA DSCOVR EPIC instrument. ${coords}.`,
        thumbnailUrl: thumbUrl,
        previewUrl: pngUrl,
        downloadUrl: pngUrl,
        providerId: 'nasa_epic',
        providerName: 'NASA DSCOVR EPIC Earth Observatory',
        resourceUrl: `https://epic.gsfc.nasa.gov/?date=${year}-${month}-${day}`,
        externalId: item.image,
        creatorName: 'NASA Goddard Space Flight Center',
        creatorOrg: 'NASA / NOAA',
        rawLicense: 'Public Domain / NASA Open Access',
        licenseUrl: 'https://www.nasa.gov/multimedia/guidelines/index.html',
        providerDefaultLicense: {
          type: 'Public Domain / CC0',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'png',
          date: item.date,
          quality: '4K',
          centroidCoordinates: item.centroid_coordinates,
          distanceFromEarthKm: item.dscovr_j2000_position ? 1500000 : 1000000,
          tags: ['earth', 'dscovr', 'epic', 'climate', 'full-disc', 'satellite'],
          nasaSubCategory: 'epic'
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('nasa_epic', err.message);
    return [];
  }
}

// 5. NASA Videos Archive
export async function queryNASAVideos(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const cleanQ = (query || '').trim() || 'space launch';
  const url = `https://images-api.nasa.gov/search?q=${encodeURIComponent(cleanQ)}&media_type=video&page_size=15`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('nasa_video', Date.now() - start);

    const items = data.collection?.items || [];
    return items.map((item: any) => {
      const dataObj = item.data?.[0] || {};
      const links = item.links || [];
      const thumb = links.find((l: any) => l.rel === 'preview')?.href;
      const nasaId = dataObj.nasa_id || Math.random().toString(36).substring(7);

      return buildResourceItem({
        id: `nasa-vid-${nasaId}`,
        title: dataObj.title || 'NASA Mission Video',
        category: 'nasa',
        description: dataObj.description || undefined,
        thumbnailUrl: thumb,
        previewUrl: thumb,
        downloadUrl: `https://images-assets.nasa.gov/video/${encodeURIComponent(nasaId)}/${encodeURIComponent(nasaId)}~orig.mp4`,
        providerId: 'nasa_video',
        providerName: 'NASA Video Archive',
        resourceUrl: `https://images.nasa.gov/details/${encodeURIComponent(nasaId)}`,
        externalId: nasaId,
        creatorName: dataObj.center ? `NASA ${dataObj.center}` : 'NASA',
        creatorOrg: 'National Aeronautics and Space Administration',
        rawLicense: 'Public Domain / NASA Open Access',
        licenseUrl: 'https://www.nasa.gov/multimedia/guidelines/index.html',
        providerDefaultLicense: {
          type: 'Public Domain / CC0',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'mp4',
          quality: 'HD',
          duration: dataObj.duration,
          year: dataObj.date_created ? new Date(dataObj.date_created).getFullYear() : undefined,
          tags: ['nasa', 'video', 'spaceflight', ...(dataObj.keywords || [])],
          center: dataObj.center,
          nasaSubCategory: 'videos'
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('nasa_video', err.message);
    return [];
  }
}

// 6. NASA Audio & Space Sounds
export async function queryNasaAudio(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const clean = (query || '').trim() || 'apollo';
  const url = `https://images-api.nasa.gov/search?q=${encodeURIComponent(clean)}&media_type=audio`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const items = data.collection?.items || [];

    if (items.length > 0) {
      recordProviderSuccess('nasa_audio', Date.now() - start);
      return items.slice(0, 15).map((item: any) => {
        const d = item.data?.[0] || {};
        const nasaId = d.nasa_id || Math.random().toString(36).substring(7);
        const resourceUrl = `https://images.nasa.gov/details/${encodeURIComponent(nasaId)}`;
        const streamUrl = `/api/v1/media/stream?url=${encodeURIComponent(resourceUrl)}&type=audio`;

        return buildResourceItem({
          id: `nasa-audio-${nasaId}`,
          title: d.title || 'NASA Mission Audio Transmission',
          category: 'nasa',
          description: d.description || 'Historic astronaut voice communications, rocket telemetry, and planetary radio emissions recorded by NASA missions.',
          previewUrl: streamUrl,
          downloadUrl: streamUrl,
          thumbnailUrl: 'https://images-assets.nasa.gov/image/PIA12348/PIA12348~thumb.jpg',
          providerId: 'nasa_audio',
          providerName: 'NASA Sounds & Flight Audio',
          resourceUrl,
          externalId: nasaId,
          creatorName: d.center ? `NASA ${d.center}` : 'NASA Flight Communications',
          creatorOrg: 'National Aeronautics and Space Administration',
          rawLicense: 'Public Domain / NASA Open Access',
          licenseUrl: 'https://www.nasa.gov/multimedia/guidelines/index.html',
          providerDefaultLicense: {
            type: 'Public Domain / CC0',
            commercialAllowed: true,
            attributionRequired: false
          },
          attributes: {
            format: 'mp3',
            quality: 'Original',
            year: d.date_created ? new Date(d.date_created).getFullYear() : undefined,
            tags: ['nasa', 'audio', 'transmission', 'apollo', 'radio'],
            center: d.center,
            nasaSubCategory: 'audio'
          }
        });
      });
    }

    // Fallback: Internet Archive NASA Audio Collection
    return await queryArchiveNasaAudio(clean);
  } catch (err: any) {
    recordProviderFailure('nasa_audio', err.message);
    return await queryArchiveNasaAudio(clean);
  }
}

async function queryArchiveNasaAudio(query: string): Promise<ResourceItem[]> {
  const iaUrl = `https://archive.org/advancedsearch.php?q=collection:(nasaaudio)+AND+(${encodeURIComponent(query)})&fl[]=identifier,title,creator,description,year,licenseurl&rows=10&output=json`;
  try {
    const res = await fetch(iaUrl, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const json = await res.json();
    const docs = json.response?.docs || [];
    return docs.map((doc: any) =>
      buildResourceItem({
        id: `nasa-ia-${doc.identifier}`,
        title: doc.title || 'NASA Historical Audio Recording',
        category: 'nasa',
        description: doc.description || 'Historical audio recording from NASA space missions preserved by the Internet Archive.',
        previewUrl: `https://archive.org/download/${doc.identifier}/${doc.identifier}.mp3`,
        downloadUrl: `https://archive.org/download/${doc.identifier}/${doc.identifier}.mp3`,
        thumbnailUrl: `https://archive.org/services/img/${doc.identifier}`,
        providerId: 'nasa_audio',
        providerName: 'NASA Audio Archive (IA)',
        resourceUrl: `https://archive.org/details/${doc.identifier}`,
        externalId: doc.identifier,
        creatorName: doc.creator || 'NASA',
        creatorOrg: 'National Aeronautics and Space Administration',
        rawLicense: doc.licenseurl || 'Public Domain / NASA Open Access',
        attributes: {
          format: 'mp3',
          year: doc.year ? parseInt(doc.year, 10) : undefined,
          tags: ['nasa', 'audio', 'space', 'mission'],
          nasaSubCategory: 'audio'
        }
      })
    );
  } catch {
    return [];
  }
}

// 7. NASA JPL Near-Earth Asteroid Close Approach Data (CAD API)
export async function queryNasaAsteroids(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const cleanQ = (query || '').trim().toLowerCase();
  const url = 'https://ssd-api.jpl.nasa.gov/cad.api?dist-max=10LD&limit=25';

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('nasa_asteroids', Date.now() - start);

    const fields = data.fields || [];
    const desIdx = fields.indexOf('des');
    const cdIdx = fields.indexOf('cd');
    const distIdx = fields.indexOf('dist');
    const distMinIdx = fields.indexOf('dist_min');
    const vrelIdx = fields.indexOf('v_rel');
    const hIdx = fields.indexOf('h');

    let rows: any[][] = data.data || [];
    if (cleanQ) {
      rows = rows.filter((r) => {
        const des = String(r[desIdx] || '').toLowerCase();
        return des.includes(cleanQ) || cleanQ.includes('asteroid') || cleanQ.includes('orbit') || cleanQ.includes('jpl');
      });
      // If specific search had zero matches, retain rows to show relevant asteroid telemetry
      if (rows.length === 0) rows = (data.data || []).slice(0, 15);
    }

    return rows.map((row) => {
      const designation = row[desIdx] || 'Near-Earth Object';
      const closeApproachDate = row[cdIdx] || 'Upcoming';
      const distAu = parseFloat(row[distIdx] || '0');
      const distLd = (distAu * 389.17).toFixed(2); // 1 AU ≈ 389.17 Lunar Distances
      const velocityKmS = parseFloat(row[vrelIdx] || '0').toFixed(1);
      const absMagnitude = row[hIdx] || 'N/A';

      // Estimate diameter in meters from absolute magnitude H (assuming albedo ~ 0.14)
      const hNum = parseFloat(absMagnitude);
      let estDiamMeters = 'Unknown';
      if (!isNaN(hNum)) {
        const dKm = (1329 / Math.sqrt(0.14)) * Math.pow(10, -0.2 * hNum);
        estDiamMeters = dKm < 1 ? `${Math.round(dKm * 1000)} m` : `${dKm.toFixed(2)} km`;
      }

      return buildResourceItem({
        id: `nasa-cad-${designation.replace(/\s+/g, '_')}`,
        title: `Near-Earth Asteroid: ${designation}`,
        category: 'nasa',
        description: `Asteroid ${designation} close-approach to Earth on ${closeApproachDate}. Miss distance: ${distLd} Lunar Distances (${distAu.toFixed(4)} AU). Relative velocity: ${velocityKmS} km/s (~${Math.round(parseFloat(velocityKmS) * 3600).toLocaleString()} km/h). Estimated diameter: ~${estDiamMeters}.`,
        thumbnailUrl: 'https://images-assets.nasa.gov/image/PIA24473/PIA24473~thumb.jpg',
        previewUrl: `https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=${encodeURIComponent(designation)}`,
        downloadUrl: `https://ssd-api.jpl.nasa.gov/cad.api?sstr=${encodeURIComponent(designation)}`,
        providerId: 'nasa_asteroids',
        providerName: 'NASA JPL Center for Near Earth Object Studies (CNEOS)',
        resourceUrl: `https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=${encodeURIComponent(designation)}`,
        externalId: designation,
        creatorName: 'NASA / JPL Solar System Dynamics Group',
        creatorOrg: 'Jet Propulsion Laboratory',
        rawLicense: 'Public Domain / NASA Open Data',
        licenseUrl: 'https://www.jpl.nasa.gov/who-we-are/jpl-image-use-policy',
        providerDefaultLicense: {
          type: 'Public Domain / CC0',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          designation,
          closeApproachDate,
          missDistanceLunarDistances: parseFloat(distLd),
          missDistanceAU: distAu,
          relativeVelocityKmS: parseFloat(velocityKmS),
          absoluteMagnitudeH: absMagnitude,
          estimatedDiameter: estDiamMeters,
          orbitCenter: 'Sun',
          tags: ['asteroid', 'cneos', 'jpl', 'near-earth-object', 'orbit', 'cad'],
          nasaSubCategory: 'asteroids'
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('nasa_asteroids', err.message);
    return [];
  }
}

// 8. NASA Exoplanet Archive (Caltech IPAC TAP Queries)
export async function queryNASAExoplanets(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const cleanQ = (query || '').trim().replace(/'/g, '');
  let whereClause = 'default_flag=1';
  if (cleanQ) {
    whereClause += ` AND (lower(pl_name) LIKE '%${cleanQ.toLowerCase()}%' OR lower(hostname) LIKE '%${cleanQ.toLowerCase()}%' OR lower(disc_facility) LIKE '%${cleanQ.toLowerCase()}%')`;
  }

  const tapUrl = `https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=select+top+15+pl_name,hostname,discoverymethod,disc_year,disc_facility,pl_orbper,pl_rade,pl_bmasse,sy_dist+from+ps+where+${encodeURIComponent(whereClause)}+order+by+disc_year+desc&format=json`;

  try {
    const res = await fetch(tapUrl, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6500)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('nasa_exoplanets', Date.now() - start);

    return (data || []).map((exo: any) => {
      const name = exo.pl_name || 'Extrasolar Planet';
      const facility = exo.disc_facility || 'Observatory';
      const method = exo.discoverymethod || 'Transit';
      const year = exo.disc_year || 'Unknown';
      const period = exo.pl_orbper ? `${parseFloat(exo.pl_orbper).toFixed(2)} days` : 'Unknown';
      const radius = exo.pl_rade ? `${parseFloat(exo.pl_rade).toFixed(2)} Earth radii` : 'N/A';
      const dist = exo.sy_dist ? `${parseFloat(exo.sy_dist).toFixed(1)} parsecs (~${Math.round(parseFloat(exo.sy_dist) * 3.26)} light-years)` : 'Distance unknown';

      return buildResourceItem({
        id: `nasa-exo-${name.replace(/\s+/g, '_')}`,
        title: `Exoplanet: ${name}`,
        category: 'nasa',
        description: `Confirmed exoplanet orbiting host star ${exo.hostname || 'parent star'}. Discovered in ${year} via ${method} by ${facility}. Orbital period: ${period}. Planetary radius: ${radius}. Distance from Earth: ${dist}.`,
        thumbnailUrl: 'https://images-assets.nasa.gov/image/PIA22081/PIA22081~thumb.jpg',
        previewUrl: `https://exoplanetarchive.ipac.caltech.edu/overview/${encodeURIComponent(name)}`,
        downloadUrl: `https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=select+*+from+ps+where+pl_name='${encodeURIComponent(name)}'&format=json`,
        providerId: 'nasa_exoplanets',
        providerName: 'NASA Exoplanet Archive (Caltech IPAC)',
        resourceUrl: `https://exoplanetarchive.ipac.caltech.edu/overview/${encodeURIComponent(name)}`,
        externalId: name,
        creatorName: 'NASA Exoplanet Science Institute (NExScI)',
        creatorOrg: 'Caltech / NASA',
        rawLicense: 'Public Domain / Open Scientific Data',
        licenseUrl: 'https://exoplanetarchive.ipac.caltech.edu/docs/data_citations.html',
        providerDefaultLicense: {
          type: 'Public Domain / CC0',
          commercialAllowed: true,
          attributionRequired: true
        },
        attributes: {
          hostStar: exo.hostname,
          discoveryMethod: method,
          discoveryYear: year,
          discoveryFacility: facility,
          orbitalPeriodDays: exo.pl_orbper,
          earthRadii: exo.pl_rade,
          distanceParsecs: exo.sy_dist,
          tags: ['exoplanet', 'kepler', 'tess', 'james-webb', 'caltech', 'astronomy'],
          nasaSubCategory: 'exoplanets'
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('nasa_exoplanets', err.message);
    return [];
  }
}

// 9. NASA Technical Reports Server (NTRS)
export async function queryNasaNtrs(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const clean = (query || '').trim() || 'propulsion';
  const url = `https://ntrs.nasa.gov/api/citations/search?q=${encodeURIComponent(clean)}&page.size=15`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('nasa_ntrs', Date.now() - start);

    const results = data.results || [];
    return results.map((item: any) => {
      const id = item.id;
      const title = item.title || 'NASA Technical Report';
      const abstract = item.abstract || item.description || undefined;
      const pubDate = item.distributionDate || item.published || item.created;
      const year = pubDate ? new Date(pubDate).getFullYear() : undefined;
      const authors = (item.authorAffiliations || []).map((a: any) => a.meta?.author?.name).filter(Boolean);
      const resourceUrl = `https://ntrs.nasa.gov/citations/${id}`;
      const relativePdf = item.downloads?.[0]?.links?.pdf;
      const downloadUrl = relativePdf
        ? (relativePdf.startsWith('http') ? relativePdf : `https://ntrs.nasa.gov${relativePdf}`)
        : resourceUrl;

      return buildResourceItem({
        id: `nasa-ntrs-${id}`,
        title,
        category: 'nasa',
        description: abstract,
        thumbnailUrl: 'https://images-assets.nasa.gov/image/PIA12348/PIA12348~thumb.jpg',
        previewUrl: resourceUrl,
        downloadUrl,
        providerId: 'nasa_ntrs',
        providerName: 'NASA Technical Reports Server (NTRS)',
        resourceUrl,
        externalId: String(id),
        creatorName: authors.length > 0 ? authors : (item.center?.name ? `NASA ${item.center.name}` : 'NASA Aeronautics'),
        creatorOrg: 'NASA Technical Information Services',
        rawLicense: 'Public Domain / NASA Scientific Data',
        licenseUrl: 'https://ntrs.nasa.gov/',
        attributes: {
          year,
          format: 'pdf',
          quality: 'Technical Report',
          tags: ['ntrs', 'aerospace', 'propulsion', 'aeronautics', 'nasa-research'],
          nasaSubCategory: 'papers'
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('nasa_ntrs', err.message);
    return [];
  }
}

// 10. NASA Open Science Data Repository (OSDR Astrobiology & Biological Spaceflight Studies)
export async function queryNasaOsdr(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const cleanQ = (query || '').trim() || 'spaceflight microgravity';
  const url = `https://osdr.nasa.gov/osdr/data/search?term=${encodeURIComponent(cleanQ)}&size=15`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('nasa_osdr', Date.now() - start);

    const hits = data.hits?.hits || [];
    return hits.map((hit: any) => {
      const src = hit._source || {};
      const title = src['Study Title'] || src['Project Title'] || 'NASA Biological Spaceflight Study';
      const accession = src.Accession || src['Study Identifier'] || hit._id || 'OSD-Study';
      const organism = src.organism || 'Biological Specimen';
      const mission = src.Mission?.Name || src['Space Program'] || 'International Space Station (ISS)';
      const description = src['Study Description'] || `Open-science space biology research investigation conducted under microgravity conditions. Organism: ${organism}. Mission: ${mission}.`;

      const resourceUrl = `https://osdr.nasa.gov/bio/repo/data/studies/${encodeURIComponent(accession)}`;

      return buildResourceItem({
        id: `nasa-osdr-${accession}`,
        title: `OSDR [${accession}]: ${title}`,
        category: 'nasa',
        description,
        thumbnailUrl: 'https://images-assets.nasa.gov/image/iss068e028345/iss068e028345~thumb.jpg',
        previewUrl: resourceUrl,
        downloadUrl: resourceUrl,
        providerId: 'nasa_osdr',
        providerName: 'NASA Open Science Data Repository (OSDR)',
        resourceUrl,
        externalId: accession,
        creatorName: src['Study Person'] ? (Array.isArray(src['Study Person']) ? src['Study Person'].map((p: any) => p['Study Person Last Name']).join(', ') : 'NASA Space Biology Investigators') : 'NASA Ames Space Biosciences',
        creatorOrg: 'NASA Space Biology Program',
        rawLicense: 'CC0 1.0 Universal / NASA Public Domain',
        licenseUrl: 'https://osdr.nasa.gov/bio/repo/help/citation',
        providerDefaultLicense: {
          type: 'Public Domain / CC0',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          accession,
          organism,
          mission,
          experimentPlatform: src['Experiment Platform'],
          assayType: src['Study Assay Technology Type'],
          tags: ['osdr', 'astrobiology', 'spaceflight', 'microgravity', 'genomics', 'iss'],
          nasaSubCategory: 'biology'
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('nasa_osdr', err.message);
    return [];
  }
}

// 11. NOAA / NASA Space Weather Prediction Center (SWPC Real-Time Geomagnetic K-Index & Solar Flux)
export async function queryNasaSpaceWeather(_query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const kpUrl = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json';

  try {
    const res = await fetch(kpUrl, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('nasa_spaceweather', Date.now() - start);

    const latest = Array.isArray(data) ? data.slice(-8).reverse() : [];
    return latest.map((item: any, idx: number) => {
      const kp = typeof item.Kp === 'number' ? item.Kp : (parseFloat(item.Kp) || 0);
      let activityLevel = 'Quiet (G0)';
      if (kp >= 5) activityLevel = 'Minor Geomagnetic Storm (G1)';
      if (kp >= 6) activityLevel = 'Moderate Geomagnetic Storm (G2)';
      if (kp >= 7) activityLevel = 'Strong Geomagnetic Storm (G3)';
      if (kp >= 8) activityLevel = 'Severe Geomagnetic Storm (G4)';
      if (kp >= 9) activityLevel = 'Extreme Geomagnetic Storm (G5)';

      const time = item.time_tag || 'Live Real-time';

      return buildResourceItem({
        id: `nasa-swpc-kp-${idx}-${time.replace(/[^a-zA-Z0-9]/g, '_')}`,
        title: `Space Weather: Planetary K-Index Kp ${kp.toFixed(1)} [${activityLevel}]`,
        category: 'nasa',
        description: `Planetary geomagnetic disturbance index observed at ${time} UTC. Activity status: ${activityLevel}. Station count: ${item.station_count || 8}. Solar-terrestrial environment monitoring provided by SWPC / NASA Heliophysics.`,
        thumbnailUrl: 'https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e000494/GSFC_20171208_Archive_e000494~thumb.jpg',
        previewUrl: 'https://www.swpc.noaa.gov/products/planetary-k-index',
        downloadUrl: kpUrl,
        providerId: 'nasa_spaceweather',
        providerName: 'NOAA / NASA Space Weather Prediction Center',
        resourceUrl: 'https://www.swpc.noaa.gov/',
        externalId: time,
        creatorName: 'NOAA Space Weather Prediction Center & NASA Heliophysics',
        creatorOrg: 'NOAA / NASA',
        rawLicense: 'Public Domain / US Federal Government',
        licenseUrl: 'https://www.swpc.noaa.gov/',
        attributes: {
          kpIndex: kp,
          activityLevel,
          timeTag: time,
          tags: ['space-weather', 'geomagnetic', 'aurora', 'solar-flare', 'sun', 'swpc'],
          nasaSubCategory: 'spaceweather'
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('nasa_spaceweather', err.message);
    return [];
  }
}

// 12. NASA Historical Mission Documentation Archive (Internet Archive collection:nasa)
export async function queryArchiveNasaDocs(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const cleanQ = (query || '').trim() || 'apollo flight report';
  const url = `https://archive.org/advancedsearch.php?q=collection:(nasa)+AND+(${encodeURIComponent(cleanQ)})&fl[]=identifier,title,creator,description,year,licenseurl&sort[]=downloads+desc&rows=15&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    recordProviderSuccess('archive_nasa_docs', Date.now() - start);

    const docs = json.response?.docs || [];
    return docs.map((doc: any) => {
      const id = doc.identifier;
      return buildResourceItem({
        id: `nasa-doc-${id}`,
        title: doc.title || 'NASA Historical Mission Report',
        category: 'nasa',
        description: doc.description || 'Declassified technical mission transcript, spacecraft schematic, or flight plan from NASA historical archives.',
        previewUrl: `https://archive.org/details/${id}`,
        thumbnailUrl: `https://archive.org/services/img/${id}`,
        downloadUrl: `https://archive.org/download/${id}/${id}.pdf`,
        providerId: 'archive_nasa_docs',
        providerName: 'NASA Historical Mission Archive (IA)',
        resourceUrl: `https://archive.org/details/${id}`,
        externalId: id,
        creatorName: doc.creator || 'National Aeronautics and Space Administration',
        creatorOrg: 'NASA',
        rawLicense: doc.licenseurl || 'Public Domain / NASA Historical',
        licenseUrl: 'https://archive.org/about/',
        providerDefaultLicense: {
          type: 'Public Domain / CC0',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          year: doc.year ? parseInt(doc.year, 10) : undefined,
          format: 'pdf',
          quality: 'Archival Document',
          tags: ['nasa-history', 'apollo', 'mercury', 'gemini', 'flight-manual', 'transcripts'],
          nasaSubCategory: 'papers'
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_nasa_docs', err.message);
    return [];
  }
}

// Unified Federated NASA Multi-Mission Dispatcher
export async function queryAllNasa(query: string, subCategory: NasaSubCategory = 'all'): Promise<ResourceItem[]> {
  const promises: Promise<ResourceItem[]>[] = [];

  switch (subCategory) {
    case 'images':
      promises.push(queryNASAImages(query), queryNasaApod(query));
      break;
    case 'mars':
      promises.push(queryMarsRovers(query));
      break;
    case 'epic':
      promises.push(queryNasaEpic(query));
      break;
    case 'videos':
      promises.push(queryNASAVideos(query));
      break;
    case 'audio':
      promises.push(queryNasaAudio(query));
      break;
    case 'asteroids':
      promises.push(queryNasaAsteroids(query));
      break;
    case 'exoplanets':
      promises.push(queryNASAExoplanets(query));
      break;
    case 'papers':
      promises.push(queryNasaNtrs(query), queryArchiveNasaDocs(query));
      break;
    case 'biology':
      promises.push(queryNasaOsdr(query));
      break;
    case 'spaceweather':
      promises.push(queryNasaSpaceWeather(query));
      break;
    case 'all':
    default:
      // Ingest across all NASA domains
      promises.push(
        queryNASAImages(query),
        queryNasaApod(query),
        queryMarsRovers(query),
        queryNasaEpic(query),
        queryNASAVideos(query),
        queryNasaAudio(query),
        queryNasaAsteroids(query),
        queryNASAExoplanets(query),
        queryNasaNtrs(query),
        queryNasaOsdr(query),
        queryNasaSpaceWeather(query),
        queryArchiveNasaDocs(query)
      );
      break;
  }

  const resultsNested = await Promise.allSettled(promises);
  const flattened: ResourceItem[] = [];

  for (const r of resultsNested) {
    if (r.status === 'fulfilled' && Array.isArray(r.value)) {
      flattened.push(...r.value);
    }
  }

  return flattened;
}
