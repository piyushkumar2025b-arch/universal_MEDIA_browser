import { ResourceItem } from '../../src/types/resource';
import { buildResourceItem } from '../normalizer';
import { registerTracker, recordProviderSuccess, recordProviderFailure } from '../telemetry';

const USER_AGENT = 'URMIL-Universal-Browser/1.0 (https://ai.studio; contact: team@urmil.org)';

registerTracker({
  id: 'nominatim',
  name: 'OpenStreetMap Nominatim',
  category: 'Maps',
  rateLimit: '1 req/sec (Polite OSM Policy)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'usgs',
  name: 'USGS Earthquake Hazards API',
  category: 'Earth Science & Maps',
  rateLimit: 'Unlimited / Open',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'photon_maps',
  name: 'Photon OpenStreetMap Geographic Engine',
  category: 'Maps & Geography',
  rateLimit: 'Open Public API (Komoot / OSM)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'open_meteo_geocoding',
  name: 'Open-Meteo Global Geocoding & Cities Catalog',
  category: 'Maps & Geodesy',
  rateLimit: 'Unlimited Open Public Geocoding API',
  authRequired: false,
  authConfigured: true
});

// 1. OpenStreetMap Nominatim
export async function queryNominatim(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&polygon_geojson=1&limit=10`;

  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('nominatim', Date.now() - start);

    return (data || []).map((place: any) => {
      const lat = parseFloat(place.lat);
      const lon = parseFloat(place.lon);
      const mapPreview = `https://static-maps.yandex.ru/1.x/?ll=${lon},${lat}&z=12&l=map&size=600,400`;

      return buildResourceItem({
        id: `osm-${place.osm_type}-${place.osm_id}`,
        title: place.name || place.display_name.split(',')[0],
        category: 'maps',
        description: place.display_name,
        previewUrl: `https://www.openstreetmap.org/${place.osm_type}/${place.osm_id}`,
        thumbnailUrl: mapPreview,
        downloadUrl: `https://nominatim.openstreetmap.org/details.php?osmtype=${place.osm_type.charAt(0).toUpperCase()}&osmid=${place.osm_id}&format=json`,
        providerId: 'nominatim',
        providerName: 'OpenStreetMap',
        resourceUrl: `https://www.openstreetmap.org/${place.osm_type}/${place.osm_id}`,
        externalId: String(place.osm_id),
        creatorName: 'OpenStreetMap Contributors',
        rawLicense: 'Open Database License (ODbL)',
        licenseUrl: 'https://www.openstreetmap.org/copyright',
        providerDefaultLicense: {
          type: 'Open Database License (ODbL)',
          commercialAllowed: true,
          attributionRequired: true
        },
        attributes: {
          format: 'geojson',
          coordinates: [lat, lon],
          region: place.address?.country || place.address?.state,
          mapType: place.type,
          quality: 'Original',
          tags: [place.class, place.type].filter(Boolean)
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('nominatim', err.message);
    return [];
  }
}

// 2. USGS Earth Science & Seismic Data
export async function queryUSGS(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  // Query significant earthquakes or all quakes from the last 30 days
  const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&limit=12&minmagnitude=3.0`;

  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('usgs', Date.now() - start);

    let features = (data.features || []).filter((f: any) => {
      if (!query || query.toLowerCase() === 'earthquake' || query.toLowerCase() === 'seismic' || query.toLowerCase() === 'maps') return true;
      const place = (f.properties?.place || '').toLowerCase();
      return place.includes(query.toLowerCase());
    });

    if (features.length === 0 && data.features && data.features.length > 0) {
      features = data.features.slice(0, 6);
    }

    return features.slice(0, 10).map((f: any) => {
      const p = f.properties || {};
      const geom = f.geometry || {};
      const coords = geom.coordinates || [];
      const mag = p.mag;

      return buildResourceItem({
        id: `usgs-${f.id}`,
        title: `M ${mag} Seismic Event - ${p.place || 'Unknown Location'}`,
        category: 'maps',
        description: `Magnitude ${mag} earthquake recorded at depth ${coords[2] || 0} km. Reported by USGS National Earthquake Information Center.`,
        previewUrl: p.url,
        downloadUrl: `https://earthquake.usgs.gov/fdsnws/event/1/query?eventid=${f.id}&format=geojson`,
        providerId: 'usgs',
        providerName: 'USGS Earth Resources Observation and Science',
        resourceUrl: p.url,
        externalId: f.id,
        creatorName: 'United States Geological Survey',
        rawLicense: 'Public Domain / US Government Open Data',
        licenseUrl: 'https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits',
        providerDefaultLicense: {
          type: 'Public Domain / CC0',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'geojson',
          coordinates: coords.length >= 2 ? [coords[1], coords[0]] : undefined,
          region: p.place,
          mapType: 'seismic_sensor',
          year: p.time ? new Date(p.time).getFullYear() : undefined,
          quality: 'Original',
          tags: ['USGS', 'Seismic', `Mag ${mag}`]
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('usgs', err.message);
    return [];
  }
}

// 3. Photon Komoot / OpenStreetMap Global Geographic Engine
export async function queryPhotonMaps(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=10`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('photon_maps', Date.now() - start);

    const features = data.features || [];
    return features.map((f: any) => {
      const p = f.properties || {};
      const coords = f.geometry?.coordinates || [];
      const lon = coords[0];
      const lat = coords[1];
      const title = p.name || `${p.city || p.country || 'Geographic Location'}`;
      const subtitle = [p.street, p.city, p.state, p.country].filter(Boolean).join(', ');
      const osmId = p.osm_id || Math.random().toString(36).substring(7);
      const osmType = p.osm_type === 'N' ? 'node' : (p.osm_type === 'W' ? 'way' : 'relation');
      const resourceUrl = `https://www.openstreetmap.org/${osmType}/${p.osm_id}`;
      const mapPreview = typeof lat === 'number' && typeof lon === 'number'
        ? `https://static-maps.yandex.ru/1.x/?ll=${lon},${lat}&z=13&l=map&size=600,400`
        : undefined;

      return buildResourceItem({
        id: `photon-${osmId}`,
        title,
        category: 'maps',
        description: `${subtitle} • OSM type: ${p.type || 'geographic place'} • Postcode: ${p.postcode || 'N/A'}.`,
        previewUrl: resourceUrl,
        thumbnailUrl: mapPreview,
        downloadUrl: `https://photon.komoot.io/api/?q=${encodeURIComponent(title)}&limit=1`,
        providerId: 'photon_maps',
        providerName: 'Photon OpenStreetMap',
        resourceUrl,
        externalId: String(osmId),
        creatorName: 'OpenStreetMap & Komoot Contributors',
        rawLicense: 'Open Database License (ODbL)',
        licenseUrl: 'https://www.openstreetmap.org/copyright',
        attributes: {
          format: 'geojson',
          coordinates: typeof lat === 'number' && typeof lon === 'number' ? [lat, lon] : undefined,
          region: p.country,
          mapType: p.type || 'city',
          quality: 'Original',
          tags: ['OpenStreetMap', 'Photon', p.type, p.country].filter(Boolean)
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('photon_maps', err.message);
    return [];
  }
}

// 4. Open-Meteo Global Geocoding & Cities Catalog
export async function queryOpenMeteoGeocoding(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const clean = encodeURIComponent(query.trim() || 'tokyo');
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${clean}&count=12&language=en&format=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('open_meteo_geocoding', Date.now() - start);

    const results = data.results || [];
    if (results.length === 0) {
      return await queryPhotonMaps(query);
    }
    return results.map((place: any) => {
      const id = place.id;
      const name = place.name;
      const country = place.country || '';
      const admin1 = place.admin1 || '';
      const lat = place.latitude;
      const lon = place.longitude;
      const elevation = place.elevation;
      const population = place.population;
      const timezone = place.timezone || 'UTC';
      const mapPreview = `https://static-maps.yandex.ru/1.x/?ll=${lon},${lat}&z=11&l=map&size=600,400`;
      const resourceUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=12/${lat}/${lon}`;

      return buildResourceItem({
        id: `openmeteo-geo-${id}`,
        title: `${name}, ${country}`,
        category: 'maps',
        description: `Coordinates: ${lat.toFixed(4)}°, ${lon.toFixed(4)}° • Region: ${admin1 || country} • Elevation: ${elevation ?? '-'}m • Population: ${population ? population.toLocaleString() : 'N/A'} • Timezone: ${timezone}.`,
        previewUrl: resourceUrl,
        thumbnailUrl: mapPreview,
        downloadUrl: `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&format=json`,
        providerId: 'open_meteo_geocoding',
        providerName: 'Open-Meteo Geocoding',
        resourceUrl,
        externalId: String(id),
        creatorName: 'Open-Meteo & OpenStreetMap Contributors',
        creatorOrg: 'Open-Meteo Open Source Weather API',
        rawLicense: 'Open Database License (ODbL) / CC-BY 4.0',
        licenseUrl: 'https://open-meteo.com/en/docs/geocoding-api',
        providerDefaultLicense: {
          type: 'Open Access / CC BY',
          commercialAllowed: true,
          attributionRequired: true
        },
        attributes: {
          format: 'geocoding/json',
          coordinates: [lat, lon],
          region: country,
          mapType: 'city/administrative',
          quality: 'Official Precision Geospatial Coordinates',
          tags: ['Geocoding', 'Coordinates', country, admin1, timezone].filter(Boolean)
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('open_meteo_geocoding', err.message);
    return await queryPhotonMaps(query);
  }
}


