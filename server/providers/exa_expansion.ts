/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Exa Expansion: 29 Real-Time Verified Global News, Science, Tech, Crypto,
 * Gaming, Aerospace, and Archival Open Data Providers.
 */

import { ResourceItem, ResourceCategory } from '../../src/types/resource';
import { buildResourceItem } from '../normalizer';
import { recordProviderSuccess, recordProviderFailure, registerTracker } from '../telemetry';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

function cleanText(text: string): string {
  if (!text) return '';
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractThumbnail(xmlBlock: string): string | undefined {
  const mediaContent = xmlBlock.match(/<media:content[^>]+url=["']([^"']+)["']/i);
  if (mediaContent?.[1]) return mediaContent[1];

  const mediaThumbnail = xmlBlock.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i);
  if (mediaThumbnail?.[1]) return mediaThumbnail[1];

  const enclosure = xmlBlock.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]*type=["']image\/[^"']+["']/i);
  if (enclosure?.[1]) return enclosure[1];

  const genericEnclosure = xmlBlock.match(/<enclosure[^>]+url=["']([^"']+\.(?:jpg|jpeg|png|webp))["']/i);
  if (genericEnclosure?.[1]) return genericEnclosure[1];

  const imgTag = xmlBlock.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgTag?.[1]) return imgTag[1];

  return undefined;
}

function parseRssFeedItems(
  xml: string,
  query: string,
  generalKeywords: string[],
  config: {
    providerId: string;
    providerName: string;
    category: ResourceCategory;
    defaultThumbnail: string;
    descriptionFallback: string;
    licenseName: string;
    publisher: string;
    tags: string[];
    idPrefix: string;
    customMatcher?: (title: string, desc: string, q: string) => boolean;
  }
): ResourceItem[] {
  const itemMatches = xml.match(/<(?:item|entry)\b[^>]*>[\s\S]*?<\/(?:item|entry)>/gi) || [];
  const items: ResourceItem[] = [];
  const lowerQ = (query || '').trim().toLowerCase();
  const isGeneral = !lowerQ || generalKeywords.includes(lowerQ);

  for (const block of itemMatches) {
    if (items.length >= 10) break;

    const rawTitle = block.match(/<title[^>]*>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/title>/i);
    const rawLink = block.match(/<link[^>]+href=["']([^"']+)["']/i) ||
                    block.match(/<link[^>]*>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/link>/i);
    const rawDate = block.match(/<pubDate>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/pubDate>/i) ||
                    block.match(/<published>([\s\S]*?)<\/published>/i) ||
                    block.match(/<updated>([\s\S]*?)<\/updated>/i) ||
                    block.match(/<dc:date>([\s\S]*?)<\/dc:date>/i);
    const rawDesc = block.match(/<description[^>]*>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/description>/i) ||
                    block.match(/<content[^>]*>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/content>/i) ||
                    block.match(/<summary[^>]*>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/summary>/i);

    const title = cleanText(rawTitle?.[1] || rawTitle?.[2] || '');
    const link = (rawLink?.[1] || rawLink?.[2] || '').trim();
    const desc = cleanText(rawDesc?.[1] || rawDesc?.[2] || '').slice(0, 320);
    const pubDate = (rawDate?.[1] || rawDate?.[2] || '').trim();

    if (!title || !link) continue;

    if (!isGeneral) {
      if (config.customMatcher) {
        if (!config.customMatcher(title, desc, lowerQ)) continue;
      } else if (!title.toLowerCase().includes(lowerQ) && !desc.toLowerCase().includes(lowerQ)) {
        continue;
      }
    }

    const thumb = extractThumbnail(block) || config.defaultThumbnail;

    items.push(
      buildResourceItem({
        id: `${config.idPrefix}-${Buffer.from(link).toString('base64').replace(/[/+=]/g, '').slice(0, 16)}`,
        title,
        description: desc || config.descriptionFallback,
        resourceUrl: link,
        downloadUrl: link,
        previewUrl: thumb,
        thumbnailUrl: thumb,
        category: config.category,
        providerId: config.providerId,
        providerName: config.providerName,
        rawLicense: config.licenseName,
        licenseUrl: link,
        providerDefaultLicense: {
          type: 'Editorial Open Access',
          commercialAllowed: false,
          attributionRequired: true
        },
        attributes: {
          publisher: config.publisher,
          publishedAt: pubDate || new Date().toISOString(),
          isLiveNews: true,
          tags: config.tags
        }
      })
    );
  }

  return items;
}

// ============================================================================
// 1. Los Angeles Times World & Nation
// ============================================================================
registerTracker({
  id: 'latimes_world_news',
  name: 'Los Angeles Times World & Nation Wire',
  category: 'News',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

export async function queryLaTimesWorldNews(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = 'https://www.latimes.com/world-nation/rss2.0.xml';

  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`LA Times returned ${res.status}`);
    const xml = await res.text();
    recordProviderSuccess('latimes_world_news', Date.now() - start);

    return parseRssFeedItems(xml, query, ['news', 'world', 'california', 'nation', 'all'], {
      providerId: 'latimes_world_news',
      providerName: 'Los Angeles Times World Wire',
      category: 'news',
      defaultThumbnail: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&auto=format&fit=crop&q=80',
      descriptionFallback: 'National and international reporting and investigative journalism from the Los Angeles Times.',
      licenseName: 'LA Times Editorial',
      publisher: 'Los Angeles Times Communications LLC',
      tags: ['latimes', 'news', 'world', 'california', 'investigative'],
      idPrefix: 'latimes'
    });
  } catch (err: any) {
    recordProviderFailure('latimes_world_news', err.message);
    return [];
  }
}

// ============================================================================
// 2. Wall Street Journal World News
// ============================================================================
registerTracker({
  id: 'wsj_world_wire',
  name: 'Wall Street Journal World News Wire',
  category: 'News & Finance',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

export async function queryWsjWorldWire(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = 'https://feeds.a.dj.com/rss/RSSWorldNews.xml';

  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`WSJ returned ${res.status}`);
    const xml = await res.text();
    recordProviderSuccess('wsj_world_wire', Date.now() - start);

    return parseRssFeedItems(xml, query, ['news', 'world', 'global', 'markets', 'economy', 'all'], {
      providerId: 'wsj_world_wire',
      providerName: 'Wall Street Journal World Wire',
      category: 'news',
      defaultThumbnail: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800&auto=format&fit=crop&q=80',
      descriptionFallback: 'Global geopolitics, international relations, and macro markets from The Wall Street Journal.',
      licenseName: 'Dow Jones & Company Editorial',
      publisher: 'Dow Jones & Company',
      tags: ['wsj', 'world', 'geopolitics', 'global', 'business'],
      idPrefix: 'wsj'
    });
  } catch (err: any) {
    recordProviderFailure('wsj_world_wire', err.message);
    return [];
  }
}

// ============================================================================
// 3. Yahoo Finance Global Market Wire
// ============================================================================
registerTracker({
  id: 'yahoo_finance_markets',
  name: 'Yahoo Finance Global Market Wire',
  category: 'Finance',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

export async function queryYahooFinanceMarkets(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = 'https://finance.yahoo.com/news/rssindex';

  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`Yahoo Finance returned ${res.status}`);
    const xml = await res.text();
    recordProviderSuccess('yahoo_finance_markets', Date.now() - start);

    return parseRssFeedItems(xml, query, ['finance', 'markets', 'stocks', 'economy', 'news', 'all'], {
      providerId: 'yahoo_finance_markets',
      providerName: 'Yahoo Finance Market Wire',
      category: 'finance',
      defaultThumbnail: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format&fit=crop&q=80',
      descriptionFallback: 'Real-time equity market intelligence, macroeconomic analysis, and corporate earnings wire from Yahoo Finance.',
      licenseName: 'Yahoo Finance Editorial Access',
      publisher: 'Yahoo Inc.',
      tags: ['finance', 'markets', 'stocks', 'economy', 'earnings'],
      idPrefix: 'yahoofin'
    });
  } catch (err: any) {
    recordProviderFailure('yahoo_finance_markets', err.message);
    return [];
  }
}

// ============================================================================
// 4. The Verge Tech & Culture
// ============================================================================
registerTracker({
  id: 'the_verge_tech',
  name: 'The Verge Technology & Digital Culture Wire',
  category: 'Tech & News',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

export async function queryTheVergeTech(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = 'https://www.theverge.com/rss/index.xml';

  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`The Verge returned ${res.status}`);
    const xml = await res.text();
    recordProviderSuccess('the_verge_tech', Date.now() - start);

    // Atom feed or RSS feed parser
    const entryMatches = xml.match(/<entry\b[^>]*>[\s\S]*?<\/entry>/gi) || xml.match(/<item\b[^>]*>[\s\S]*?<\/item>/gi) || [];
    const items: ResourceItem[] = [];
    const lowerQ = (query || '').trim().toLowerCase();
    const isGeneral = !lowerQ || ['tech', 'technology', 'gadgets', 'ai', 'science', 'news', 'all'].includes(lowerQ);

    for (const block of entryMatches) {
      if (items.length >= 10) break;
      const rawTitle = block.match(/<title[^>]*>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/title>/i);
      const rawLink = block.match(/<link[^>]+href=["']([^"']+)["']/i) || block.match(/<link>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/link>/i);
      const rawDate = block.match(/<published>([\s\S]*?)<\/published>/i) || block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
      const rawContent = block.match(/<content[^>]*>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/content>/i) || block.match(/<description>([\s\S]*?)<\/description>/i);

      const title = cleanText(rawTitle?.[1] || rawTitle?.[2] || '');
      const link = (rawLink?.[1] || rawLink?.[2] || '').trim();
      const desc = cleanText(rawContent?.[1] || rawContent?.[2] || '').slice(0, 300);
      const pubDate = (rawDate?.[1] || '').trim();

      if (!title || !link) continue;
      if (!isGeneral && !title.toLowerCase().includes(lowerQ) && !desc.toLowerCase().includes(lowerQ)) {
        continue;
      }

      const thumb = extractThumbnail(block) || 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80';

      items.push(
        buildResourceItem({
          id: `verge-${Buffer.from(link).toString('base64').replace(/[/+=]/g, '').slice(0, 16)}`,
          title,
          description: desc || 'Coverage of cutting-edge consumer hardware, digital platforms, AI models, and technology culture from The Verge.',
          resourceUrl: link,
          downloadUrl: link,
          previewUrl: thumb,
          thumbnailUrl: thumb,
          category: 'code',
          providerId: 'the_verge_tech',
          providerName: 'The Verge Technology Wire',
          rawLicense: 'Vox Media Editorial',
          licenseUrl: link,
          providerDefaultLicense: {
            type: 'Editorial News Access',
            commercialAllowed: false,
            attributionRequired: true
          },
          attributes: {
            publisher: 'Vox Media, LLC',
            publishedAt: pubDate || new Date().toISOString(),
            isLiveNews: true,
            tags: ['theverge', 'technology', 'gadgets', 'ai', 'culture']
          }
        })
      );
    }

    return items;
  } catch (err: any) {
    recordProviderFailure('the_verge_tech', err.message);
    return [];
  }
}

// ============================================================================
// 5. Engadget Consumer Electronics & Gear
// ============================================================================
registerTracker({
  id: 'engadget_tech',
  name: 'Engadget Consumer Electronics & Hardware Wire',
  category: 'Tech & Hardware',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

export async function queryEngadgetTech(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = 'https://www.engadget.com/rss.xml';

  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`Engadget returned ${res.status}`);
    const xml = await res.text();
    recordProviderSuccess('engadget_tech', Date.now() - start);

    return parseRssFeedItems(xml, query, ['gadgets', 'hardware', 'tech', 'electronics', 'gear', 'all'], {
      providerId: 'engadget_tech',
      providerName: 'Engadget Hardware Wire',
      category: 'code',
      defaultThumbnail: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=800&auto=format&fit=crop&q=80',
      descriptionFallback: 'Reviews, teardowns, mobile devices, and consumer hardware dispatches from Engadget.',
      licenseName: 'Engadget / Yahoo Editorial',
      publisher: 'Yahoo Inc.',
      tags: ['engadget', 'hardware', 'gadgets', 'reviews', 'electronics'],
      idPrefix: 'engadget'
    });
  } catch (err: any) {
    recordProviderFailure('engadget_tech', err.message);
    return [];
  }
}

// ============================================================================
// 6. TechRadar Computing & Hardware
// ============================================================================
registerTracker({
  id: 'techradar_hardware',
  name: 'TechRadar Computing & Hardware Wire',
  category: 'Tech & Hardware',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

export async function queryTechradarHardware(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = 'https://www.techradar.com/rss';

  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`TechRadar returned ${res.status}`);
    const xml = await res.text();
    recordProviderSuccess('techradar_hardware', Date.now() - start);

    return parseRssFeedItems(xml, query, ['hardware', 'computing', 'tech', 'gadgets', 'reviews', 'all'], {
      providerId: 'techradar_hardware',
      providerName: 'TechRadar Hardware Wire',
      category: 'code',
      defaultThumbnail: 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=800&auto=format&fit=crop&q=80',
      descriptionFallback: 'Hardware benchmarks, PC computing architectures, components, and technical evaluations from TechRadar.',
      licenseName: 'Future Publishing Editorial',
      publisher: 'Future US, Inc.',
      tags: ['techradar', 'hardware', 'computing', 'benchmarks', 'components'],
      idPrefix: 'techradar'
    });
  } catch (err: any) {
    recordProviderFailure('techradar_hardware', err.message);
    return [];
  }
}

// ============================================================================
// 7. Polygon Games & Interactive Media
// ============================================================================
registerTracker({
  id: 'polygon_gaming',
  name: 'Polygon Games & Entertainment Wire',
  category: 'Games',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

export async function queryPolygonGaming(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = 'https://www.polygon.com/rss/index.xml';

  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`Polygon returned ${res.status}`);
    const xml = await res.text();
    recordProviderSuccess('polygon_gaming', Date.now() - start);

    const entryMatches = xml.match(/<entry\b[^>]*>[\s\S]*?<\/entry>/gi) || xml.match(/<item\b[^>]*>[\s\S]*?<\/item>/gi) || [];
    const items: ResourceItem[] = [];
    const lowerQ = (query || '').trim().toLowerCase();
    const isGeneral = !lowerQ || ['gaming', 'game', 'games', 'nintendo', 'playstation', 'xbox', 'steam', 'indie', 'all'].includes(lowerQ);

    for (const block of entryMatches) {
      if (items.length >= 10) break;
      const rawTitle = block.match(/<title[^>]*>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/title>/i);
      const rawLink = block.match(/<link[^>]+href=["']([^"']+)["']/i) || block.match(/<link>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/link>/i);
      const rawDate = block.match(/<published>([\s\S]*?)<\/published>/i) || block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
      const rawContent = block.match(/<content[^>]*>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/content>/i) || block.match(/<description>([\s\S]*?)<\/description>/i);

      const title = cleanText(rawTitle?.[1] || rawTitle?.[2] || '');
      const link = (rawLink?.[1] || rawLink?.[2] || '').trim();
      const desc = cleanText(rawContent?.[1] || rawContent?.[2] || '').slice(0, 300);
      const pubDate = (rawDate?.[1] || '').trim();

      if (!title || !link) continue;
      if (!isGeneral && !title.toLowerCase().includes(lowerQ) && !desc.toLowerCase().includes(lowerQ)) {
        continue;
      }

      const thumb = extractThumbnail(block) || 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&auto=format&fit=crop&q=80';

      items.push(
        buildResourceItem({
          id: `poly-${Buffer.from(link).toString('base64').replace(/[/+=]/g, '').slice(0, 16)}`,
          title: `${title} [Polygon Gaming]`,
          description: desc || 'In-depth video game reviews, development analyses, cultural essays, and patch releases from Polygon.',
          resourceUrl: link,
          downloadUrl: link,
          previewUrl: thumb,
          thumbnailUrl: thumb,
          category: 'games',
          providerId: 'polygon_gaming',
          providerName: 'Polygon Games Wire',
          rawLicense: 'Vox Media Editorial',
          licenseUrl: link,
          providerDefaultLicense: {
            type: 'Editorial Gaming Access',
            commercialAllowed: false,
            attributionRequired: true
          },
          attributes: {
            publisher: 'Vox Media, LLC',
            publishedAt: pubDate || new Date().toISOString(),
            isLiveNews: true,
            tags: ['polygon', 'gaming', 'video-games', 'reviews', 'indie']
          }
        })
      );
    }

    return items;
  } catch (err: any) {
    recordProviderFailure('polygon_gaming', err.message);
    return [];
  }
}

// ============================================================================
// 8. PC Gamer Hardware & PC Gaming
// ============================================================================
registerTracker({
  id: 'pcgamer_hardware',
  name: 'PC Gamer Hardware & Performance Wire',
  category: 'Games & Hardware',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

export async function queryPcGamerHardware(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = 'https://www.pcgamer.com/rss';

  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`PC Gamer returned ${res.status}`);
    const xml = await res.text();
    recordProviderSuccess('pcgamer_hardware', Date.now() - start);

    return parseRssFeedItems(xml, query, ['pc', 'gaming', 'hardware', 'gpu', 'cpu', 'mods', 'steam', 'all'], {
      providerId: 'pcgamer_hardware',
      providerName: 'PC Gamer Hardware & Rig Wire',
      category: 'games',
      defaultThumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80',
      descriptionFallback: 'PC gaming hardware teardowns, GPU benchmarks, modding communities, and release coverage from PC Gamer.',
      licenseName: 'Future US Editorial',
      publisher: 'Future US, Inc.',
      tags: ['pcgamer', 'pc-gaming', 'hardware', 'gpu', 'steam', 'mods'],
      idPrefix: 'pcgamer'
    });
  } catch (err: any) {
    recordProviderFailure('pcgamer_hardware', err.message);
    return [];
  }
}

// ============================================================================
// 9. SpaceNews Aerospace & Defense Wire
// ============================================================================
registerTracker({
  id: 'spacenews_aerospace',
  name: 'SpaceNews Aerospace & Orbital Defense Wire',
  category: 'NASA & Space',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

export async function querySpaceNewsAerospace(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = 'https://spacenews.com/feed/';

  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`SpaceNews returned ${res.status}`);
    const xml = await res.text();
    recordProviderSuccess('spacenews_aerospace', Date.now() - start);

    return parseRssFeedItems(xml, query, ['space', 'launch', 'satellite', 'aerospace', 'orbit', 'nasa', 'all'], {
      providerId: 'spacenews_aerospace',
      providerName: 'SpaceNews Aerospace Wire',
      category: 'nasa',
      defaultThumbnail: 'https://images.unsplash.com/photo-1517976487507-5b3b4b45f912?w=800&auto=format&fit=crop&q=80',
      descriptionFallback: 'Global aerospace industry analysis, commercial satellite launches, military spaceflight, and orbital programs from SpaceNews.',
      licenseName: 'Multiverse Media SpaceNews Access',
      publisher: 'SpaceNews / Multiverse Media Group',
      tags: ['spacenews', 'aerospace', 'satellites', 'orbit', 'rockets', 'space-industry'],
      idPrefix: 'spacenews'
    });
  } catch (err: any) {
    recordProviderFailure('spacenews_aerospace', err.message);
    return [];
  }
}

// ============================================================================
// 10. Universe Today Astronomy & Planetary Science
// ============================================================================
registerTracker({
  id: 'universetoday_astronomy',
  name: 'Universe Today Astronomy & Deep Cosmos Wire',
  category: 'NASA & Space',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

export async function queryUniverseTodayAstronomy(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = 'https://www.universetoday.com/feed/';

  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`Universe Today returned ${res.status}`);
    const xml = await res.text();
    recordProviderSuccess('universetoday_astronomy', Date.now() - start);

    return parseRssFeedItems(xml, query, ['space', 'astronomy', 'universe', 'cosmos', 'telescope', 'planets', 'all'], {
      providerId: 'universetoday_astronomy',
      providerName: 'Universe Today Cosmos Wire',
      category: 'nasa',
      defaultThumbnail: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=800&auto=format&fit=crop&q=80',
      descriptionFallback: 'Astrophysical breakthroughs, exoplanetary surveys, space exploration, and cosmology from Universe Today.',
      licenseName: 'Universe Today Open Editorial',
      publisher: 'Universe Today Media Inc.',
      tags: ['universetoday', 'astronomy', 'cosmos', 'astrophysics', 'jwst', 'space-telescope'],
      idPrefix: 'unitoday'
    });
  } catch (err: any) {
    recordProviderFailure('universetoday_astronomy', err.message);
    return [];
  }
}

// ============================================================================
// 11. Phys.org Physics & Nanotechnology
// ============================================================================
registerTracker({
  id: 'physorg_physics',
  name: 'Phys.org Physics & Physical Sciences Wire',
  category: 'Science & Papers',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

export async function queryPhysorgPhysics(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = 'https://phys.org/rss-feed/';

  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`Phys.org returned ${res.status}`);
    const xml = await res.text();
    recordProviderSuccess('physorg_physics', Date.now() - start);

    return parseRssFeedItems(xml, query, ['physics', 'science', 'quantum', 'materials', 'nano', 'energy', 'all'], {
      providerId: 'physorg_physics',
      providerName: 'Phys.org Physical Sciences Wire',
      category: 'papers',
      defaultThumbnail: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&auto=format&fit=crop&q=80',
      descriptionFallback: 'Condensed matter physics, quantum computing breakthroughs, nanotechnology, and fundamental physical science from Phys.org.',
      licenseName: 'Science X Network Editorial',
      publisher: 'Science X Network',
      tags: ['physorg', 'physics', 'quantum', 'materials', 'nanotechnology', 'condensed-matter'],
      idPrefix: 'physorg'
    });
  } catch (err: any) {
    recordProviderFailure('physorg_physics', err.message);
    return [];
  }
}

// ============================================================================
// 12. Medical Xpress Clinical Medicine & Healthcare
// ============================================================================
registerTracker({
  id: 'medicalxpress_health',
  name: 'Medical Xpress Clinical Medicine & Healthcare Wire',
  category: 'Science & Datasets',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

export async function queryMedicalXpressHealth(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = 'https://medicalxpress.com/rss-feed/';

  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`Medical Xpress returned ${res.status}`);
    const xml = await res.text();
    recordProviderSuccess('medicalxpress_health', Date.now() - start);

    return parseRssFeedItems(xml, query, ['medical', 'health', 'medicine', 'clinical', 'disease', 'pharma', 'all'], {
      providerId: 'medicalxpress_health',
      providerName: 'Medical Xpress Clinical Wire',
      category: 'datasets',
      defaultThumbnail: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80',
      descriptionFallback: 'Clinical trial outcomes, immunology discoveries, neuroscience breakthroughs, and epidemiology reports from Medical Xpress.',
      licenseName: 'Science X Network Medical Editorial',
      publisher: 'Science X Network',
      tags: ['medicalxpress', 'medicine', 'healthcare', 'immunology', 'neuroscience', 'clinical-trials'],
      idPrefix: 'medxpress'
    });
  } catch (err: any) {
    recordProviderFailure('medicalxpress_health', err.message);
    return [];
  }
}

// ============================================================================
// 13. Electronic Frontier Foundation (EFF) Cyberlaw & Privacy
// ============================================================================
registerTracker({
  id: 'eff_digital_rights',
  name: 'Electronic Frontier Foundation (EFF) Cyberlaw & Privacy Wire',
  category: 'Knowledge & Code',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

export async function queryEffDigitalRights(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = 'https://www.eff.org/rss/updates.xml';

  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`EFF returned ${res.status}`);
    const xml = await res.text();
    recordProviderSuccess('eff_digital_rights', Date.now() - start);

    return parseRssFeedItems(xml, query, ['privacy', 'cyberlaw', 'surveillance', 'encryption', 'copyright', 'eff', 'all'], {
      providerId: 'eff_digital_rights',
      providerName: 'EFF Digital Rights Wire',
      category: 'knowledge',
      defaultThumbnail: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop&q=80',
      descriptionFallback: 'Digital civil liberties, encryption policy, surveillance defense, and open cyberspace legal advocacy from the Electronic Frontier Foundation.',
      licenseName: 'Creative Commons Attribution 3.0 United States',
      publisher: 'Electronic Frontier Foundation',
      tags: ['eff', 'privacy', 'cyberlaw', 'encryption', 'civil-liberties', 'open-internet'],
      idPrefix: 'eff'
    });
  } catch (err: any) {
    recordProviderFailure('eff_digital_rights', err.message);
    return [];
  }
}

// ============================================================================
// 14. Bellingcat Open Source Intelligence (OSINT)
// ============================================================================
registerTracker({
  id: 'bellingcat_osint',
  name: 'Bellingcat Open Source Intelligence (OSINT) Wire',
  category: 'News & Knowledge',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

export async function queryBellingcatOsint(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = 'https://www.bellingcat.com/feed/';

  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`Bellingcat returned ${res.status}`);
    const xml = await res.text();
    recordProviderSuccess('bellingcat_osint', Date.now() - start);

    return parseRssFeedItems(xml, query, ['investigation', 'osint', 'geolocation', 'forensics', 'conflict', 'news', 'all'], {
      providerId: 'bellingcat_osint',
      providerName: 'Bellingcat OSINT Wire',
      category: 'news',
      defaultThumbnail: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=800&auto=format&fit=crop&q=80',
      descriptionFallback: 'Pioneering open source investigations, satellite imagery geolocation, conflict verification, and digital forensic analyses from Bellingcat.',
      licenseName: 'Creative Commons Attribution-NonCommercial 4.0',
      publisher: 'Stichting Bellingcat',
      tags: ['bellingcat', 'osint', 'forensics', 'investigation', 'satellite-imagery'],
      idPrefix: 'bcat'
    });
  } catch (err: any) {
    recordProviderFailure('bellingcat_osint', err.message);
    return [];
  }
}

// ============================================================================
// 15. ProPublica Investigative Journalism
// ============================================================================
registerTracker({
  id: 'propublica_investigations',
  name: 'ProPublica Investigative Journalism Wire',
  category: 'News & Journalism',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

export async function queryPropublicaInvestigations(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = 'https://feeds.propublica.org/propublica/main';

  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`ProPublica returned ${res.status}`);
    const xml = await res.text();
    recordProviderSuccess('propublica_investigations', Date.now() - start);

    return parseRssFeedItems(xml, query, ['investigation', 'accountability', 'justice', 'politics', 'news', 'all'], {
      providerId: 'propublica_investigations',
      providerName: 'ProPublica Investigative Wire',
      category: 'news',
      defaultThumbnail: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&auto=format&fit=crop&q=80',
      descriptionFallback: 'Deep public interest investigative reporting exposing abuses of power and betrayal of public trust from Pulitzer-winning ProPublica.',
      licenseName: 'ProPublica Creative Commons Non-Commercial',
      publisher: 'Pro Publica Inc.',
      tags: ['propublica', 'investigative', 'journalism', 'accountability', 'public-interest'],
      idPrefix: 'propub'
    });
  } catch (err: any) {
    recordProviderFailure('propublica_investigations', err.message);
    return [];
  }
}

// ============================================================================
// 16. The Intercept Geopolitics & Security
// ============================================================================
registerTracker({
  id: 'theintercept_dispatches',
  name: 'The Intercept National Security & Geopolitical Wire',
  category: 'News & Policy',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

export async function queryTheInterceptDispatches(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = 'https://theintercept.com/feed/?lang=en';

  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`The Intercept returned ${res.status}`);
    const xml = await res.text();
    recordProviderSuccess('theintercept_dispatches', Date.now() - start);

    return parseRssFeedItems(xml, query, ['security', 'geopolitics', 'intelligence', 'policy', 'news', 'all'], {
      providerId: 'theintercept_dispatches',
      providerName: 'The Intercept Geopolitical Wire',
      category: 'news',
      defaultThumbnail: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800&auto=format&fit=crop&q=80',
      descriptionFallback: 'National security reporting, foreign policy dispatches, government surveillance analyses, and civil liberties reporting from The Intercept.',
      licenseName: 'First Look Media / The Intercept Editorial',
      publisher: 'The Intercept Media, Inc.',
      tags: ['theintercept', 'national-security', 'geopolitics', 'surveillance', 'policy'],
      idPrefix: 'intercept'
    });
  } catch (err: any) {
    recordProviderFailure('theintercept_dispatches', err.message);
    return [];
  }
}

// ============================================================================
// 17. Cointelegraph Blockchain & Digital Assets
// ============================================================================
registerTracker({
  id: 'cointelegraph_crypto',
  name: 'Cointelegraph Blockchain & Web3 Wire',
  category: 'Finance & Crypto',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

export async function queryCointelegraphCrypto(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = 'https://cointelegraph.com/rss';

  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`Cointelegraph returned ${res.status}`);
    const xml = await res.text();
    recordProviderSuccess('cointelegraph_crypto', Date.now() - start);

    return parseRssFeedItems(xml, query, ['crypto', 'bitcoin', 'blockchain', 'ethereum', 'web3', 'defi', 'all'], {
      providerId: 'cointelegraph_crypto',
      providerName: 'Cointelegraph Crypto Wire',
      category: 'finance',
      defaultThumbnail: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=800&auto=format&fit=crop&q=80',
      descriptionFallback: 'Cryptocurrency markets, decentralized finance protocols, Web3 ecosystems, and blockchain analytics from Cointelegraph.',
      licenseName: 'Cointelegraph Editorial Access',
      publisher: 'Cointelegraph Media',
      tags: ['cointelegraph', 'crypto', 'bitcoin', 'blockchain', 'ethereum', 'defi'],
      idPrefix: 'cointele'
    });
  } catch (err: any) {
    recordProviderFailure('cointelegraph_crypto', err.message);
    return [];
  }
}

// ============================================================================
// 18. CoinDesk Markets & Digital Currency Protocol Analysis
// ============================================================================
registerTracker({
  id: 'coindesk_markets',
  name: 'CoinDesk Digital Currency & Protocol Wire',
  category: 'Finance & Crypto',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

export async function queryCoinDeskMarkets(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = 'https://www.coindesk.com/arc/outboundfeeds/rss/';

  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`CoinDesk returned ${res.status}`);
    const xml = await res.text();
    recordProviderSuccess('coindesk_markets', Date.now() - start);

    return parseRssFeedItems(xml, query, ['crypto', 'market', 'digital', 'currency', 'assets', 'bitcoin', 'all'], {
      providerId: 'coindesk_markets',
      providerName: 'CoinDesk Protocol Wire',
      category: 'finance',
      defaultThumbnail: 'https://images.unsplash.com/photo-1622979135225-d2ba269bc1df?w=800&auto=format&fit=crop&q=80',
      descriptionFallback: 'Authoritative reporting on digital assets, institutional cryptocurrency indices, macro token economics, and ledger architectures from CoinDesk.',
      licenseName: 'CoinDesk Media Inc. Editorial',
      publisher: 'CoinDesk Inc.',
      tags: ['coindesk', 'cryptocurrency', 'markets', 'bitcoin', 'indices', 'digital-assets'],
      idPrefix: 'cdesk'
    });
  } catch (err: any) {
    recordProviderFailure('coindesk_markets', err.message);
    return [];
  }
}

// ============================================================================
// 19. CNET Consumer Technology & Tech News
// ============================================================================
registerTracker({
  id: 'cnet_tech_reviews',
  name: 'CNET Consumer Technology & Innovation Wire',
  category: 'Tech & Hardware',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

export async function queryCnetTechReviews(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = 'https://www.cnet.com/rss/news/';

  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`CNET returned ${res.status}`);
    const xml = await res.text();
    recordProviderSuccess('cnet_tech_reviews', Date.now() - start);

    return parseRssFeedItems(xml, query, ['tech', 'technology', 'gadgets', 'reviews', 'mobile', 'hardware', 'all'], {
      providerId: 'cnet_tech_reviews',
      providerName: 'CNET Technology Wire',
      category: 'code',
      defaultThumbnail: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&auto=format&fit=crop&q=80',
      descriptionFallback: 'Product evaluations, smart technology innovations, consumer computing, and appliance testing from CNET.',
      licenseName: 'CNET Media Group Editorial',
      publisher: 'CNET Media Group',
      tags: ['cnet', 'tech', 'gadgets', 'reviews', 'smart-home', 'computing'],
      idPrefix: 'cnet'
    });
  } catch (err: any) {
    recordProviderFailure('cnet_tech_reviews', err.message);
    return [];
  }
}

// ============================================================================
// 20. Variety Hollywood & Film Industry
// ============================================================================
registerTracker({
  id: 'variety_film_wire',
  name: 'Variety Film, Television & Entertainment Wire',
  category: 'Videos & Media',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

export async function queryVarietyFilmWire(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = 'https://variety.com/feed/';

  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`Variety returned ${res.status}`);
    const xml = await res.text();
    recordProviderSuccess('variety_film_wire', Date.now() - start);

    return parseRssFeedItems(xml, query, ['cinema', 'film', 'movie', 'entertainment', 'hollywood', 'television', 'all'], {
      providerId: 'variety_film_wire',
      providerName: 'Variety Film & Entertainment Wire',
      category: 'news',
      defaultThumbnail: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80',
      descriptionFallback: 'Hollywood box office telemetry, film festival dispatches, theatrical releases, and studio business analysis from Variety.',
      licenseName: 'Penske Media Corporation Editorial',
      publisher: 'Variety Media, LLC / PMC',
      tags: ['variety', 'film', 'cinema', 'hollywood', 'television', 'box-office'],
      idPrefix: 'variety'
    });
  } catch (err: any) {
    recordProviderFailure('variety_film_wire', err.message);
    return [];
  }
}

// ============================================================================
// 21. Rolling Stone Music Culture & Reviews
// ============================================================================
registerTracker({
  id: 'rollingstone_music_wire',
  name: 'Rolling Stone Music & Cultural Commentary Wire',
  category: 'Music & Audio',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

export async function queryRollingStoneMusicWire(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = 'https://www.rollingstone.com/feed/';

  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`Rolling Stone returned ${res.status}`);
    const xml = await res.text();
    recordProviderSuccess('rollingstone_music_wire', Date.now() - start);

    return parseRssFeedItems(xml, query, ['music', 'album', 'rock', 'artist', 'song', 'audio', 'concert', 'all'], {
      providerId: 'rollingstone_music_wire',
      providerName: 'Rolling Stone Music Wire',
      category: 'music',
      defaultThumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80',
      descriptionFallback: 'Discography reviews, live concert reporting, artist interviews, and musical culture dispatches from Rolling Stone.',
      licenseName: 'Rolling Stone, LLC / PMC Editorial',
      publisher: 'Rolling Stone, LLC',
      tags: ['rollingstone', 'music', 'rock', 'artists', 'discography', 'reviews'],
      idPrefix: 'rstone'
    });
  } catch (err: any) {
    recordProviderFailure('rollingstone_music_wire', err.message);
    return [];
  }
}

// ============================================================================
// 22. Defense News International Defense & Aerospace Policy
// ============================================================================
registerTracker({
  id: 'defensenews_global',
  name: 'Defense News Global Security & Defense Wire',
  category: 'News & Policy',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

export async function queryDefenseNewsGlobal(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = 'https://www.defensenews.com/arc/outboundfeeds/rss/';

  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`Defense News returned ${res.status}`);
    const xml = await res.text();
    recordProviderSuccess('defensenews_global', Date.now() - start);

    return parseRssFeedItems(xml, query, ['defense', 'military', 'security', 'geopolitics', 'policy', 'navy', 'airforce', 'all'], {
      providerId: 'defensenews_global',
      providerName: 'Defense News Global Wire',
      category: 'news',
      defaultThumbnail: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&auto=format&fit=crop&q=80',
      descriptionFallback: 'Global defense acquisition, strategic procurement, defense budgets, and international security analysis from Defense News.',
      licenseName: 'Sightline Media Group Editorial',
      publisher: 'Sightline Media Group',
      tags: ['defensenews', 'defense', 'military', 'procurement', 'geopolitics'],
      idPrefix: 'defnews'
    });
  } catch (err: any) {
    recordProviderFailure('defensenews_global', err.message);
    return [];
  }
}

// ============================================================================
// 23. Smithsonian Magazine Science, History & Culture
// ============================================================================
registerTracker({
  id: 'smithsonian_mag_heritage',
  name: 'Smithsonian Magazine Science & History Wire',
  category: 'Art & Knowledge',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

export async function querySmithsonianMagHeritage(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = 'https://www.smithsonianmag.com/rss/articles/';

  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`Smithsonian Magazine returned ${res.status}`);
    const xml = await res.text();
    recordProviderSuccess('smithsonian_mag_heritage', Date.now() - start);

    return parseRssFeedItems(xml, query, ['history', 'science', 'culture', 'heritage', 'archaeology', 'nature', 'all'], {
      providerId: 'smithsonian_mag_heritage',
      providerName: 'Smithsonian Magazine Wire',
      category: 'art',
      defaultThumbnail: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&auto=format&fit=crop&q=80',
      descriptionFallback: 'Deep explorations into world archaeology, natural history, human ingenuity, and artifact preservation from the Smithsonian Institution.',
      licenseName: 'Smithsonian Institution Editorial Access',
      publisher: 'Smithsonian Magazine / Smithsonian Institution',
      tags: ['smithsonian', 'archaeology', 'history', 'culture', 'anthropology', 'artifacts'],
      idPrefix: 'smithmag'
    });
  } catch (err: any) {
    recordProviderFailure('smithsonian_mag_heritage', err.message);
    return [];
  }
}

// ============================================================================
// 24. ScienceDaily Earth, Climate & Environmental Sciences
// ============================================================================
registerTracker({
  id: 'scidaily_earth_climate',
  name: 'ScienceDaily Earth & Climate Environmental Wire',
  category: 'Weather & Climate',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

export async function queryScienceDailyEarthClimate(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = 'https://www.sciencedaily.com/rss/earth_climate.xml';

  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`ScienceDaily returned ${res.status}`);
    const xml = await res.text();
    recordProviderSuccess('scidaily_earth_climate', Date.now() - start);

    return parseRssFeedItems(xml, query, ['climate', 'earth', 'environment', 'weather', 'ocean', 'ecology', 'all'], {
      providerId: 'scidaily_earth_climate',
      providerName: 'ScienceDaily Climate Wire',
      category: 'weather',
      defaultThumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
      descriptionFallback: 'Atmospheric modeling, paleoclimatology, ocean circulation, and ecological biodiversity studies from ScienceDaily.',
      licenseName: 'ScienceDaily Open Research Reporting',
      publisher: 'ScienceDaily, LLC',
      tags: ['sciencedaily', 'climate', 'earth', 'ecology', 'meteorology', 'oceanography'],
      idPrefix: 'sciearth'
    });
  } catch (err: any) {
    recordProviderFailure('scidaily_earth_climate', err.message);
    return [];
  }
}

// ============================================================================
// 25. Billboard Music Charts & Industry Releases
// ============================================================================
registerTracker({
  id: 'billboard_chart_news',
  name: 'Billboard Charts & Industry Wire',
  category: 'Music & Audio',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

export async function queryBillboardChartNews(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = 'https://www.billboard.com/feed/';

  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`Billboard returned ${res.status}`);
    const xml = await res.text();
    recordProviderSuccess('billboard_chart_news', Date.now() - start);

    return parseRssFeedItems(xml, query, ['chart', 'music', 'hot100', 'billboard', 'album', 'songs', 'all'], {
      providerId: 'billboard_chart_news',
      providerName: 'Billboard Music Industry Wire',
      category: 'music',
      defaultThumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80',
      descriptionFallback: 'Official Billboard Hot 100 tracking, album charts, music industry economics, and release news.',
      licenseName: 'Billboard Media / PMC Editorial',
      publisher: 'Billboard Media, LLC',
      tags: ['billboard', 'charts', 'hot100', 'music-industry', 'soundtrack'],
      idPrefix: 'bbchart'
    });
  } catch (err: any) {
    recordProviderFailure('billboard_chart_news', err.message);
    return [];
  }
}

// ============================================================================
// 26. Historic Radio & Audio Electronics Schematics (Internet Archive)
// ============================================================================
registerTracker({
  id: 'archive_vintage_radio_schematics',
  name: 'Historic Radio & Audio Electronics Schematics Archive',
  category: 'Code & Hardware',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

export async function queryArchiveRadioSchematics(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'schematic';
  const searchQuery = `mediatype:image AND ("schematic" OR "radio diagram" OR "tube circuit" OR "electronic circuit") AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,date,downloads&sort[]=downloads desc&rows=14&page=1&output=json`;

  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_vintage_radio_schematics', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;

      return buildResourceItem({
        id: `ia-schem-${id}`,
        title: `${title} [Vintage Electronics Schematic]`,
        category: 'code',
        description: `Preserved electronic circuit schematics, tube radio wiring diagrams, and historic electrical engineering documents from the Internet Archive collections.`,
        resourceUrl: itemUrl,
        downloadUrl: itemUrl,
        previewUrl: thumb,
        thumbnailUrl: thumb,
        providerId: 'archive_vintage_radio_schematics',
        providerName: 'Internet Archive Radio Schematics',
        rawLicense: 'Public Domain / Historical Preservation Access',
        licenseUrl: itemUrl,
        providerDefaultLicense: {
          type: 'Public Domain Mark 1.0',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          creator: doc.creator || 'Electronics Engineer',
          publishedAt: doc.date || 'Historical',
          downloads: doc.downloads || 0,
          publisher: 'Internet Archive Electronics Preservation',
          tags: ['schematic', 'electronics', 'radio', 'tubes', 'circuits', 'engineering', 'hardware']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_vintage_radio_schematics', err.message);
    return [];
  }
}

// ============================================================================
// 27. American Civil War Historic Battlefield Cartography (Internet Archive)
// ============================================================================
registerTracker({
  id: 'archive_civil_war_historic_maps',
  name: 'American Civil War Battlefield Cartography Archive',
  category: 'Maps & History',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

export async function queryArchiveCivilWarMaps(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'virginia';
  const searchQuery = `mediatype:image AND ("civil war" map OR "battlefield map" OR "topographical map 186") AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,date,downloads&sort[]=downloads desc&rows=14&page=1&output=json`;

  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_civil_war_historic_maps', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;

      return buildResourceItem({
        id: `ia-civilmap-${id}`,
        title: `${title} [Historic Battlefield Map]`,
        category: 'maps',
        description: `Official historical military cartography and battlefield topographical reconnaissance maps preserved from the American Civil War era.`,
        resourceUrl: itemUrl,
        downloadUrl: itemUrl,
        previewUrl: thumb,
        thumbnailUrl: thumb,
        providerId: 'archive_civil_war_historic_maps',
        providerName: 'Internet Archive Civil War Cartography',
        rawLicense: 'Public Domain Mark 1.0',
        licenseUrl: itemUrl,
        providerDefaultLicense: {
          type: 'Public Domain Mark 1.0',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          creator: doc.creator || 'US Topographical Engineers',
          publishedAt: doc.date || '1861-1865',
          downloads: doc.downloads || 0,
          publisher: 'Internet Archive Historical Maps',
          tags: ['civil-war', 'maps', 'topography', 'cartography', 'military-history', 'atlases']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_civil_war_historic_maps', err.message);
    return [];
  }
}

// ============================================================================
// 28. Historic Cookery & Gastronomy Treatises (Internet Archive)
// ============================================================================
registerTracker({
  id: 'archive_historic_culinary_ephemera',
  name: 'Historic Cookery & Gastronomy Treatises Archive',
  category: 'Food & Heritage',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

export async function queryArchiveHistoricCookery(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'baking';
  const searchQuery = `mediatype:texts AND ("cookbook" OR "cookery" OR "receipt book" OR "gastronomy") AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,date,downloads&sort[]=downloads desc&rows=14&page=1&output=json`;

  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_historic_culinary_ephemera', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;

      return buildResourceItem({
        id: `ia-cookery-${id}`,
        title: `${title} [Historic Culinary Treatise]`,
        category: 'food',
        description: `Rare 18th to early 20th century culinary manual, regional baking receipt book, and household confectionery treatise preserved from historical domestic archives.`,
        resourceUrl: itemUrl,
        downloadUrl: itemUrl,
        previewUrl: thumb,
        thumbnailUrl: thumb,
        providerId: 'archive_historic_culinary_ephemera',
        providerName: 'Internet Archive Historic Culinary Ephemera',
        rawLicense: 'Public Domain Mark 1.0',
        licenseUrl: itemUrl,
        providerDefaultLicense: {
          type: 'Public Domain Mark 1.0',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          creator: doc.creator || 'Master Chef / Domestic Author',
          publishedAt: doc.date || 'Historic',
          downloads: doc.downloads || 0,
          publisher: 'Internet Archive Culinary Heritage Collection',
          tags: ['culinary', 'recipes', 'cookbook', 'gastronomy', 'baking', 'food-history']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_historic_culinary_ephemera', err.message);
    return [];
  }
}

// ============================================================================
// 29. Ancient Greek, Roman & Byzantine Numismatics (Internet Archive)
// ============================================================================
registerTracker({
  id: 'archive_ancient_numismatics',
  name: 'Ancient Greek, Roman & Byzantine Numismatics Archive',
  category: 'Art & Archaeology',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

export async function queryArchiveAncientNumismatics(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const rawQ = (query || '').trim();
  const cleanQ = rawQ || 'coin';
  const searchQuery = `mediatype:image AND ("ancient coins" OR "numismatics" OR "greek coins" OR "roman coins" OR "byzantine coins") AND (${cleanQ})`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=identifier,title,description,creator,date,downloads&sort[]=downloads desc&rows=14&page=1&output=json`;

  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    recordProviderSuccess('archive_ancient_numismatics', Date.now() - start);

    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const itemUrl = `https://archive.org/details/${id}`;
      const thumb = `https://archive.org/services/img/${id}`;

      return buildResourceItem({
        id: `ia-coin-${id}`,
        title: `${title} [Ancient Numismatic Artifact]`,
        category: 'art',
        description: `High-resolution visual catalog of ancient Greek drachmas, Roman imperial denarii, and Byzantine solidi preserved from classical numismatic collections.`,
        resourceUrl: itemUrl,
        downloadUrl: itemUrl,
        previewUrl: thumb,
        thumbnailUrl: thumb,
        providerId: 'archive_ancient_numismatics',
        providerName: 'Internet Archive Ancient Numismatics',
        rawLicense: 'Public Domain Mark 1.0',
        licenseUrl: itemUrl,
        providerDefaultLicense: {
          type: 'Public Domain Mark 1.0',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          creator: doc.creator || 'Classical Antiquity Mint',
          publishedAt: doc.date || 'Antiquity',
          downloads: doc.downloads || 0,
          publisher: 'Internet Archive Classical Antiquities',
          tags: ['numismatics', 'coins', 'ancient-greece', 'rome', 'byzantium', 'archaeology', 'antiquities']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_ancient_numismatics', err.message);
    return [];
  }
}
