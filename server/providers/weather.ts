import { ResourceItem } from '../../src/types/resource';
import { buildResourceItem } from '../normalizer';
import { registerTracker, recordProviderSuccess, recordProviderFailure } from '../telemetry';

const USER_AGENT = 'URMIL-Universal-Browser/1.0 (https://ai.studio; contact: team@urmil.org)';

registerTracker({
  id: 'open_meteo',
  name: 'Open-Meteo Weather API',
  category: 'Weather',
  rateLimit: '10,000 req/day (Free Open)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'open_meteo_air',
  name: 'Open-Meteo Air Quality & Atmospheric Index',
  category: 'Weather & Environment',
  rateLimit: '10,000 req/day (Free Open)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'open_meteo_marine',
  name: 'Open-Meteo Marine & Ocean Wave Model',
  category: 'Weather & Oceans',
  rateLimit: '10,000 req/day (Free Open)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'open_meteo_elevation',
  name: 'Open-Meteo Global Elevation & Terrain Topography',
  category: 'Weather & Geography',
  rateLimit: '10,000 req/day (Free Open Elevation API)',
  authRequired: false,
  authConfigured: true
});

// Geocode location then retrieve Open-Meteo weather
export async function queryOpenMeteo(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const searchCity = query.trim() || 'London';
  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchCity)}&count=5&language=en&format=json`;

  try {
    const geoRes = await fetch(geoUrl, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(5000) });
    if (!geoRes.ok) throw new Error(`Geocoding HTTP ${geoRes.status}`);
    const geoData = await geoRes.json();
    const locations = geoData.results || [];

    if (locations.length === 0) return [];

    const items: ResourceItem[] = [];

    for (const loc of locations.slice(0, 3)) {
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&hourly=temperature_2m&timezone=auto`;
      const wRes = await fetch(weatherUrl, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(5000) });
      if (!wRes.ok) continue;
      const wData = await wRes.json();
      const cur = wData.current || {};

      // Weather code mapping
      const code = cur.weather_code;
      let condition = 'Clear sky';
      if (code > 0 && code <= 3) condition = 'Partly cloudy';
      else if (code >= 45 && code <= 48) condition = 'Foggy';
      else if (code >= 51 && code <= 67) condition = 'Rain / Drizzle';
      else if (code >= 71 && code <= 77) condition = 'Snow fall';
      else if (code >= 80 && code <= 82) condition = 'Rain showers';
      else if (code >= 95) condition = 'Thunderstorm';

      items.push(
        buildResourceItem({
          id: `weather-${loc.id || Math.random().toString(36).substring(7)}`,
          title: `${loc.name}, ${loc.country || ''} Weather Report`,
          category: 'weather',
          description: `Current conditions in ${loc.name}: ${condition}. Temperature: ${cur.temperature_2m}°C, Humidity: ${cur.relative_humidity_2m}%, Wind Speed: ${cur.wind_speed_10m} km/h.`,
          previewUrl: `https://open-meteo.com/en/docs#latitude=${loc.latitude}&longitude=${loc.longitude}`,
          downloadUrl: weatherUrl,
          providerId: 'open_meteo',
          providerName: 'Open-Meteo Weather Service',
          resourceUrl: 'https://open-meteo.com/',
          externalId: String(loc.id),
          creatorName: 'Open-Meteo Atmospheric Models',
          rawLicense: 'Creative Commons Attribution 4.0 International (CC BY 4.0)',
          licenseUrl: 'https://open-meteo.com/en/license',
          providerDefaultLicense: {
            type: 'Creative Commons BY',
            commercialAllowed: true,
            attributionRequired: true
          },
          attributes: {
            format: 'json',
            temperature: cur.temperature_2m,
            weatherCondition: condition,
            coordinates: [loc.latitude, loc.longitude],
            region: `${loc.name}, ${loc.admin1 || ''} ${loc.country || ''}`,
            quality: 'Original',
            tags: [condition, `${cur.temperature_2m}°C`, 'Atmospheric Model']
          }
        })
      );
    }

    recordProviderSuccess('open_meteo', Date.now() - start);
    return items;
  } catch (err: any) {
    recordProviderFailure('open_meteo', err.message);
    return [];
  }
}

// 2. Open-Meteo Air Quality & Atmospheric Index
export async function queryOpenMeteoAirQuality(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const searchCity = query.trim() || 'London';
  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchCity)}&count=4&language=en&format=json`;

  try {
    const geoRes = await fetch(geoUrl, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(5000) });
    if (!geoRes.ok) throw new Error(`Geocoding HTTP ${geoRes.status}`);
    const geoData = await geoRes.json();
    let locations = geoData.results || [];

    if (locations.length === 0) {
      locations = [
        { id: 2643743, name: query || 'London', country: 'United Kingdom', latitude: 51.5085, longitude: -0.1257 }
      ];
    }

    const items: ResourceItem[] = [];

    for (const loc of locations.slice(0, 3)) {
      const airUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${loc.latitude}&longitude=${loc.longitude}&current=european_aqi,us_aqi,pm10,pm2_5,ozone,nitrogen_dioxide`;
      const aRes = await fetch(airUrl, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(5000) });
      if (!aRes.ok) continue;
      const aData = await aRes.json();
      const cur = aData.current || {};

      const aqi = cur.us_aqi ?? cur.european_aqi ?? 'N/A';
      let qualityCategory = 'Good';
      if (typeof aqi === 'number') {
        if (aqi > 150) qualityCategory = 'Unhealthy';
        else if (aqi > 100) qualityCategory = 'Unhealthy for Sensitive Groups';
        else if (aqi > 50) qualityCategory = 'Moderate';
      }

      items.push(
        buildResourceItem({
          id: `airquality-${loc.id || Math.random().toString(36).substring(7)}`,
          title: `${loc.name}, ${loc.country || ''} Air Quality Index (AQI ${aqi})`,
          category: 'weather',
          description: `Air quality in ${loc.name}: ${qualityCategory} (US AQI: ${cur.us_aqi ?? 'N/A'}, European AQI: ${cur.european_aqi ?? 'N/A'}). PM2.5: ${cur.pm2_5 ?? 'N/A'} μg/m³, PM10: ${cur.pm10 ?? 'N/A'} μg/m³, Ozone: ${cur.ozone ?? 'N/A'} μg/m³.`,
          previewUrl: `https://open-meteo.com/en/docs/air-quality-api#latitude=${loc.latitude}&longitude=${loc.longitude}`,
          downloadUrl: airUrl,
          providerId: 'open_meteo_air',
          providerName: 'Open-Meteo Air Quality Service',
          resourceUrl: 'https://open-meteo.com/en/docs/air-quality-api',
          externalId: String(loc.id),
          creatorName: 'Copernicus Atmosphere Monitoring Service & Open-Meteo',
          rawLicense: 'Creative Commons Attribution 4.0 International (CC BY 4.0)',
          licenseUrl: 'https://open-meteo.com/en/license',
          providerDefaultLicense: {
            type: 'Creative Commons BY',
            commercialAllowed: true,
            attributionRequired: true
          },
          attributes: {
            format: 'json/air-quality',
            coordinates: [loc.latitude, loc.longitude],
            region: `${loc.name}, ${loc.admin1 || ''} ${loc.country || ''}`,
            quality: 'Original Atmospheric Sensor Model',
            tags: [`AQI ${aqi}`, qualityCategory, 'PM2.5', 'Air Quality', loc.name]
          }
        })
      );
    }

    recordProviderSuccess('open_meteo_air', Date.now() - start);
    return items;
  } catch (err: any) {
    recordProviderFailure('open_meteo_air', err.message);
    return [];
  }
}

// 3. Open-Meteo Marine & Ocean Wave Forecasting Model
export async function queryOpenMeteoMarine(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const searchCity = query.trim() || 'Miami';
  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchCity)}&count=4&language=en&format=json`;

  try {
    const geoRes = await fetch(geoUrl, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(5000) });
    if (!geoRes.ok) throw new Error(`Geocoding HTTP ${geoRes.status}`);
    const geoData = await geoRes.json();
    const locations = geoData.results || [];

    if (locations.length === 0) return [];

    const items: ResourceItem[] = [];

    for (const loc of locations.slice(0, 3)) {
      const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${loc.latitude}&longitude=${loc.longitude}&current=wave_height,wave_direction,wave_period`;
      const mRes = await fetch(marineUrl, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(5000) });
      if (!mRes.ok) continue;
      const mData = await mRes.json();
      const cur = mData.current || {};

      const waveHeight = cur.wave_height != null ? `${cur.wave_height} m` : 'Calm / Nearshore';
      const wavePeriod = cur.wave_period != null ? `${cur.wave_period} s` : 'N/A';
      const waveDir = cur.wave_direction != null ? `${cur.wave_direction}°` : 'N/A';

      items.push(
        buildResourceItem({
          id: `marine-${loc.id || Math.random().toString(36).substring(7)}`,
          title: `${loc.name}, ${loc.country || ''} Ocean Waves (${waveHeight})`,
          category: 'weather',
          description: `Marine conditions for ${loc.name}: Significant Wave Height: ${waveHeight}. Wave Period: ${wavePeriod}. Swell Direction: ${waveDir}. High-resolution oceanographic model.`,
          previewUrl: `https://open-meteo.com/en/docs/marine-weather-api#latitude=${loc.latitude}&longitude=${loc.longitude}`,
          downloadUrl: marineUrl,
          providerId: 'open_meteo_marine',
          providerName: 'Open-Meteo Marine Forecast',
          resourceUrl: 'https://open-meteo.com/en/docs/marine-weather-api',
          externalId: String(loc.id),
          creatorName: 'European Centre for Medium-Range Weather Forecasts (ECMWF) & Open-Meteo',
          rawLicense: 'Creative Commons Attribution 4.0 International (CC BY 4.0)',
          licenseUrl: 'https://open-meteo.com/en/license',
          providerDefaultLicense: {
            type: 'Creative Commons BY',
            commercialAllowed: true,
            attributionRequired: true
          },
          attributes: {
            format: 'json/marine-ocean',
            coordinates: [loc.latitude, loc.longitude],
            region: `${loc.name}, ${loc.admin1 || ''} ${loc.country || ''}`,
            quality: 'ECMWF Wave Model Simulation',
            tags: ['Ocean Waves', waveHeight, 'Marine Forecast', loc.name]
          }
        })
      );
    }

    recordProviderSuccess('open_meteo_marine', Date.now() - start);
    return items;
  } catch (err: any) {
    recordProviderFailure('open_meteo_marine', err.message);
    return [];
  }
}

/**
 * Open-Meteo Global Terrestrial Elevation & Topographical Benchmark Engine
 * Uses 90m SRTM and ArcticDEM high-resolution digital elevation models.
 */
export async function queryOpenMeteoElevation(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const searchCity = query.trim() || 'Tokyo';
  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchCity)}&count=5&language=en&format=json`;

  try {
    const geoRes = await fetch(geoUrl, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(5000)
    });

    if (!geoRes.ok) throw new Error(`Geocoding HTTP ${geoRes.status}`);
    const geoData = await geoRes.json();
    let locations = geoData.results || [];

    if (locations.length === 0) {
      locations = [
        { id: 1850147, name: query || 'Tokyo', country: 'Japan', latitude: 35.6895, longitude: 139.6917, elevation: 40 }
      ];
    }

    const lats = locations.slice(0, 4).map((l: any) => l.latitude).join(',');
    const lons = locations.slice(0, 4).map((l: any) => l.longitude).join(',');
    const elevUrl = `https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lons}`;

    const elevRes = await fetch(elevUrl, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(5000)
    });

    if (!elevRes.ok) throw new Error(`Elevation HTTP ${elevRes.status}`);
    const elevData = await elevRes.json();
    const elevations: number[] = Array.isArray(elevData.elevation) ? elevData.elevation : [];

    const items: ResourceItem[] = [];
    locations.slice(0, 4).forEach((loc: any, idx: number) => {
      const elevation = elevations[idx] != null ? elevations[idx] : loc.elevation;
      const elevMeters = elevation != null ? `${Math.round(elevation)} m (${Math.round(elevation * 3.28084)} ft)` : 'Sea Level';

      items.push(
        buildResourceItem({
          id: `elevation-${loc.id || idx}-${Date.now()}`,
          title: `${loc.name}, ${loc.country || ''} - Elevation: ${elevMeters}`,
          category: 'weather',
          description: `Topographical altitude benchmark for ${loc.name} (${loc.admin1 || ''}, ${loc.country || ''}): ${elevMeters} above sea level. Coordinates: ${loc.latitude.toFixed(4)}°N, ${loc.longitude.toFixed(4)}°E. Derived from Copernicus & SRTM satellite digital elevation models.`,
          previewUrl: `https://open-meteo.com/en/docs/elevation-api#latitude=${loc.latitude}&longitude=${loc.longitude}`,
          downloadUrl: elevUrl,
          providerId: 'open_meteo_elevation',
          providerName: 'Open-Meteo Global Elevation API',
          resourceUrl: 'https://open-meteo.com/en/docs/elevation-api',
          externalId: String(loc.id || idx),
          creatorName: 'Copernicus DEM & Open-Meteo',
          rawLicense: 'Creative Commons Attribution 4.0 International (CC BY 4.0)',
          licenseUrl: 'https://open-meteo.com/en/license',
          providerDefaultLicense: {
            type: 'Creative Commons BY',
            commercialAllowed: true,
            attributionRequired: true
          },
          attributes: {
            format: 'application/json',
            coordinates: [loc.latitude, loc.longitude],
            region: `${loc.name}, ${loc.country || ''}`,
            quality: 'High-Resolution 90m DEM',
            tags: ['Elevation', 'Topography', elevMeters, 'Altitude', loc.name, 'Geodesy']
          }
        })
      );
    });

    recordProviderSuccess('open_meteo_elevation', Date.now() - start);
    return items;
  } catch (err: any) {
    recordProviderFailure('open_meteo_elevation', err.message);
    return [];
  }
}



