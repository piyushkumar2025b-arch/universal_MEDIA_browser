import { ResourceItem } from '../../src/types/resource';
import { buildResourceItem } from '../normalizer';
import { registerTracker, recordProviderSuccess, recordProviderFailure } from '../telemetry';

const USER_AGENT = 'URMIL-Universal-Browser/1.0 (https://ai.studio; contact: team@urmil.org)';

// ============================================================================
// Telemetry Registrations for 20 New Tera-Expansion Providers
// ============================================================================

registerTracker({
  id: 'openfda_drugs',
  name: 'openFDA Pharmaceutical Drug Labels & Clinical Indications',
  category: 'Knowledge & Health',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'openfda_devices',
  name: 'openFDA 510(k) Medical Devices & Clearances',
  category: 'Datasets & Health',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'openfda_recalls',
  name: 'openFDA Food & Consumer Safety Enforcement Recalls',
  category: 'Live News & Safety',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'noaa_weather_alerts',
  name: 'NOAA National Weather Service Active Severe Weather Hazards',
  category: 'Weather & Hazards',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'somafm_radio',
  name: 'SomaFM Commercial-Free Ambient & Indie Channels',
  category: 'Audio & Music',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'dw_news',
  name: 'Deutsche Welle (DW News) World Service',
  category: 'Live News',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'france24_news',
  name: 'France 24 International Live Wire',
  category: 'Live News',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'ars_technica_news',
  name: 'Ars Technica Science, Tech & Policy Wire',
  category: 'Live News',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'the_register_news',
  name: 'The Register Enterprise Systems & Cybersecurity Wire',
  category: 'Live News',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'nasa_breaking_news',
  name: 'NASA Official Breaking Missions & Space Discoveries',
  category: 'Live News',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_grateful_dead',
  name: 'Internet Archive Grateful Dead Live Concert Soundboard Vault',
  category: 'Audio & Music',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_wax_cylinders',
  name: 'UCSB & Edison Early Acoustic Wax Cylinders (1890-1925)',
  category: 'Audio',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_vintage_computer_magazines',
  name: 'Vintage Computer Magazines Archive (Byte, Compute!, Amiga)',
  category: 'Books & Computing',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_video_game_design',
  name: 'Video Game Concept Art & Historical Design Documents',
  category: 'Games & Art',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_aviation_history',
  name: 'Aeronautics History & Historic Flight Test Manuals',
  category: 'Knowledge & Aerospace',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_historic_atlases',
  name: 'Antique Cartography, Rare Portolan Charts & World Atlases',
  category: 'Maps & History',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_pre_code_cinema',
  name: 'Pre-Code Hollywood & Silent Era Motion Picture Epics',
  category: 'Videos & Cinema',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_pulp_sci_fi',
  name: 'Golden Age Science Fiction Pulp Magazines (Astounding, Galaxy)',
  category: 'Books & Sci-Fi',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_usda_pomology',
  name: 'USDA Pomological Watercolors & Botanical Heritage Art',
  category: 'Art & Biodiversity',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_modular_synthesizers',
  name: 'Modular Synthesizers & Electronic Music Experimentation',
  category: 'Audio & Music',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

// Helper for cleaning text from XML feeds
function cleanText(raw?: string): string {
  if (!raw) return '';
  return raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractThumbnail(block: string): string | undefined {
  const mediaContent = block.match(/<media:content[^>]+url=["']([^"']+)["']/i);
  if (mediaContent?.[1]) return mediaContent[1];
  const mediaThumb = block.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i);
  if (mediaThumb?.[1]) return mediaThumb[1];
  const enclosure = block.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]+type=["']image\/[^"']+["']/i);
  if (enclosure?.[1]) return enclosure[1];
  const imgTag = block.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgTag?.[1]) return imgTag[1];
  return undefined;
}

// ============================================================================
// 1. openFDA Pharmaceutical Drug Labels & Clinical Guidance
// ============================================================================
export async function queryOpenFdaDrugs(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = query.trim() || 'aspirin';
  const url = `https://api.fda.gov/drug/label.json?search=${encodeURIComponent(rawQ)}&limit=12`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(5000)
    });

    if (!res.ok) throw new Error(`openFDA returned ${res.status}`);
    const data = await res.json();
    const results = data?.results || [];
    recordProviderSuccess('openfda_drugs', Date.now() - start);

    const items: ResourceItem[] = [];
    for (const item of results) {
      const brand = item.openfda?.brand_name?.[0] || item.openfda?.generic_name?.[0] || item.id;
      const generic = item.openfda?.generic_name?.[0] || '';
      const substance = item.openfda?.substance_name?.[0] || '';
      const purpose = item.purpose?.[0] || item.indications_and_usage?.[0] || 'FDA Registered Pharmaceutical Monograph';
      const cleanPurpose = cleanText(purpose).slice(0, 240);
      const active = cleanText(item.active_ingredient?.[0] || substance || '').slice(0, 160);
      const id = item.set_id || item.id || `fda-${Math.random().toString(36).slice(2, 8)}`;
      const infoUrl = `https://dailymed.nlm.nih.gov/dailymed/search.cfm?labeltype=all&query=${encodeURIComponent(brand || rawQ)}`;
      const pillImage = 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&auto=format&fit=crop&q=80';

      items.push(
        buildResourceItem({
          id: `fda-drug-${id.slice(0, 20)}`,
          title: `${brand}${generic && generic !== brand ? ` (${generic})` : ''} - FDA Monograph`,
          category: 'knowledge',
          description: `${cleanPurpose}${active ? ` Active Ingredient: ${active}` : ''}`,
          thumbnailUrl: pillImage,
          previewUrl: infoUrl,
          downloadUrl: infoUrl,
          providerId: 'openfda_drugs',
          providerName: 'openFDA Drug Information',
          resourceUrl: infoUrl,
          rawLicense: 'US Government Work / Public Domain',
          licenseUrl: 'https://open.fda.gov/apis/open-government-data/',
          providerDefaultLicense: {
            type: 'Public Domain',
            commercialAllowed: true,
            attributionRequired: false
          },
          attributes: {
            brandName: brand,
            genericName: generic,
            substanceName: substance,
            manufacturer: item.openfda?.manufacturer_name?.[0],
            route: item.openfda?.route?.[0],
            tags: ['fda', 'pharmacology', 'medicine', 'prescription', 'healthcare']
          }
        })
      );
    }
    return items;
  } catch (err: any) {
    recordProviderFailure('openfda_drugs', err.message);
    return [];
  }
}

// ============================================================================
// 2. openFDA 510(k) Medical Devices & Approvals
// ============================================================================
export async function queryOpenFdaDevices(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = query.trim() || 'catheter';
  const url = `https://api.fda.gov/device/510k.json?search=${encodeURIComponent(rawQ)}&limit=12`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(5000)
    });

    if (!res.ok) throw new Error(`openFDA devices returned ${res.status}`);
    const data = await res.json();
    const results = data?.results || [];
    recordProviderSuccess('openfda_devices', Date.now() - start);

    const items: ResourceItem[] = [];
    for (const item of results) {
      const deviceName = item.device_name || item.openfda?.device_name || 'Medical Device';
      const applicant = item.applicant || 'Medical Manufacturer';
      const kNumber = item.k_number || 'FDA 510(k)';
      const decisionDate = item.decision_date || '';
      const specialty = item.advisory_committee_description || item.openfda?.medical_specialty_description || 'General Medical';
      const infoUrl = `https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/pmn.cfm?ID=${kNumber}`;
      const deviceImg = 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800&auto=format&fit=crop&q=80';

      items.push(
        buildResourceItem({
          id: `fda-dev-${kNumber}`,
          title: `${deviceName} [${kNumber}]`,
          category: 'datasets',
          description: `FDA 510(k) Cleared Medical Device by ${applicant}. Medical Specialty: ${specialty}. Decision: ${item.decision_description || 'Cleared'} (${decisionDate}).`,
          thumbnailUrl: deviceImg,
          previewUrl: infoUrl,
          downloadUrl: infoUrl,
          providerId: 'openfda_devices',
          providerName: 'openFDA 510(k) Medical Devices',
          resourceUrl: infoUrl,
          rawLicense: 'US Government Work / Public Domain',
          licenseUrl: 'https://open.fda.gov/apis/open-government-data/',
          providerDefaultLicense: {
            type: 'Public Domain',
            commercialAllowed: true,
            attributionRequired: false
          },
          attributes: {
            kNumber,
            applicant,
            medicalSpecialty: specialty,
            decisionDate,
            tags: ['fda', 'medical-device', 'biomedical', 'clinical', '510k']
          }
        })
      );
    }
    return items;
  } catch (err: any) {
    recordProviderFailure('openfda_devices', err.message);
    return [];
  }
}

// ============================================================================
// 3. openFDA Food & Consumer Safety Enforcement Recalls
// ============================================================================
export async function queryOpenFdaRecalls(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = query.trim() || 'salmonella';
  const url = `https://api.fda.gov/food/enforcement.json?search=${encodeURIComponent(rawQ)}&limit=12`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(5000)
    });

    if (!res.ok) throw new Error(`openFDA recalls returned ${res.status}`);
    const data = await res.json();
    const results = data?.results || [];
    recordProviderSuccess('openfda_recalls', Date.now() - start);

    const items: ResourceItem[] = [];
    for (const item of results) {
      const product = cleanText(item.product_description || 'Food Recall Item').slice(0, 140);
      const reason = cleanText(item.reason_for_recall || 'Safety Hazard').slice(0, 200);
      const firm = item.recalling_firm || 'FDA Regulated Firm';
      const status = item.status || 'Active';
      const recallNum = item.recall_number || `recall-${Math.random().toString(36).slice(2, 8)}`;
      const infoUrl = `https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts`;
      const foodSafetyImg = 'https://images.unsplash.com/photo-1584483766114-2cea6facdf57?w=800&auto=format&fit=crop&q=80';

      items.push(
        buildResourceItem({
          id: `fda-recall-${recallNum}`,
          title: `Recall Alert: ${product}`,
          category: 'news',
          description: `Reason: ${reason}. Recalling Firm: ${firm}. Classification: ${item.classification || 'Class II'} (Status: ${status}).`,
          thumbnailUrl: foodSafetyImg,
          previewUrl: infoUrl,
          downloadUrl: infoUrl,
          providerId: 'openfda_recalls',
          providerName: 'openFDA Safety Recalls',
          resourceUrl: infoUrl,
          rawLicense: 'US Government Work / Public Domain',
          licenseUrl: 'https://open.fda.gov/apis/open-government-data/',
          providerDefaultLicense: {
            type: 'Public Domain',
            commercialAllowed: true,
            attributionRequired: false
          },
          attributes: {
            isLiveNews: true,
            recallNumber: recallNum,
            recallingFirm: firm,
            classification: item.classification,
            reportDate: item.recall_initiation_date,
            tags: ['food-safety', 'recall', 'fda', 'public-health', 'alert']
          }
        })
      );
    }
    return items;
  } catch (err: any) {
    recordProviderFailure('openfda_recalls', err.message);
    return [];
  }
}

// ============================================================================
// 4. NOAA National Weather Service Active Severe Weather Hazards
// ============================================================================
export async function queryNoaaWeatherAlerts(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = 'https://api.weather.gov/alerts/active';

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'URMIL-Browser (contact@urmil.org)',
        'Accept': 'application/geo+json'
      },
      signal: AbortSignal.timeout(5000)
    });

    if (!res.ok) throw new Error(`NOAA returned ${res.status}`);
    const data = await res.json();
    const features = data?.features || [];
    recordProviderSuccess('noaa_weather_alerts', Date.now() - start);

    const filterQ = query.trim().toLowerCase();
    const items: ResourceItem[] = [];

    for (const f of features) {
      if (items.length >= 12) break;
      const props = f.properties || {};
      const event = props.event || 'Weather Advisory';
      const headline = props.headline || event;
      const area = props.areaDesc || 'United States';
      const severity = props.severity || 'Moderate';
      const urgency = props.urgency || 'Expected';
      const desc = cleanText(props.description || headline).slice(0, 260);
      const link = props['@id'] || 'https://www.weather.gov';

      if (filterQ && filterQ !== 'weather' && filterQ !== 'alerts') {
        const fullTxt = `${event} ${headline} ${area} ${desc}`.toLowerCase();
        if (!fullTxt.includes(filterQ)) continue;
      }

      const stormImg = 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=800&auto=format&fit=crop&q=80';

      items.push(
        buildResourceItem({
          id: `noaa-${props.id || Math.random().toString(36).slice(2, 10)}`,
          title: `NWS Alert: ${event} - ${area.split(';')[0]}`,
          category: 'weather',
          description: `${headline}. Severity: ${severity} | Urgency: ${urgency}. ${desc}`,
          thumbnailUrl: stormImg,
          previewUrl: link,
          downloadUrl: link,
          providerId: 'noaa_weather_alerts',
          providerName: 'NOAA National Weather Service',
          resourceUrl: link,
          rawLicense: 'NOAA Public Domain Weather Data',
          licenseUrl: 'https://www.weather.gov/disclaimer',
          providerDefaultLicense: {
            type: 'Public Domain',
            commercialAllowed: true,
            attributionRequired: false
          },
          attributes: {
            event,
            severity,
            urgency,
            affectedArea: area,
            effectiveDate: props.effective,
            expiresDate: props.expires,
            tags: ['noaa', 'nws', 'weather-alert', 'radar', 'severe-weather']
          }
        })
      );
    }
    return items;
  } catch (err: any) {
    recordProviderFailure('noaa_weather_alerts', err.message);
    return [];
  }
}

// ============================================================================
// 5. SomaFM Commercial-Free Ambient & Indie Channels
// ============================================================================
export async function querySomaFmRadio(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = 'https://api.somafm.com/channels.json';

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(5000)
    });

    if (!res.ok) throw new Error(`SomaFM returned ${res.status}`);
    const data = await res.json();
    const channels = data?.channels || [];
    recordProviderSuccess('somafm_radio', Date.now() - start);

    const filterQ = query.trim().toLowerCase();
    const items: ResourceItem[] = [];

    for (const ch of channels) {
      if (items.length >= 12) break;
      const title = ch.title || ch.id;
      const desc = ch.description || 'Independent commercial-free broadcasting.';
      const genre = ch.genre || 'electronic';
      const dj = ch.dj || 'Curated Stream';
      const lastPlaying = ch.lastPlaying || '';

      if (filterQ && filterQ !== 'radio' && filterQ !== 'audio' && filterQ !== 'music') {
        const fullTxt = `${title} ${desc} ${genre} ${dj}`.toLowerCase();
        if (!fullTxt.includes(filterQ)) continue;
      }

      const streamUrl = `https://ice1.somafm.com/${ch.id}-128-mp3`;
      const webUrl = `https://somafm.com/${ch.id}/`;
      const img = ch.largeimage || ch.image || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80';

      items.push(
        buildResourceItem({
          id: `somafm-${ch.id}`,
          title: `SomaFM: ${title} (${genre.toUpperCase()})`,
          category: 'audio',
          description: `${desc} Currently airing: ${lastPlaying || 'Live Curated Music'}. Curated by ${dj}.`,
          thumbnailUrl: img,
          previewUrl: webUrl,
          downloadUrl: streamUrl,
          providerId: 'somafm_radio',
          providerName: 'SomaFM Independent Radio',
          resourceUrl: webUrl,
          rawLicense: 'Listener-Supported Commercial-Free Broadcast',
          licenseUrl: 'https://somafm.com/support/',
          providerDefaultLicense: {
            type: 'Public Stream',
            commercialAllowed: false,
            attributionRequired: true
          },
          attributes: {
            format: 'mp3',
            isStreamable: true,
            genre,
            listeners: ch.listeners,
            dj,
            tags: ['somafm', 'radio', 'ambient', 'chillout', 'live-stream', genre]
          }
        })
      );
    }
    return items;
  } catch (err: any) {
    recordProviderFailure('somafm_radio', err.message);
    return [];
  }
}

// ============================================================================
// 6. Deutsche Welle (DW News) World Service
// ============================================================================
export async function queryDwNews(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = 'https://rss.dw.com/rdf/rss-en-all';

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(5000)
    });

    if (!res.ok) throw new Error(`DW returned ${res.status}`);
    const xml = await res.text();
    const itemMatches = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
    recordProviderSuccess('dw_news', Date.now() - start);

    const items: ResourceItem[] = [];
    const lowerQ = query.trim().toLowerCase();

    for (const block of itemMatches) {
      if (items.length >= 10) break;
      const rawTitle = block.match(/<title>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/title>/i);
      const rawLink = block.match(/<link>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/link>/i);
      const rawDate = block.match(/<dc:date>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/dc:date>/i);
      const rawDesc = block.match(/<description>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/description>/i);

      const title = cleanText(rawTitle?.[1] || rawTitle?.[2] || '');
      const link = (rawLink?.[1] || rawLink?.[2] || '').trim();
      const desc = cleanText(rawDesc?.[1] || rawDesc?.[2] || '');
      const pubDate = (rawDate?.[1] || rawDate?.[2] || '').trim();

      if (!title || !link) continue;
      if (lowerQ && !title.toLowerCase().includes(lowerQ) && !desc.toLowerCase().includes(lowerQ) && lowerQ !== 'news') {
        continue;
      }

      const thumb = extractThumbnail(block) || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&auto=format&fit=crop&q=80';

      items.push(
        buildResourceItem({
          id: `dw-${Buffer.from(link).toString('base64').slice(0, 16)}`,
          title,
          description: desc || 'Deutsche Welle Germany & European global world news broadcasting.',
          resourceUrl: link,
          downloadUrl: link,
          previewUrl: thumb,
          thumbnailUrl: thumb,
          category: 'news',
          providerId: 'dw_news',
          providerName: 'Deutsche Welle (DW News)',
          rawLicense: 'DW Public Editorial News',
          licenseUrl: link,
          providerDefaultLicense: {
            type: 'Editorial News Access',
            commercialAllowed: false,
            attributionRequired: true
          },
          attributes: {
            publisher: 'Deutsche Welle World Service',
            publishedAt: pubDate || new Date().toISOString(),
            isLiveNews: true,
            tags: ['dw', 'international-news', 'europe', 'world-events']
          }
        })
      );
    }
    return items;
  } catch (err: any) {
    recordProviderFailure('dw_news', err.message);
    return [];
  }
}

// ============================================================================
// 7. France 24 International Live Wire
// ============================================================================
export async function queryFrance24News(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = 'https://www.france24.com/en/rss';

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(5000)
    });

    if (!res.ok) throw new Error(`France 24 returned ${res.status}`);
    const xml = await res.text();
    const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
    recordProviderSuccess('france24_news', Date.now() - start);

    const items: ResourceItem[] = [];
    const lowerQ = query.trim().toLowerCase();

    for (const block of itemMatches) {
      if (items.length >= 10) break;
      const rawTitle = block.match(/<title>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/title>/i);
      const rawLink = block.match(/<link>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/link>/i);
      const rawDate = block.match(/<pubDate>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/pubDate>/i);
      const rawDesc = block.match(/<description>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/description>/i);

      const title = cleanText(rawTitle?.[1] || rawTitle?.[2] || '');
      const link = (rawLink?.[1] || rawLink?.[2] || '').trim();
      const desc = cleanText(rawDesc?.[1] || rawDesc?.[2] || '');
      const pubDate = (rawDate?.[1] || rawDate?.[2] || '').trim();

      if (!title || !link) continue;
      if (lowerQ && !title.toLowerCase().includes(lowerQ) && !desc.toLowerCase().includes(lowerQ) && lowerQ !== 'news') {
        continue;
      }

      const thumb = extractThumbnail(block) || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&auto=format&fit=crop&q=80';

      items.push(
        buildResourceItem({
          id: `f24-${Buffer.from(link).toString('base64').slice(0, 16)}`,
          title,
          description: desc || 'France 24 international 24/7 global news network and analysis.',
          resourceUrl: link,
          downloadUrl: link,
          previewUrl: thumb,
          thumbnailUrl: thumb,
          category: 'news',
          providerId: 'france24_news',
          providerName: 'France 24 Live International',
          rawLicense: 'France 24 Editorial News',
          licenseUrl: link,
          providerDefaultLicense: {
            type: 'Editorial News Access',
            commercialAllowed: false,
            attributionRequired: true
          },
          attributes: {
            publisher: 'France Médias Monde',
            publishedAt: pubDate || new Date().toISOString(),
            isLiveNews: true,
            tags: ['france24', 'global-news', 'diplomacy', 'world-wire']
          }
        })
      );
    }
    return items;
  } catch (err: any) {
    recordProviderFailure('france24_news', err.message);
    return [];
  }
}

// ============================================================================
// 8. Ars Technica Science, Tech & Policy Wire
// ============================================================================
export async function queryArsTechnicaNews(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = 'https://feeds.arstechnica.com/arstechnica/index';

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(5000)
    });

    if (!res.ok) throw new Error(`Ars Technica returned ${res.status}`);
    const xml = await res.text();
    const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
    recordProviderSuccess('ars_technica_news', Date.now() - start);

    const items: ResourceItem[] = [];
    const lowerQ = query.trim().toLowerCase();
    const isGeneral = !lowerQ || ['news', 'latest', 'breaking', 'technology', 'tech', 'science', 'update', 'world', 'all'].includes(lowerQ);

    for (const block of itemMatches) {
      if (items.length >= 10) break;
      const rawTitle = block.match(/<title>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/title>/i);
      const rawLink = block.match(/<link>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/link>/i);
      const rawDate = block.match(/<pubDate>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/pubDate>/i);
      const rawDesc = block.match(/<description>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/description>/i);
      const rawCreator = block.match(/<dc:creator>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/dc:creator>/i);

      const title = cleanText(rawTitle?.[1] || rawTitle?.[2] || '');
      const link = (rawLink?.[1] || rawLink?.[2] || '').trim();
      const desc = cleanText(rawDesc?.[1] || rawDesc?.[2] || '');
      const pubDate = (rawDate?.[1] || rawDate?.[2] || '').trim();
      const author = cleanText(rawCreator?.[1] || rawCreator?.[2] || 'Ars Technica');

      if (!title || !link) continue;
      if (!isGeneral && !title.toLowerCase().includes(lowerQ) && !desc.toLowerCase().includes(lowerQ)) {
        continue;
      }

      const thumb = extractThumbnail(block) || 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80';

      items.push(
        buildResourceItem({
          id: `ars-${Buffer.from(link).toString('base64').slice(0, 16)}`,
          title,
          description: desc || `Technology, science, policy, and cybersecurity investigative journalism by ${author}.`,
          resourceUrl: link,
          downloadUrl: link,
          previewUrl: thumb,
          thumbnailUrl: thumb,
          category: 'news',
          providerId: 'ars_technica_news',
          providerName: 'Ars Technica Tech & Science Wire',
          rawLicense: 'Ars Technica Editorial',
          licenseUrl: link,
          providerDefaultLicense: {
            type: 'Editorial News Access',
            commercialAllowed: false,
            attributionRequired: true
          },
          attributes: {
            publisher: 'Condé Nast / Ars Technica',
            author,
            publishedAt: pubDate || new Date().toISOString(),
            isLiveNews: true,
            tags: ['ars-technica', 'cybersecurity', 'tech', 'science', 'computing']
          }
        })
      );
    }
    return items;
  } catch (err: any) {
    recordProviderFailure('ars_technica_news', err.message);
    return [];
  }
}

// ============================================================================
// 9. The Register Enterprise Systems & Security Wire
// ============================================================================
export async function queryTheRegisterNews(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = 'https://www.theregister.com/headlines.atom';

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(5000)
    });

    if (!res.ok) throw new Error(`The Register returned ${res.status}`);
    const xml = await res.text();
    const entryMatches = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
    recordProviderSuccess('the_register_news', Date.now() - start);

    const items: ResourceItem[] = [];
    const lowerQ = query.trim().toLowerCase();
    const isGeneral = !lowerQ || ['news', 'latest', 'breaking', 'systems', 'tech', 'computing', 'security', 'enterprise', 'world', 'all'].includes(lowerQ);

    for (const block of entryMatches) {
      if (items.length >= 10) break;
      const rawTitle = block.match(/<title[^>]*>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/title>/i);
      const rawLink = block.match(/<link>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/link>/i);
      const rawUpdated = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
      const rawSummary = block.match(/<description[^>]*>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/description>/i);
      const rawAuthor = block.match(/<dc:creator[^>]*>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/dc:creator>/i);

      const title = cleanText(rawTitle?.[1] || rawTitle?.[2] || '');
      const link = (rawLink?.[1] || rawLink?.[2] || '').trim();
      const desc = cleanText(rawSummary?.[1] || rawSummary?.[2] || '');
      const pubDate = (rawUpdated?.[1] || '').trim();
      const author = cleanText(rawAuthor?.[1] || rawAuthor?.[2] || 'The Register Staff');

      if (!title || !link) continue;
      if (!isGeneral && !title.toLowerCase().includes(lowerQ) && !desc.toLowerCase().includes(lowerQ)) {
        continue;
      }

      const thumb = 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80';

      items.push(
        buildResourceItem({
          id: `reg-${Buffer.from(link).toString('base64').slice(0, 16)}`,
          title,
          description: desc || `Enterprise computing, infrastructure, software, and cybersecurity dispatches by ${author}.`,
          resourceUrl: link,
          downloadUrl: link,
          previewUrl: thumb,
          thumbnailUrl: thumb,
          category: 'news',
          providerId: 'the_register_news',
          providerName: 'The Register Enterprise Wire',
          rawLicense: 'Situation Publishing Editorial',
          licenseUrl: link,
          providerDefaultLicense: {
            type: 'Editorial News Access',
            commercialAllowed: false,
            attributionRequired: true
          },
          attributes: {
            publisher: 'The Register (UK)',
            author,
            publishedAt: pubDate || new Date().toISOString(),
            isLiveNews: true,
            tags: ['the-register', 'enterprise', 'sysadmin', 'infosec', 'cloud']
          }
        })
      );
    }
    return items;
  } catch (err: any) {
    recordProviderFailure('the_register_news', err.message);
    return [];
  }
}

// ============================================================================
// 10. NASA Official Breaking Missions & Space Discoveries
// ============================================================================
export async function queryNasaBreakingNews(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = 'https://www.nasa.gov/news-release/feed/';

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(5000)
    });

    if (!res.ok) throw new Error(`NASA News returned ${res.status}`);
    const xml = await res.text();
    const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
    recordProviderSuccess('nasa_breaking_news', Date.now() - start);

    const items: ResourceItem[] = [];
    const lowerQ = query.trim().toLowerCase();

    for (const block of itemMatches) {
      if (items.length >= 10) break;
      const rawTitle = block.match(/<title>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/title>/i);
      const rawLink = block.match(/<link>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/link>/i);
      const rawDate = block.match(/<pubDate>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/pubDate>/i);
      const rawDesc = block.match(/<description>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/description>/i);

      const title = cleanText(rawTitle?.[1] || rawTitle?.[2] || '');
      const link = (rawLink?.[1] || rawLink?.[2] || '').trim();
      const desc = cleanText(rawDesc?.[1] || rawDesc?.[2] || '');
      const pubDate = (rawDate?.[1] || rawDate?.[2] || '').trim();

      if (!title || !link) continue;
      if (lowerQ && !title.toLowerCase().includes(lowerQ) && !desc.toLowerCase().includes(lowerQ) && lowerQ !== 'nasa' && lowerQ !== 'space' && lowerQ !== 'news') {
        continue;
      }

      const thumb = extractThumbnail(block) || 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80';

      items.push(
        buildResourceItem({
          id: `nasa-news-${Buffer.from(link).toString('base64').slice(0, 16)}`,
          title: `NASA Dispatch: ${title}`,
          category: 'news',
          description: desc || 'Official NASA news release regarding space exploration, aerospace missions, and astrophysics discoveries.',
          resourceUrl: link,
          downloadUrl: link,
          previewUrl: thumb,
          thumbnailUrl: thumb,
          providerId: 'nasa_breaking_news',
          providerName: 'NASA Official News Wire',
          rawLicense: 'US Government / NASA Public Domain',
          licenseUrl: 'https://www.nasa.gov/multimedia/guidelines/index.html',
          providerDefaultLicense: {
            type: 'Public Domain',
            commercialAllowed: true,
            attributionRequired: false
          },
          attributes: {
            publisher: 'National Aeronautics and Space Administration (NASA)',
            publishedAt: pubDate || new Date().toISOString(),
            isLiveNews: true,
            tags: ['nasa', 'space', 'artemis', 'astronomy', 'space-exploration']
          }
        })
      );
    }
    return items;
  } catch (err: any) {
    recordProviderFailure('nasa_breaking_news', err.message);
    return [];
  }
}

// ============================================================================
// 11. Internet Archive Grateful Dead Live Concert Soundboard Vault
// ============================================================================
export async function queryArchiveGratefulDead(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'soundboard';
  const searchQuery = `collection:(GratefulDead) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,date,year,downloads&sort[]=downloads desc&rows=14&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_grateful_dead', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const date = doc.date || doc.year || '1970s';
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const audioUrl = `https://archive.org/download/${id}/${id}_vbr.mp3`;

      return buildResourceItem({
        id: `ia-dead-${id}`,
        title: `${title} [Grateful Dead Live Vault]`,
        category: 'audio',
        description: `Legendary Grateful Dead live concert soundboard recording from ${date}. Preserved in the Internet Archive Live Music Archive with audience taper and soundboard masters.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: audioUrl,
        providerId: 'archive_grateful_dead',
        providerName: 'Grateful Dead Live Vault (LMA)',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: 'The Grateful Dead',
        rawLicense: 'Creative Commons Non-Commercial / Taper Permission',
        licenseUrl: 'https://archive.org/details/GratefulDead',
        providerDefaultLicense: {
          type: 'Creative Commons CC-BY-NC-ND',
          commercialAllowed: false,
          attributionRequired: true
        },
        attributes: {
          format: 'mp3',
          isStreamable: true,
          date,
          tags: ['grateful-dead', 'jerry-garcia', 'live-concert', 'soundboard', 'psychedelic-rock']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_grateful_dead', err.message);
    return [];
  }
}

// ============================================================================
// 12. UCSB & Edison Early Acoustic Wax Cylinders (1890-1925)
// ============================================================================
export async function queryArchiveWaxCylinders(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'cylinder';
  const searchQuery = `mediatype:audio AND ("wax cylinder" OR "edison cylinder" OR cylinder OR phonograph) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,year,downloads&sort[]=downloads desc&rows=14&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_wax_cylinders', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const audioUrl = `https://archive.org/download/${id}/${id}.mp3`;

      return buildResourceItem({
        id: `ia-cyl-${id}`,
        title: `${title} [Early Acoustic Wax Cylinder]`,
        category: 'audio',
        description: `Digitized phonograph wax cylinder recording from the late 19th and early 20th century. Preserved by the UCSB Cylinder Audio Archive and the Internet Archive.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: audioUrl,
        providerId: 'archive_wax_cylinders',
        providerName: 'UCSB Early Acoustic Wax Cylinders',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: doc.creator || 'Thomas A. Edison Phonograph Works',
        rawLicense: 'Public Domain',
        licenseUrl: 'https://archive.org/details/cylinderrecordings',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'mp3',
          isStreamable: true,
          year: doc.year,
          tags: ['wax-cylinder', 'phonograph', 'edison', 'acoustic-recording', 'vintage-audio']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_wax_cylinders', err.message);
    return [];
  }
}

// ============================================================================
// 13. Vintage Computer Magazines Archive (Byte, Compute!, Amiga)
// ============================================================================
export async function queryArchiveVintageComputerMagazines(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'byte';
  const searchQuery = `collection:(computermagazines) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,date,downloads&sort[]=downloads desc&rows=14&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_vintage_computer_magazines', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const pdfUrl = `https://archive.org/download/${id}/${id}.pdf`;

      return buildResourceItem({
        id: `ia-compmag-${id}`,
        title: `${title} [Vintage Computing Magazine]`,
        category: 'books',
        description: `Historic microcomputing magazine preservation, featuring original retro code listings, microchip blueprints, early personal computing reviews, and PC pioneer journalism.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: pdfUrl,
        providerId: 'archive_vintage_computer_magazines',
        providerName: 'Vintage Computer Magazines Archive',
        resourceUrl: itemUrl,
        externalId: id,
        rawLicense: 'Open Community Preservation',
        licenseUrl: 'https://archive.org/details/computermagazines',
        providerDefaultLicense: {
          type: 'Open Access',
          commercialAllowed: false,
          attributionRequired: true
        },
        attributes: {
          format: 'pdf',
          date: doc.date,
          tags: ['vintage-computing', 'byte-magazine', 'retro-pc', 'microcomputers', 'programming']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_vintage_computer_magazines', err.message);
    return [];
  }
}

// ============================================================================
// 14. Video Game Concept Art & Historical Design Documents
// ============================================================================
export async function queryArchiveVideoGameDesign(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'game';
  const searchQuery = `(mediatype:texts OR mediatype:data) AND ("video game" OR "game design" OR "design document" OR videogame) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,year,downloads&sort[]=downloads desc&rows=14&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_video_game_design', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;

      return buildResourceItem({
        id: `ia-gamedoc-${id}`,
        title: `${title} [Game Design Bible]`,
        category: 'games',
        description: `Official historical video game design document, production pitch bible, character concept sketches, and developer level design notes.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: itemUrl,
        providerId: 'archive_video_game_design',
        providerName: 'Video Game Design Archives',
        resourceUrl: itemUrl,
        externalId: id,
        rawLicense: 'Historical Game Preservation',
        licenseUrl: 'https://archive.org/details/videogamedocuments',
        providerDefaultLicense: {
          type: 'Educational / Preservation',
          commercialAllowed: false,
          attributionRequired: true
        },
        attributes: {
          year: doc.year,
          tags: ['game-design', 'concept-art', 'design-bible', 'gamedev', 'video-game-history']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_video_game_design', err.message);
    return [];
  }
}

// ============================================================================
// 15. Aeronautics History & Historic Flight Test Manuals
// ============================================================================
export async function queryArchiveAviationHistory(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'flight';
  const searchQuery = `(collection:(nasa OR naca OR aerospace-library) OR mediatype:texts) AND (aviation OR airplane OR flight OR aeronautics) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,date,downloads&sort[]=downloads desc&rows=14&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_aviation_history', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const pdfUrl = `https://archive.org/download/${id}/${id}.pdf`;

      return buildResourceItem({
        id: `ia-aero-${id}`,
        title: `${title} [Aeronautical Flight Manual]`,
        category: 'knowledge',
        description: `Historical aerospace engineering report, aerodynamic wind-tunnel data, NACA flight test reports, and aviation maintenance manuals.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: pdfUrl,
        providerId: 'archive_aviation_history',
        providerName: 'Aviation History & Flight Manuals',
        resourceUrl: itemUrl,
        externalId: id,
        rawLicense: 'Public Domain / Historical Preservation',
        licenseUrl: 'https://archive.org/details/aviationhistory',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'pdf',
          date: doc.date,
          tags: ['aviation', 'aerospace', 'flight-manual', 'naca', 'pilot', 'airplanes']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_aviation_history', err.message);
    return [];
  }
}

// ============================================================================
// 16. Antique Cartography, Rare Portolan Charts & World Atlases
// ============================================================================
export async function queryArchiveHistoricAtlases(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'map';
  const searchQuery = `(collection:(maps_usgs OR historical_maps OR david-rumsey-map-collection) OR mediatype:image) AND (atlas OR map OR cartography) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,date,downloads&sort[]=downloads desc&rows=14&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_historic_atlases', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;

      return buildResourceItem({
        id: `ia-mapatlas-${id}`,
        title: `${title} [Antique Cartography & Atlas]`,
        category: 'maps',
        description: `Historical engraved geographic map, topographical contour chart, and maritime navigational atlas preserved from rare library collections.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: itemUrl,
        providerId: 'archive_historic_atlases',
        providerName: 'Antique Cartography & World Atlases',
        resourceUrl: itemUrl,
        externalId: id,
        rawLicense: 'Public Domain',
        licenseUrl: 'https://archive.org/details/historical-maps',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          date: doc.date,
          tags: ['cartography', 'antique-maps', 'historical-atlas', 'geography', 'topography']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_historic_atlases', err.message);
    return [];
  }
}

// ============================================================================
// 17. Pre-Code Hollywood & Silent Era Motion Picture Epics
// ============================================================================
export async function queryArchivePreCodeCinema(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'cinema';
  const searchQuery = `collection:(silent_films) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,year,downloads&sort[]=downloads desc&rows=14&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_pre_code_cinema', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const videoUrl = `https://archive.org/download/${id}/${id}.mp4`;

      return buildResourceItem({
        id: `ia-silent-${id}`,
        title: `${title} [Classic Silent Cinema]`,
        category: 'videos',
        description: `Historic silent film masterpiece from cinema's pioneering era. Features early cinematic special effects, expressionist cinematography, and original title cards.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: videoUrl,
        providerId: 'archive_pre_code_cinema',
        providerName: 'Classic Silent Era & Pre-Code Cinema',
        resourceUrl: itemUrl,
        externalId: id,
        rawLicense: 'Public Domain Cinema',
        licenseUrl: 'https://archive.org/details/silent_films',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'mp4',
          isStreamable: true,
          year: doc.year,
          tags: ['silent-film', 'pre-code', 'classic-cinema', 'motion-pictures', 'public-domain-movies']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_pre_code_cinema', err.message);
    return [];
  }
}

// ============================================================================
// 18. Golden Age Science Fiction Pulp Magazines (Astounding, Galaxy)
// ============================================================================
export async function queryArchivePulpSciFi(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'galaxy';
  const searchQuery = `collection:(pulpmagazinearchive) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,date,downloads&sort[]=downloads desc&rows=14&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_pulp_sci_fi', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const pdfUrl = `https://archive.org/download/${id}/${id}.pdf`;

      return buildResourceItem({
        id: `ia-pulpmag-${id}`,
        title: `${title} [Pulp Sci-Fi Classic]`,
        category: 'books',
        description: `Golden age speculative fiction pulp magazine featuring early science fiction stories of space exploration, alien civilizations, cybernetics, and retro-futurism.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: pdfUrl,
        providerId: 'archive_pulp_sci_fi',
        providerName: 'Golden Age Pulp Sci-Fi Archives',
        resourceUrl: itemUrl,
        externalId: id,
        rawLicense: 'Public Domain / Pulp Preservation',
        licenseUrl: 'https://archive.org/details/pulpmagazinearchive',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'pdf',
          date: doc.date,
          tags: ['pulp-fiction', 'sci-fi', 'space-opera', 'astounding-stories', 'retro-futurism']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_pulp_sci_fi', err.message);
    return [];
  }
}

// ============================================================================
// 19. USDA Pomological Watercolors & Botanical Heritage Art
// ============================================================================
export async function queryArchiveUsdaPomology(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'fruit';
  const searchQuery = `collection:(biodivlibrary OR usda-nurseryandseedcatalog OR botanical) AND (watercolor OR illustration OR botanical OR fruit OR pomology) AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,date,downloads&sort[]=downloads desc&rows=14&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_usda_pomology', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;

      return buildResourceItem({
        id: `ia-usda-${id}`,
        title: `${title} [USDA Botanical Watercolor]`,
        category: 'art',
        description: `Historic botanical illustration from the USDA National Agricultural Library. Hand-painted watercolor commissioned by the US Department of Agriculture between 1886 and 1942.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: thumb,
        providerId: 'archive_usda_pomology',
        providerName: 'USDA Pomological Watercolors & Botany',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: doc.creator || 'USDA Botanical Artists',
        rawLicense: 'US Government Work / Public Domain',
        licenseUrl: 'https://archive.org/details/usda-national-agricultural-library',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          date: doc.date,
          tags: ['botanical-art', 'usda', 'pomology', 'watercolors', 'biodiversity', 'agriculture']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_usda_pomology', err.message);
    return [];
  }
}

// ============================================================================
// 20. Modular Synthesizers & Electronic Music Experimentation
// ============================================================================
export async function queryArchiveModularSynthesizers(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'synth';
  const searchQuery = `mediatype:audio AND (synthesizer OR "modular synth" OR moog OR eurorack OR "electronic music") AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,date,downloads&sort[]=downloads desc&rows=14&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_modular_synthesizers', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const audioUrl = `https://archive.org/download/${id}/${id}.mp3`;

      return buildResourceItem({
        id: `ia-synth-${id}`,
        title: `${title} [Modular Synth & Electronic Soundscape]`,
        category: 'audio',
        description: `Experimental electronic synthesizer soundscape, modular patch recordings, generative drones, and avant-garde electro-acoustic sound art.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: audioUrl,
        providerId: 'archive_modular_synthesizers',
        providerName: 'Modular Synthesizers & Soundscapes',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: doc.creator || 'Electronic Sound Artist',
        rawLicense: 'Creative Commons / Netlabel Open Access',
        licenseUrl: 'https://archive.org/details/electronic_music',
        providerDefaultLicense: {
          type: 'Creative Commons CC-BY-NC',
          commercialAllowed: false,
          attributionRequired: true
        },
        attributes: {
          format: 'mp3',
          isStreamable: true,
          date: doc.date,
          tags: ['modular-synth', 'electronic-music', 'synthesizer', 'drone', 'ambient', 'sound-design']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_modular_synthesizers', err.message);
    return [];
  }
}
