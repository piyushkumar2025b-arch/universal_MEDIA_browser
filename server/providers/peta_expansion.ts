import { ResourceItem } from '../../src/types/resource';
import { buildResourceItem } from '../normalizer';
import { registerTracker, recordProviderSuccess, recordProviderFailure } from '../telemetry';

const USER_AGENT = 'URMIL-Universal-Browser/1.0 (https://ai.studio; contact: team@urmil.org)';

// ============================================================================
// Telemetry Registrations for 20 New Peta-Expansion Providers
// ============================================================================

registerTracker({
  id: 'cbs_news',
  name: 'CBS News Live Wire & Breaking Reports',
  category: 'Live News',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'abc_news',
  name: 'ABC News Global Wire & US Headlines',
  category: 'Live News',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'time_magazine',
  name: 'TIME Magazine World Journalism & In-Depth Reporting',
  category: 'Live News',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'independent_news',
  name: 'The Independent International News Wire',
  category: 'Live News',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'cnbc_markets',
  name: 'CNBC Global Financial Markets & Macro Economy',
  category: 'Live News',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'politico_wire',
  name: 'Politico Policy, Governance & Geopolitical Reports',
  category: 'Live News',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'wired_tech',
  name: 'WIRED Emerging Tech, Cybersecurity & Culture',
  category: 'Live News',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'mit_tech_review',
  name: 'MIT Technology Review AI & Computing Insights',
  category: 'Live News',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'sciencedaily_wire',
  name: 'ScienceDaily Breaking Research Discoveries & Studies',
  category: 'Live News',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'nature_journal_news',
  name: 'Nature International Journal Research Wire',
  category: 'Live News',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'biorxiv_preprints',
  name: 'bioRxiv Biological & Life Sciences Preprints',
  category: 'Papers',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'hackaday_hardware',
  name: 'Hackaday Open Hardware & Embedded Systems',
  category: 'Code',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'phoronix_hardware',
  name: 'Phoronix Linux Kernel, Benchmarks & Open Drivers',
  category: 'Code',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'eurogamer_feed',
  name: 'Eurogamer Video Game Journalism & Industry Releases',
  category: 'Games',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'rockpapershotgun_feed',
  name: 'Rock Paper Shotgun PC Gaming & Indie Analysis',
  category: 'Games',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'iss_current_location',
  name: 'WhereTheISS.at Real-Time Space Station Telemetry',
  category: 'Maps & Space',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'coinpaprika_crypto',
  name: 'CoinPaprika Global Cryptocurrency & Asset Index',
  category: 'Finance & Datasets',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_historical_patent_diagrams',
  name: 'Historic US Patent Blueprints & Invention Schematics',
  category: 'Knowledge & Art',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_early_recorded_blues',
  name: 'Early Acoustic Delta & Country Blues 78 RPM Recordings',
  category: 'Audio & Music',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_world_war_posters',
  name: 'Vintage World War Lithographic Propaganda Posters',
  category: 'Art & Images',
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
// 1. CBS News Live Wire & Breaking Reports
// ============================================================================
export async function queryCbsNews(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = 'https://www.cbsnews.com/latest/rss/main';

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(5000)
    });

    if (!res.ok) throw new Error(`CBS News returned ${res.status}`);
    const xml = await res.text();
    const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
    recordProviderSuccess('cbs_news', Date.now() - start);

    const items: ResourceItem[] = [];
    const lowerQ = query.trim().toLowerCase();
    const isGeneral = !lowerQ || ['news', 'latest', 'breaking', 'world', 'us', 'today', 'all', 'headline'].includes(lowerQ);

    for (const block of itemMatches) {
      if (items.length >= 12) break;
      const rawTitle = block.match(/<title>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/title>/i);
      const rawLink = block.match(/<link>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/link>/i);
      const rawDate = block.match(/<pubDate>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/pubDate>/i);
      const rawDesc = block.match(/<description>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/description>/i);

      const title = cleanText(rawTitle?.[1] || rawTitle?.[2] || '');
      const link = (rawLink?.[1] || rawLink?.[2] || '').trim();
      const desc = cleanText(rawDesc?.[1] || rawDesc?.[2] || '');
      const pubDate = (rawDate?.[1] || rawDate?.[2] || '').trim();

      if (!title || !link) continue;
      if (!isGeneral && !title.toLowerCase().includes(lowerQ) && !desc.toLowerCase().includes(lowerQ)) {
        continue;
      }

      const thumb = extractThumbnail(block) || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&auto=format&fit=crop&q=80';

      items.push(
        buildResourceItem({
          id: `cbs-${Buffer.from(link).toString('base64').slice(0, 16)}`,
          title,
          description: desc || 'Live national and international breaking news reporting from CBS News.',
          resourceUrl: link,
          downloadUrl: link,
          previewUrl: thumb,
          thumbnailUrl: thumb,
          category: 'news',
          providerId: 'cbs_news',
          providerName: 'CBS News Live Wire',
          rawLicense: 'CBS News Editorial',
          licenseUrl: link,
          providerDefaultLicense: {
            type: 'Editorial News Access',
            commercialAllowed: false,
            attributionRequired: true
          },
          attributes: {
            publisher: 'CBS News',
            publishedAt: pubDate || new Date().toISOString(),
            isLiveNews: true,
            tags: ['cbs', 'news', 'breaking', 'headlines', 'broadcast']
          }
        })
      );
    }
    return items;
  } catch (err: any) {
    recordProviderFailure('cbs_news', err.message);
    return [];
  }
}

// ============================================================================
// 2. ABC News Global Wire & US Headlines
// ============================================================================
export async function queryAbcNews(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = 'https://abcnews.go.com/abcnews/topstories';

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(5000)
    });

    if (!res.ok) throw new Error(`ABC News returned ${res.status}`);
    const xml = await res.text();
    const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
    recordProviderSuccess('abc_news', Date.now() - start);

    const items: ResourceItem[] = [];
    const lowerQ = query.trim().toLowerCase();
    const isGeneral = !lowerQ || ['news', 'latest', 'breaking', 'world', 'us', 'today', 'all', 'top'].includes(lowerQ);

    for (const block of itemMatches) {
      if (items.length >= 12) break;
      const rawTitle = block.match(/<title>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/title>/i);
      const rawLink = block.match(/<link>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/link>/i);
      const rawDate = block.match(/<pubDate>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/pubDate>/i);
      const rawDesc = block.match(/<description>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/description>/i);

      const title = cleanText(rawTitle?.[1] || rawTitle?.[2] || '');
      const link = (rawLink?.[1] || rawLink?.[2] || '').trim();
      const desc = cleanText(rawDesc?.[1] || rawDesc?.[2] || '');
      const pubDate = (rawDate?.[1] || rawDate?.[2] || '').trim();

      if (!title || !link) continue;
      if (!isGeneral && !title.toLowerCase().includes(lowerQ) && !desc.toLowerCase().includes(lowerQ)) {
        continue;
      }

      const thumb = extractThumbnail(block) || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&auto=format&fit=crop&q=80';

      items.push(
        buildResourceItem({
          id: `abc-${Buffer.from(link).toString('base64').slice(0, 16)}`,
          title,
          description: desc || 'Top headlines and real-time news reporting from ABC News Global Wire.',
          resourceUrl: link,
          downloadUrl: link,
          previewUrl: thumb,
          thumbnailUrl: thumb,
          category: 'news',
          providerId: 'abc_news',
          providerName: 'ABC News Global Wire',
          rawLicense: 'ABC News Editorial',
          licenseUrl: link,
          providerDefaultLicense: {
            type: 'Editorial News Access',
            commercialAllowed: false,
            attributionRequired: true
          },
          attributes: {
            publisher: 'ABC News Network',
            publishedAt: pubDate || new Date().toISOString(),
            isLiveNews: true,
            tags: ['abc', 'news', 'headlines', 'world-news']
          }
        })
      );
    }
    return items;
  } catch (err: any) {
    recordProviderFailure('abc_news', err.message);
    return [];
  }
}

// ============================================================================
// 3. TIME Magazine World Journalism & In-Depth Reporting
// ============================================================================
export async function queryTimeMagazine(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = 'https://time.com/feed/';

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(5000)
    });

    if (!res.ok) throw new Error(`TIME Magazine returned ${res.status}`);
    const xml = await res.text();
    const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
    recordProviderSuccess('time_magazine', Date.now() - start);

    const items: ResourceItem[] = [];
    const lowerQ = query.trim().toLowerCase();
    const isGeneral = !lowerQ || ['news', 'latest', 'breaking', 'world', 'time', 'analysis', 'all'].includes(lowerQ);

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
      if (!isGeneral && !title.toLowerCase().includes(lowerQ) && !desc.toLowerCase().includes(lowerQ)) {
        continue;
      }

      const thumb = extractThumbnail(block) || 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&auto=format&fit=crop&q=80';

      items.push(
        buildResourceItem({
          id: `time-${Buffer.from(link).toString('base64').slice(0, 16)}`,
          title,
          description: desc || 'In-depth global affairs, politics, culture, and investigative reporting from TIME Magazine.',
          resourceUrl: link,
          downloadUrl: link,
          previewUrl: thumb,
          thumbnailUrl: thumb,
          category: 'news',
          providerId: 'time_magazine',
          providerName: 'TIME Magazine World Wire',
          rawLicense: 'TIME Editorial Access',
          licenseUrl: link,
          providerDefaultLicense: {
            type: 'Editorial News Access',
            commercialAllowed: false,
            attributionRequired: true
          },
          attributes: {
            publisher: 'TIME USA, LLC',
            publishedAt: pubDate || new Date().toISOString(),
            isLiveNews: true,
            tags: ['time-magazine', 'in-depth', 'world-news', 'politics', 'journalism']
          }
        })
      );
    }
    return items;
  } catch (err: any) {
    recordProviderFailure('time_magazine', err.message);
    return [];
  }
}

// ============================================================================
// 4. The Independent International News Wire
// ============================================================================
export async function queryIndependentNews(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = 'https://www.independent.co.uk/news/world/rss';

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(5000)
    });

    if (!res.ok) throw new Error(`The Independent returned ${res.status}`);
    const xml = await res.text();
    const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
    recordProviderSuccess('independent_news', Date.now() - start);

    const items: ResourceItem[] = [];
    const lowerQ = query.trim().toLowerCase();
    const isGeneral = !lowerQ || ['news', 'latest', 'breaking', 'world', 'uk', 'europe', 'all'].includes(lowerQ);

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
      if (!isGeneral && !title.toLowerCase().includes(lowerQ) && !desc.toLowerCase().includes(lowerQ)) {
        continue;
      }

      const thumb = extractThumbnail(block) || 'https://images.unsplash.com/photo-1526470608268-f674ce90ebd4?w=800&auto=format&fit=crop&q=80';

      items.push(
        buildResourceItem({
          id: `indep-${Buffer.from(link).toString('base64').slice(0, 16)}`,
          title,
          description: desc || 'International journalism, European geopolitics, and global dispatches from The Independent.',
          resourceUrl: link,
          downloadUrl: link,
          previewUrl: thumb,
          thumbnailUrl: thumb,
          category: 'news',
          providerId: 'independent_news',
          providerName: 'The Independent World Wire',
          rawLicense: 'The Independent Editorial',
          licenseUrl: link,
          providerDefaultLicense: {
            type: 'Editorial News Access',
            commercialAllowed: false,
            attributionRequired: true
          },
          attributes: {
            publisher: 'Independent Digital News & Media',
            publishedAt: pubDate || new Date().toISOString(),
            isLiveNews: true,
            tags: ['independent', 'world-news', 'europe', 'international-affairs']
          }
        })
      );
    }
    return items;
  } catch (err: any) {
    recordProviderFailure('independent_news', err.message);
    return [];
  }
}

// ============================================================================
// 5. CNBC Global Financial Markets & Macro Economy
// ============================================================================
export async function queryCnbcMarkets(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = 'https://www.cnbc.com/id/10000664/device/rss/rss.html';

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(5000)
    });

    if (!res.ok) throw new Error(`CNBC returned ${res.status}`);
    const xml = await res.text();
    const itemMatches = xml.match(/<item[^>]*>[\s\S]*?<\/item>/gi) || [];
    recordProviderSuccess('cnbc_markets', Date.now() - start);

    const items: ResourceItem[] = [];
    const lowerQ = query.trim().toLowerCase();
    const isGeneral = !lowerQ || ['news', 'markets', 'finance', 'economy', 'stocks', 'business', 'all'].includes(lowerQ);

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
      if (!isGeneral && !title.toLowerCase().includes(lowerQ) && !desc.toLowerCase().includes(lowerQ)) {
        continue;
      }

      const thumb = extractThumbnail(block) || 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format&fit=crop&q=80';

      items.push(
        buildResourceItem({
          id: `cnbc-${Buffer.from(link).toString('base64').slice(0, 16)}`,
          title,
          description: desc || 'Real-time financial market analytics, equity movements, currency valuations, and global macroeconomic policy.',
          resourceUrl: link,
          downloadUrl: link,
          previewUrl: thumb,
          thumbnailUrl: thumb,
          category: 'news',
          providerId: 'cnbc_markets',
          providerName: 'CNBC Financial Markets & Economy',
          rawLicense: 'CNBC Editorial Access',
          licenseUrl: link,
          providerDefaultLicense: {
            type: 'Editorial News Access',
            commercialAllowed: false,
            attributionRequired: true
          },
          attributes: {
            publisher: 'CNBC / NBCUniversal',
            publishedAt: pubDate || new Date().toISOString(),
            isLiveNews: true,
            tags: ['cnbc', 'financial-markets', 'economy', 'macroeconomics', 'stocks']
          }
        })
      );
    }
    return items;
  } catch (err: any) {
    recordProviderFailure('cnbc_markets', err.message);
    return [];
  }
}

// ============================================================================
// 6. Politico Policy, Governance & Geopolitical Reports
// ============================================================================
export async function queryPoliticoWire(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = 'https://rss.politico.com/politics-news.xml';

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(7000)
    });

    if (!res.ok) throw new Error(`Politico returned ${res.status}`);
    const xml = await res.text();
    const itemMatches = xml.match(/<item\b[^>]*>[\s\S]*?<\/item>/gi) || [];
    recordProviderSuccess('politico_wire', Date.now() - start);

    const items: ResourceItem[] = [];
    const lowerQ = query.trim().toLowerCase();
    const isGeneral = !lowerQ || ['news', 'politics', 'government', 'policy', 'election', 'congress', 'all'].includes(lowerQ);

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
      if (!isGeneral && !title.toLowerCase().includes(lowerQ) && !desc.toLowerCase().includes(lowerQ)) {
        continue;
      }

      const thumb = extractThumbnail(block) || 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800&auto=format&fit=crop&q=80';

      items.push(
        buildResourceItem({
          id: `pol-${Buffer.from(link).toString('base64').slice(0, 16)}`,
          title,
          description: desc || 'Authoritative policy analysis, political intelligence, legislative reporting, and international governance.',
          resourceUrl: link,
          downloadUrl: link,
          previewUrl: thumb,
          thumbnailUrl: thumb,
          category: 'news',
          providerId: 'politico_wire',
          providerName: 'Politico Policy & Governance Wire',
          rawLicense: 'Politico Editorial Access',
          licenseUrl: link,
          providerDefaultLicense: {
            type: 'Editorial News Access',
            commercialAllowed: false,
            attributionRequired: true
          },
          attributes: {
            publisher: 'POLITICO LLC / Axel Springer',
            publishedAt: pubDate || new Date().toISOString(),
            isLiveNews: true,
            tags: ['politico', 'governance', 'policy', 'legislation', 'diplomacy']
          }
        })
      );
    }
    return items;
  } catch (err: any) {
    recordProviderFailure('politico_wire', err.message);
    return [];
  }
}

// ============================================================================
// 7. WIRED Emerging Tech, Cybersecurity & Culture
// ============================================================================
export async function queryWiredTech(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = 'https://www.wired.com/feed/rss';

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(5000)
    });

    if (!res.ok) throw new Error(`WIRED returned ${res.status}`);
    const xml = await res.text();
    const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
    recordProviderSuccess('wired_tech', Date.now() - start);

    const items: ResourceItem[] = [];
    const lowerQ = query.trim().toLowerCase();
    const isGeneral = !lowerQ || ['news', 'tech', 'technology', 'wired', 'ai', 'cybersecurity', 'all'].includes(lowerQ);

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
      if (!isGeneral && !title.toLowerCase().includes(lowerQ) && !desc.toLowerCase().includes(lowerQ)) {
        continue;
      }

      const thumb = extractThumbnail(block) || 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&auto=format&fit=crop&q=80';

      items.push(
        buildResourceItem({
          id: `wired-${Buffer.from(link).toString('base64').slice(0, 16)}`,
          title,
          description: desc || 'Emerging technology breakthroughs, cyber warfare, digital rights, and futuristic innovation from WIRED.',
          resourceUrl: link,
          downloadUrl: link,
          previewUrl: thumb,
          thumbnailUrl: thumb,
          category: 'news',
          providerId: 'wired_tech',
          providerName: 'WIRED Technology & Science Wire',
          rawLicense: 'Condé Nast / WIRED Editorial',
          licenseUrl: link,
          providerDefaultLicense: {
            type: 'Editorial News Access',
            commercialAllowed: false,
            attributionRequired: true
          },
          attributes: {
            publisher: 'Condé Nast / WIRED',
            publishedAt: pubDate || new Date().toISOString(),
            isLiveNews: true,
            tags: ['wired', 'tech', 'cybersecurity', 'ai', 'innovation']
          }
        })
      );
    }
    return items;
  } catch (err: any) {
    recordProviderFailure('wired_tech', err.message);
    return [];
  }
}

// ============================================================================
// 8. MIT Technology Review AI & Computing Insights
// ============================================================================
export async function queryMitTechReview(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = 'https://www.technologyreview.com/feed/';

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(5000)
    });

    if (!res.ok) throw new Error(`MIT Tech Review returned ${res.status}`);
    const xml = await res.text();
    const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
    recordProviderSuccess('mit_tech_review', Date.now() - start);

    const items: ResourceItem[] = [];
    const lowerQ = query.trim().toLowerCase();
    const isGeneral = !lowerQ || ['news', 'tech', 'ai', 'science', 'mit', 'computing', 'biotech', 'all'].includes(lowerQ);

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
      if (!isGeneral && !title.toLowerCase().includes(lowerQ) && !desc.toLowerCase().includes(lowerQ)) {
        continue;
      }

      const thumb = extractThumbnail(block) || 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=800&auto=format&fit=crop&q=80';

      items.push(
        buildResourceItem({
          id: `mit-${Buffer.from(link).toString('base64').slice(0, 16)}`,
          title,
          description: desc || 'Deep analysis of foundational artificial intelligence, quantum computing, biotechnology, and clean tech from MIT.',
          resourceUrl: link,
          downloadUrl: link,
          previewUrl: thumb,
          thumbnailUrl: thumb,
          category: 'news',
          providerId: 'mit_tech_review',
          providerName: 'MIT Technology Review',
          rawLicense: 'MIT Technology Review Editorial',
          licenseUrl: link,
          providerDefaultLicense: {
            type: 'Editorial News Access',
            commercialAllowed: false,
            attributionRequired: true
          },
          attributes: {
            publisher: 'Massachusetts Institute of Technology',
            publishedAt: pubDate || new Date().toISOString(),
            isLiveNews: true,
            tags: ['mit', 'ai', 'quantum', 'biotechnology', 'technology-review']
          }
        })
      );
    }
    return items;
  } catch (err: any) {
    recordProviderFailure('mit_tech_review', err.message);
    return [];
  }
}

// ============================================================================
// 9. ScienceDaily Breaking Research Discoveries & Studies
// ============================================================================
export async function queryScienceDailyWire(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = 'https://www.sciencedaily.com/rss/top/science.xml';

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(5000)
    });

    if (!res.ok) throw new Error(`ScienceDaily returned ${res.status}`);
    const xml = await res.text();
    const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
    recordProviderSuccess('sciencedaily_wire', Date.now() - start);

    const items: ResourceItem[] = [];
    const lowerQ = query.trim().toLowerCase();
    const isGeneral = !lowerQ || ['news', 'science', 'research', 'biology', 'astronomy', 'physics', 'all'].includes(lowerQ);

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
      if (!isGeneral && !title.toLowerCase().includes(lowerQ) && !desc.toLowerCase().includes(lowerQ)) {
        continue;
      }

      const thumb = extractThumbnail(block) || 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&auto=format&fit=crop&q=80';

      items.push(
        buildResourceItem({
          id: `scidaily-${Buffer.from(link).toString('base64').slice(0, 16)}`,
          title,
          description: desc || 'Peer-reviewed research breakthroughs, astrophysical discoveries, and molecular sciences reporting from ScienceDaily.',
          resourceUrl: link,
          downloadUrl: link,
          previewUrl: thumb,
          thumbnailUrl: thumb,
          category: 'news',
          providerId: 'sciencedaily_wire',
          providerName: 'ScienceDaily Research Wire',
          rawLicense: 'ScienceDaily Open Editorial',
          licenseUrl: link,
          providerDefaultLicense: {
            type: 'Open Access Research Reporting',
            commercialAllowed: false,
            attributionRequired: true
          },
          attributes: {
            publisher: 'ScienceDaily, LLC',
            publishedAt: pubDate || new Date().toISOString(),
            isLiveNews: true,
            tags: ['sciencedaily', 'research', 'science', 'astronomy', 'biology', 'physics']
          }
        })
      );
    }
    return items;
  } catch (err: any) {
    recordProviderFailure('sciencedaily_wire', err.message);
    return [];
  }
}

// ============================================================================
// 10. Nature International Journal Research Wire
// ============================================================================
export async function queryNatureJournalNews(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = 'https://www.nature.com/nature.rss';

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(5000)
    });

    if (!res.ok) throw new Error(`Nature returned ${res.status}`);
    const xml = await res.text();
    const itemMatches = xml.match(/<item\b[^>]*>[\s\S]*?<\/item>/gi) || [];
    recordProviderSuccess('nature_journal_news', Date.now() - start);

    const items: ResourceItem[] = [];
    const lowerQ = query.trim().toLowerCase();
    const isGeneral = !lowerQ || ['news', 'nature', 'journal', 'science', 'biology', 'genetics', 'physics', 'all'].includes(lowerQ);

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
      if (!isGeneral && !title.toLowerCase().includes(lowerQ) && !desc.toLowerCase().includes(lowerQ)) {
        continue;
      }

      const thumb = extractThumbnail(block) || 'https://images.unsplash.com/photo-1518152006812-edab29b069ac?w=800&auto=format&fit=crop&q=80';

      items.push(
        buildResourceItem({
          id: `nature-${Buffer.from(link).toString('base64').slice(0, 16)}`,
          title,
          description: desc || 'World-leading peer-reviewed scientific discoveries, articles, and research dispatches from Nature.',
          resourceUrl: link,
          downloadUrl: link,
          previewUrl: thumb,
          thumbnailUrl: thumb,
          category: 'news',
          providerId: 'nature_journal_news',
          providerName: 'Nature Journal Research Wire',
          rawLicense: 'Springer Nature Editorial',
          licenseUrl: link,
          providerDefaultLicense: {
            type: 'Scientific Editorial Access',
            commercialAllowed: false,
            attributionRequired: true
          },
          attributes: {
            publisher: 'Springer Nature',
            publishedAt: pubDate || new Date().toISOString(),
            isLiveNews: true,
            tags: ['nature', 'scientific-journal', 'peer-reviewed', 'nature-portfolio']
          }
        })
      );
    }
    return items;
  } catch (err: any) {
    recordProviderFailure('nature_journal_news', err.message);
    return [];
  }
}

// ============================================================================
// 11. bioRxiv Biological & Life Sciences Preprints
// ============================================================================
export async function queryBiorxivPreprints(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = 'https://connect.biorxiv.org/biorxiv_xml.php?subject=all';

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(5000)
    });

    if (!res.ok) throw new Error(`bioRxiv returned ${res.status}`);
    const xml = await res.text();
    const itemMatches = xml.match(/<item\b[^>]*>[\s\S]*?<\/item>/gi) || [];
    recordProviderSuccess('biorxiv_preprints', Date.now() - start);

    const items: ResourceItem[] = [];
    const lowerQ = query.trim().toLowerCase();
    const isGeneral = !lowerQ || ['paper', 'biology', 'life', 'science', 'research', 'genetics', 'all'].includes(lowerQ);

    for (const block of itemMatches) {
      if (items.length >= 10) break;
      const rawTitle = block.match(/<title>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/title>/i);
      const rawLink = block.match(/<link>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/link>/i);
      const rawDate = block.match(/<dc:date>([\s\S]*?)<\/dc:date>/i) || block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
      const rawDesc = block.match(/<description>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/description>/i);
      const rawCreator = block.match(/<dc:creator[^>]*>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/dc:creator>/i);

      const title = cleanText(rawTitle?.[1] || rawTitle?.[2] || '');
      const link = (rawLink?.[1] || rawLink?.[2] || '').trim();
      const desc = cleanText(rawDesc?.[1] || rawDesc?.[2] || '');
      const pubDate = (rawDate?.[1] || rawDate?.[2] || '').trim();
      const creator = cleanText(rawCreator?.[1] || rawCreator?.[2] || 'bioRxiv Author');

      if (!title || !link) continue;
      if (!isGeneral && !title.toLowerCase().includes(lowerQ) && !desc.toLowerCase().includes(lowerQ)) {
        continue;
      }

      const thumb = 'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?w=800&auto=format&fit=crop&q=80';

      items.push(
        buildResourceItem({
          id: `biorxiv-${Buffer.from(link).toString('base64').slice(0, 16)}`,
          title: `${title} [bioRxiv Preprint]`,
          description: desc || `Open access preprint in the life sciences from Cold Spring Harbor Laboratory by ${creator}.`,
          resourceUrl: link,
          downloadUrl: `${link}.full.pdf`,
          previewUrl: thumb,
          thumbnailUrl: thumb,
          category: 'papers',
          providerId: 'biorxiv_preprints',
          providerName: 'bioRxiv Life Sciences Preprints',
          rawLicense: 'Open Access Preprint',
          licenseUrl: link,
          providerDefaultLicense: {
            type: 'Open Access CC-BY',
            commercialAllowed: false,
            attributionRequired: true
          },
          attributes: {
            publisher: 'Cold Spring Harbor Laboratory',
            author: creator,
            publishedAt: pubDate || new Date().toISOString(),
            tags: ['biorxiv', 'life-sciences', 'preprint', 'biology', 'genomics', 'open-science']
          }
        })
      );
    }
    return items;
  } catch (err: any) {
    recordProviderFailure('biorxiv_preprints', err.message);
    return [];
  }
}

// ============================================================================
// 12. Hackaday Open Hardware & Embedded Systems
// ============================================================================
export async function queryHackadayHardware(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = 'https://hackaday.com/feed/';

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(5000)
    });

    if (!res.ok) throw new Error(`Hackaday returned ${res.status}`);
    const xml = await res.text();
    const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
    recordProviderSuccess('hackaday_hardware', Date.now() - start);

    const items: ResourceItem[] = [];
    const lowerQ = query.trim().toLowerCase();
    const isGeneral = !lowerQ || ['code', 'hardware', 'electronics', 'hackaday', 'embedded', 'diy', 'all'].includes(lowerQ);

    for (const block of itemMatches) {
      if (items.length >= 10) break;
      const rawTitle = block.match(/<title>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/title>/i);
      const rawLink = block.match(/<link>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/link>/i);
      const rawDate = block.match(/<pubDate>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/pubDate>/i);
      const rawDesc = block.match(/<description>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/description>/i);
      const rawCreator = block.match(/<dc:creator[^>]*>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/dc:creator>/i);

      const title = cleanText(rawTitle?.[1] || rawTitle?.[2] || '');
      const link = (rawLink?.[1] || rawLink?.[2] || '').trim();
      const desc = cleanText(rawDesc?.[1] || rawDesc?.[2] || '');
      const pubDate = (rawDate?.[1] || rawDate?.[2] || '').trim();
      const author = cleanText(rawCreator?.[1] || rawCreator?.[2] || 'Hackaday');

      if (!title || !link) continue;
      if (!isGeneral && !title.toLowerCase().includes(lowerQ) && !desc.toLowerCase().includes(lowerQ)) {
        continue;
      }

      const thumb = extractThumbnail(block) || 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80';

      items.push(
        buildResourceItem({
          id: `hackaday-${Buffer.from(link).toString('base64').slice(0, 16)}`,
          title: `${title} [Open Hardware Engineering]`,
          description: desc || `Open hardware hacking, microcontrollers, embedded firmware, PCB designs, and circuit engineering by ${author}.`,
          resourceUrl: link,
          downloadUrl: link,
          previewUrl: thumb,
          thumbnailUrl: thumb,
          category: 'code',
          providerId: 'hackaday_hardware',
          providerName: 'Hackaday Open Hardware & Firmware',
          rawLicense: 'Hackaday Open Hardware Editorial',
          licenseUrl: link,
          providerDefaultLicense: {
            type: 'Open Engineering Access',
            commercialAllowed: false,
            attributionRequired: true
          },
          attributes: {
            publisher: 'Supplyframe / Siemens',
            author,
            publishedAt: pubDate || new Date().toISOString(),
            tags: ['hackaday', 'open-hardware', 'electronics', 'microcontrollers', 'circuitry', 'maker']
          }
        })
      );
    }
    return items;
  } catch (err: any) {
    recordProviderFailure('hackaday_hardware', err.message);
    return [];
  }
}

// ============================================================================
// 13. Phoronix Linux Kernel, Benchmarks & Open Drivers
// ============================================================================
export async function queryPhoronixHardware(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = 'https://www.phoronix.com/rss.php';

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(5000)
    });

    if (!res.ok) throw new Error(`Phoronix returned ${res.status}`);
    const xml = await res.text();
    const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
    recordProviderSuccess('phoronix_hardware', Date.now() - start);

    const items: ResourceItem[] = [];
    const lowerQ = query.trim().toLowerCase();
    const isGeneral = !lowerQ || ['code', 'linux', 'kernel', 'phoronix', 'drivers', 'benchmarks', 'all'].includes(lowerQ);

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
      if (!isGeneral && !title.toLowerCase().includes(lowerQ) && !desc.toLowerCase().includes(lowerQ)) {
        continue;
      }

      const thumb = extractThumbnail(block) || 'https://images.unsplash.com/photo-1629654297299-c8506221ca97?w=800&auto=format&fit=crop&q=80';

      items.push(
        buildResourceItem({
          id: `phoronix-${Buffer.from(link).toString('base64').slice(0, 16)}`,
          title: `${title} [Linux Kernel & Hardware Benchmark]`,
          description: desc || 'In-depth Linux kernel development, open-source GPU drivers, Vulkan benchmarks, and hardware architecture reporting.',
          resourceUrl: link,
          downloadUrl: link,
          previewUrl: thumb,
          thumbnailUrl: thumb,
          category: 'code',
          providerId: 'phoronix_hardware',
          providerName: 'Phoronix Linux & Hardware Benchmarks',
          rawLicense: 'Phoronix Open Access',
          licenseUrl: link,
          providerDefaultLicense: {
            type: 'Open Access Tech Reporting',
            commercialAllowed: false,
            attributionRequired: true
          },
          attributes: {
            publisher: 'Phoronix Media',
            publishedAt: pubDate || new Date().toISOString(),
            tags: ['phoronix', 'linux', 'kernel', 'open-source', 'benchmarks', 'drivers']
          }
        })
      );
    }
    return items;
  } catch (err: any) {
    recordProviderFailure('phoronix_hardware', err.message);
    return [];
  }
}

// ============================================================================
// 14. Eurogamer Video Game Journalism & Industry Releases
// ============================================================================
export async function queryEurogamerFeed(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = 'https://www.eurogamer.net/feed';

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(5000)
    });

    if (!res.ok) throw new Error(`Eurogamer returned ${res.status}`);
    const xml = await res.text();
    const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
    recordProviderSuccess('eurogamer_feed', Date.now() - start);

    const items: ResourceItem[] = [];
    const lowerQ = query.trim().toLowerCase();
    const isGeneral = !lowerQ || ['games', 'game', 'gaming', 'eurogamer', 'review', 'nintendo', 'playstation', 'xbox', 'all'].includes(lowerQ);

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
      if (!isGeneral && !title.toLowerCase().includes(lowerQ) && !desc.toLowerCase().includes(lowerQ)) {
        continue;
      }

      const thumb = extractThumbnail(block) || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80';

      items.push(
        buildResourceItem({
          id: `eg-${Buffer.from(link).toString('base64').slice(0, 16)}`,
          title: `${title} [Video Game Dispatch]`,
          description: desc || 'In-depth video game reviews, technical digital foundry breakdowns, developer interviews, and console news from Eurogamer.',
          resourceUrl: link,
          downloadUrl: link,
          previewUrl: thumb,
          thumbnailUrl: thumb,
          category: 'games',
          providerId: 'eurogamer_feed',
          providerName: 'Eurogamer Video Game Wire',
          rawLicense: 'Eurogamer / Gamer Network Editorial',
          licenseUrl: link,
          providerDefaultLicense: {
            type: 'Editorial News Access',
            commercialAllowed: false,
            attributionRequired: true
          },
          attributes: {
            publisher: 'IGN Entertainment / Gamer Network',
            publishedAt: pubDate || new Date().toISOString(),
            tags: ['eurogamer', 'video-games', 'gaming-news', 'reviews', 'consoles']
          }
        })
      );
    }
    return items;
  } catch (err: any) {
    recordProviderFailure('eurogamer_feed', err.message);
    return [];
  }
}

// ============================================================================
// 15. Rock Paper Shotgun PC Gaming & Indie Analysis
// ============================================================================
export async function queryRockPaperShotgunFeed(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = 'https://www.rockpapershotgun.com/feed';

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(5000)
    });

    if (!res.ok) throw new Error(`RPS returned ${res.status}`);
    const xml = await res.text();
    const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
    recordProviderSuccess('rockpapershotgun_feed', Date.now() - start);

    const items: ResourceItem[] = [];
    const lowerQ = query.trim().toLowerCase();
    const isGeneral = !lowerQ || ['games', 'pc', 'indie', 'gaming', 'rpg', 'strategy', 'simulation', 'all'].includes(lowerQ);

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
      if (!isGeneral && !title.toLowerCase().includes(lowerQ) && !desc.toLowerCase().includes(lowerQ)) {
        continue;
      }

      const thumb = extractThumbnail(block) || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80';

      items.push(
        buildResourceItem({
          id: `rps-${Buffer.from(link).toString('base64').slice(0, 16)}`,
          title: `${title} [PC & Indie Gaming]`,
          description: desc || 'Thoughtful PC gaming criticism, indie recommendations, hardware reviews, and retrospective essays from Rock Paper Shotgun.',
          resourceUrl: link,
          downloadUrl: link,
          previewUrl: thumb,
          thumbnailUrl: thumb,
          category: 'games',
          providerId: 'rockpapershotgun_feed',
          providerName: 'Rock Paper Shotgun PC Gaming',
          rawLicense: 'RPS / Gamer Network Editorial',
          licenseUrl: link,
          providerDefaultLicense: {
            type: 'Editorial News Access',
            commercialAllowed: false,
            attributionRequired: true
          },
          attributes: {
            publisher: 'Rock Paper Shotgun / Gamer Network',
            publishedAt: pubDate || new Date().toISOString(),
            tags: ['rock-paper-shotgun', 'pc-gaming', 'indie-games', 'modding', 'rpg']
          }
        })
      );
    }
    return items;
  } catch (err: any) {
    recordProviderFailure('rockpapershotgun_feed', err.message);
    return [];
  }
}

// ============================================================================
// 16. WhereTheISS.at Real-Time Space Station Telemetry & Orbital Geolocation
// ============================================================================
export async function queryIssCurrentLocation(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = 'https://api.wheretheiss.at/v1/satellites/25544';

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000)
    });

    if (!res.ok) throw new Error(`WhereTheISS returned ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('iss_current_location', Date.now() - start);

    const lat = Number(data.latitude || 0).toFixed(4);
    const lon = Number(data.longitude || 0).toFixed(4);
    const alt = Number(data.altitude || 0).toFixed(2);
    const vel = Number(data.velocity || 0).toFixed(2);
    const visibility = data.visibility || 'daylight';
    const timeStr = new Date(data.timestamp * 1000).toUTCString();

    const thumb = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80';
    const mapUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=4/${lat}/${lon}`;

    return [
      buildResourceItem({
        id: `iss-telemetry-${data.timestamp}`,
        title: `International Space Station (ISS) Live Coordinates: ${lat}°, ${lon}° [Alt: ${alt} km]`,
        category: 'maps',
        description: `Live astrometric telemetry from NORAD #25544 (ISS). Current Velocity: ${vel} km/h, Altitude: ${alt} km above Earth. Solar Visibility State: ${visibility}. Timestamp: ${timeStr}.`,
        resourceUrl: mapUrl,
        downloadUrl: mapUrl,
        previewUrl: thumb,
        thumbnailUrl: thumb,
        providerId: 'iss_current_location',
        providerName: 'WhereTheISS.at Real-Time Telemetry',
        rawLicense: 'Open Satellite Data / NASA Public Domain',
        licenseUrl: 'https://wheretheiss.at/',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          latitude: Number(lat),
          longitude: Number(lon),
          elevation: Number(alt),
          publisher: 'WhereTheISS.at & NASA Flight Dynamics',
          isLiveTelemetry: true,
          tags: ['iss', 'space-station', 'telemetry', 'orbital-mechanics', 'nasa', 'real-time', 'astrometry']
        }
      })
    ];
  } catch (err: any) {
    recordProviderFailure('iss_current_location', err.message);
    return [];
  }
}

// ============================================================================
// 17. CoinPaprika Global Cryptocurrency & Asset Index
// ============================================================================
export async function queryCoinPaprikaCrypto(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'btc';
  const url = `https://api.coinpaprika.com/v1/search?q=${encodeURIComponent(cleanQ)}&c=currencies`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000)
    });

    if (!res.ok) throw new Error(`CoinPaprika returned ${res.status}`);
    const data = await res.json();
    const list: any[] = data.currencies || [];
    recordProviderSuccess('coinpaprika_crypto', Date.now() - start);

    return list.slice(0, 10).map((coin: any) => {
      const name = coin.name || 'Crypto Asset';
      const symbol = coin.symbol || 'COIN';
      const rank = coin.rank || 'N/A';
      const isActive = coin.is_active ? 'Active Trading' : 'Inactive';
      const coinUrl = `https://coinpaprika.com/coin/${coin.id}/`;
      const thumb = 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=800&auto=format&fit=crop&q=80';

      return buildResourceItem({
        id: `cp-${coin.id}`,
        title: `${name} (${symbol}) [Market Rank #${rank}]`,
        category: 'finance',
        description: `Cryptographic token asset listing for ${name} (${symbol}). Market Rank: #${rank}. Network Status: ${isActive}. Market capitalization and order book intelligence from CoinPaprika Global Index.`,
        resourceUrl: coinUrl,
        downloadUrl: coinUrl,
        previewUrl: thumb,
        thumbnailUrl: thumb,
        providerId: 'coinpaprika_crypto',
        providerName: 'CoinPaprika Global Crypto Index',
        rawLicense: 'CoinPaprika Public Market Data',
        licenseUrl: 'https://coinpaprika.com/api/',
        providerDefaultLicense: {
          type: 'Public Market Data Access',
          commercialAllowed: true,
          attributionRequired: true
        },
        attributes: {
          symbol,
          rank: coin.rank,
          isActive: coin.is_active,
          publisher: 'CoinPaprika Research & Analytics',
          tags: ['crypto', 'cryptocurrency', 'blockchain', 'finance', 'markets', 'tokens', 'fintech']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('coinpaprika_crypto', err.message);
    return [];
  }
}

// ============================================================================
// 18. Historic US Patent Blueprints & Invention Schematics
// ============================================================================
export async function queryArchivePatentDiagrams(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'patent';
  const searchQuery = `mediatype:image AND ("patent drawing" OR "us patent" OR "patent office" OR "invention blueprint") AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,date,downloads&sort[]=downloads desc&rows=14&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_historical_patent_diagrams', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;

      return buildResourceItem({
        id: `ia-patent-${id}`,
        title: `${title} [Historic Patent Blueprint & Schematic]`,
        category: 'knowledge',
        description: `Official historical patent schematic and mechanical blueprint registered with the United States Patent & Trademark Office. Preserved engineering schematics of landmark industrial inventions.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: thumb,
        providerId: 'archive_historical_patent_diagrams',
        providerName: 'Historic US Patent Blueprints & Schematics',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: doc.creator || 'US Patent Office Inventor',
        rawLicense: 'US Government Work / Public Domain',
        licenseUrl: 'https://archive.org/',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          date: doc.date,
          tags: ['patent', 'blueprint', 'invention', 'schematic', 'engineering', 'industrial-revolution']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_historical_patent_diagrams', err.message);
    return [];
  }
}

// ============================================================================
// 19. Early Acoustic Delta & Country Blues 78 RPM Recordings
// ============================================================================
export async function queryArchiveEarlyBlues(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'blues';
  const searchQuery = `mediatype:audio AND ("delta blues" OR "acoustic blues" OR "country blues" OR "slide guitar") AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,year,downloads&sort[]=downloads desc&rows=14&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_early_recorded_blues', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;
      const audioUrl = `https://archive.org/download/${id}/${id}.mp3`;

      return buildResourceItem({
        id: `ia-blues-${id}`,
        title: `${title} [Historic Delta Blues 78 RPM]`,
        category: 'audio',
        description: `Pioneering early 20th century American acoustic blues recording from original 78 RPM shellac discs. Features bottleneck slide guitar, field hollers, and Mississippi Delta roots music.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: audioUrl,
        providerId: 'archive_early_recorded_blues',
        providerName: 'Early Acoustic Delta & Country Blues Vault',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: doc.creator || 'Delta Blues Pioneer',
        rawLicense: 'Historical Sound Preservation / Public Domain',
        licenseUrl: 'https://archive.org/details/georgeblood',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'mp3',
          isStreamable: true,
          year: doc.year,
          tags: ['delta-blues', 'acoustic-blues', '78rpm', 'country-blues', 'slide-guitar', 'american-roots']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_early_recorded_blues', err.message);
    return [];
  }
}

// ============================================================================
// 20. Vintage World War Lithographic Propaganda Posters
// ============================================================================
export async function queryArchiveWorldWarPosters(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'poster';
  const searchQuery = `mediatype:image AND ("war poster" OR "propaganda poster" OR "wwi poster" OR "wwii poster") AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,date,downloads&sort[]=downloads desc&rows=14&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_world_war_posters', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;

      return buildResourceItem({
        id: `ia-wwposter-${id}`,
        title: `${title} [Vintage Historical Lithographic Poster]`,
        category: 'art',
        description: `Rare historic lithographic war bond, civil defense, and mobilization propaganda poster from World War I and II. Iconic graphic design and visual rhetoric from national archives.`,
        thumbnailUrl: thumb,
        previewUrl: itemUrl,
        downloadUrl: thumb,
        providerId: 'archive_world_war_posters',
        providerName: 'Vintage World War Lithographic Posters',
        resourceUrl: itemUrl,
        externalId: id,
        creatorName: doc.creator || 'Government Printing Office / War Artists',
        rawLicense: 'Public Domain / Historic Government Work',
        licenseUrl: 'https://archive.org/',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          date: doc.date,
          tags: ['vintage-poster', 'lithograph', 'world-war', 'propaganda-art', 'graphic-design', 'history']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_world_war_posters', err.message);
    return [];
  }
}
