import { ResourceItem } from '../../src/types/resource';
import { buildResourceItem } from '../normalizer';
import { registerTracker, recordProviderSuccess, recordProviderFailure } from '../telemetry';

const USER_AGENT = 'URMIL-Universal-Browser/1.0 (https://ai.studio; contact: team@urmil.org)';

// ============================================================================
// Telemetry Registrations for Real-Time News Providers
// ============================================================================

registerTracker({
  id: 'google_news',
  name: 'Google News Real-Time Global Headlines',
  category: 'Live News',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'bbc_world_news',
  name: 'BBC World News Live Wire',
  category: 'Live News',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'the_guardian_news',
  name: 'The Guardian Global International Edition',
  category: 'Live News',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'al_jazeera_news',
  name: 'Al Jazeera English International Wire',
  category: 'Live News',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'npr_news',
  name: 'NPR National & World News Broadcast',
  category: 'Live News',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'hacker_news_live',
  name: 'Hacker News Real-Time Tech Wire',
  category: 'Live News',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'techcrunch_news',
  name: 'TechCrunch Silicon Valley & VC Wire',
  category: 'Live News',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'spaceflight_news',
  name: 'Spaceflight News API (SNAPI v4)',
  category: 'Live News',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'wikinews_open',
  name: 'Wikinews Open Collaborative Journalism',
  category: 'Live News',
  rateLimit: 'Public Open Access',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'devto_news',
  name: 'DEV Community Real-Time News',
  category: 'Live News',
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
// 1. Google News Real-Time Global Headlines
// ============================================================================
export async function queryGoogleNews(query: string): Promise<ResourceItem[]> {
  const term = query.trim() || 'technology';
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(term)}&hl=en-US&gl=US&ceid=US:en`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(4000)
    });
    if (!res.ok) throw new Error(`Google News returned ${res.status}`);
    const xml = await res.text();

    const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
    const items: ResourceItem[] = [];

    for (const block of itemMatches) {
      if (items.length >= 15) break;
      const rawTitle = block.match(/<title>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/title>/i);
      const rawLink = block.match(/<link>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/link>/i);
      const rawDate = block.match(/<pubDate>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/pubDate>/i);
      const rawSource = block.match(/<source[^>]*>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/source>/i);
      const rawDesc = block.match(/<description>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/description>/i);

      const fullTitle = cleanText(rawTitle?.[1] || rawTitle?.[2] || '');
      const link = (rawLink?.[1] || rawLink?.[2] || '').trim();
      const sourceName = cleanText(rawSource?.[1] || rawSource?.[2] || '');
      const pubDate = (rawDate?.[1] || rawDate?.[2] || '').trim();
      const desc = cleanText(rawDesc?.[1] || rawDesc?.[2] || '');

      if (!fullTitle || !link) continue;

      const fallbackPhoto = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&auto=format&fit=crop&q=80';

      items.push(
        buildResourceItem({
          id: `gnews-${Buffer.from(link).toString('base64').slice(0, 16)}`,
          title: fullTitle,
          description: desc || `Live breaking news coverage from ${sourceName || 'Google News'}.`,
          resourceUrl: link,
          downloadUrl: link,
          previewUrl: fallbackPhoto,
          thumbnailUrl: fallbackPhoto,
          category: 'news',
          providerId: 'google_news',
          providerName: sourceName ? `Google News (${sourceName})` : 'Google News Live',
          rawLicense: 'Editorial News Access',
          licenseUrl: link,
          providerDefaultLicense: {
            type: 'Editorial News Access',
            commercialAllowed: false,
            attributionRequired: true
          },
          attributes: {
            publisher: sourceName || 'Google News',
            publishedAt: pubDate || new Date().toUTCString(),
            isLiveNews: true,
            language: 'en'
          }
        })
      );
    }

    recordProviderSuccess('google_news', items.length);
    return items;
  } catch (err: any) {
    recordProviderFailure('google_news', err.message);
    return [];
  }
}

// ============================================================================
// 2. BBC World News Live Wire
// ============================================================================
export async function queryBbcWorldNews(query: string): Promise<ResourceItem[]> {
  const url = 'https://feeds.bbci.co.uk/news/world/rss.xml';
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(4000)
    });
    if (!res.ok) throw new Error(`BBC returned ${res.status}`);
    const xml = await res.text();
    const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
    const items: ResourceItem[] = [];
    const lowerQ = query.trim().toLowerCase();

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
      const thumb = extractThumbnail(block) || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&auto=format&fit=crop&q=80';

      if (!title || !link) continue;
      if (lowerQ && !title.toLowerCase().includes(lowerQ) && !desc.toLowerCase().includes(lowerQ) && lowerQ !== 'news') {
        continue;
      }

      items.push(
        buildResourceItem({
          id: `bbc-${Buffer.from(link).toString('base64').slice(0, 16)}`,
          title,
          description: desc || 'BBC World News live coverage and investigative reporting.',
          resourceUrl: link,
          downloadUrl: link,
          previewUrl: thumb,
          thumbnailUrl: thumb,
          category: 'news',
          providerId: 'bbc_world_news',
          providerName: 'BBC World News',
          rawLicense: 'BBC News Editorial',
          licenseUrl: link,
          providerDefaultLicense: {
            type: 'BBC News Editorial',
            commercialAllowed: false,
            attributionRequired: true
          },
          attributes: {
            publisher: 'British Broadcasting Corporation (BBC)',
            publishedAt: pubDate,
            isLiveNews: true,
            language: 'en-GB'
          }
        })
      );
    }

    if (items.length === 0 && itemMatches.length > 0) {
      for (let i = 0; i < Math.min(8, itemMatches.length); i++) {
        const block = itemMatches[i];
        const rawTitle = block.match(/<title>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/title>/i);
        const rawLink = block.match(/<link>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/link>/i);
        const rawDate = block.match(/<pubDate>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/pubDate>/i);
        const rawDesc = block.match(/<description>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/description>/i);
        const title = cleanText(rawTitle?.[1] || rawTitle?.[2] || '');
        const link = (rawLink?.[1] || rawLink?.[2] || '').trim();
        const desc = cleanText(rawDesc?.[1] || rawDesc?.[2] || '');
        const pubDate = (rawDate?.[1] || rawDate?.[2] || '').trim();
        const thumb = extractThumbnail(block) || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&auto=format&fit=crop&q=80';
        if (title && link) {
          items.push(
            buildResourceItem({
              id: `bbc-${Buffer.from(link).toString('base64').slice(0, 16)}`,
              title,
              description: desc,
              resourceUrl: link,
              downloadUrl: link,
              previewUrl: thumb,
              thumbnailUrl: thumb,
              category: 'news',
              providerId: 'bbc_world_news',
              providerName: 'BBC World News',
              rawLicense: 'BBC News Editorial',
              licenseUrl: link,
              providerDefaultLicense: {
                type: 'BBC News Editorial',
                commercialAllowed: false,
                attributionRequired: true
              },
              attributes: { publisher: 'BBC World News', publishedAt: pubDate, isLiveNews: true }
            })
          );
        }
      }
    }

    recordProviderSuccess('bbc_world_news', items.length);
    return items;
  } catch (err: any) {
    recordProviderFailure('bbc_world_news', err.message);
    return [];
  }
}

// ============================================================================
// 3. The Guardian Global News Wire
// ============================================================================
export async function queryTheGuardianNews(query: string): Promise<ResourceItem[]> {
  const url = 'https://www.theguardian.com/world/rss';
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(4000)
    });
    if (!res.ok) throw new Error(`The Guardian returned ${res.status}`);
    const xml = await res.text();
    const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
    const items: ResourceItem[] = [];
    const lowerQ = query.trim().toLowerCase();

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
      const thumb = extractThumbnail(block) || 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&auto=format&fit=crop&q=80';

      if (!title || !link) continue;
      if (lowerQ && !title.toLowerCase().includes(lowerQ) && !desc.toLowerCase().includes(lowerQ) && lowerQ !== 'news') {
        continue;
      }

      items.push(
        buildResourceItem({
          id: `guardian-${Buffer.from(link).toString('base64').slice(0, 16)}`,
          title,
          description: desc || 'The Guardian independent global journalism and international analysis.',
          resourceUrl: link,
          downloadUrl: link,
          previewUrl: thumb,
          thumbnailUrl: thumb,
          category: 'news',
          providerId: 'the_guardian_news',
          providerName: 'The Guardian',
          rawLicense: 'Guardian Media Editorial',
          licenseUrl: link,
          providerDefaultLicense: {
            type: 'Guardian Media Editorial',
            commercialAllowed: false,
            attributionRequired: true
          },
          attributes: {
            publisher: 'Guardian News & Media',
            publishedAt: pubDate,
            isLiveNews: true,
            language: 'en-GB'
          }
        })
      );
    }

    if (items.length === 0 && itemMatches.length > 0) {
      for (let i = 0; i < Math.min(8, itemMatches.length); i++) {
        const block = itemMatches[i];
        const rawTitle = block.match(/<title>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/title>/i);
        const rawLink = block.match(/<link>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/link>/i);
        const rawDate = block.match(/<pubDate>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/pubDate>/i);
        const rawDesc = block.match(/<description>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/description>/i);
        const title = cleanText(rawTitle?.[1] || rawTitle?.[2] || '');
        const link = (rawLink?.[1] || rawLink?.[2] || '').trim();
        const desc = cleanText(rawDesc?.[1] || rawDesc?.[2] || '');
        const pubDate = (rawDate?.[1] || rawDate?.[2] || '').trim();
        const thumb = extractThumbnail(block) || 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&auto=format&fit=crop&q=80';
        if (title && link) {
          items.push(
            buildResourceItem({
              id: `guardian-${Buffer.from(link).toString('base64').slice(0, 16)}`,
              title,
              description: desc,
              resourceUrl: link,
              downloadUrl: link,
              previewUrl: thumb,
              thumbnailUrl: thumb,
              category: 'news',
              providerId: 'the_guardian_news',
              providerName: 'The Guardian',
              rawLicense: 'Guardian Media Editorial',
              licenseUrl: link,
              providerDefaultLicense: { type: 'Guardian Media Editorial', commercialAllowed: false, attributionRequired: true },
              attributes: { publisher: 'The Guardian', publishedAt: pubDate, isLiveNews: true }
            })
          );
        }
      }
    }

    recordProviderSuccess('the_guardian_news', items.length);
    return items;
  } catch (err: any) {
    recordProviderFailure('the_guardian_news', err.message);
    return [];
  }
}

// ============================================================================
// 4. NPR Breaking News & In-Depth Broadcast Journalism
// ============================================================================
export async function queryNprNews(query: string): Promise<ResourceItem[]> {
  const url = 'https://feeds.npr.org/1001/rss.xml';
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(4000)
    });
    if (!res.ok) throw new Error(`NPR returned ${res.status}`);
    const xml = await res.text();
    const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
    const items: ResourceItem[] = [];
    const lowerQ = query.trim().toLowerCase();

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
      const thumb = extractThumbnail(block) || 'https://images.unsplash.com/photo-1526470608268-f674ce90ebd4?w=800&auto=format&fit=crop&q=80';

      if (!title || !link) continue;
      if (lowerQ && !title.toLowerCase().includes(lowerQ) && !desc.toLowerCase().includes(lowerQ) && lowerQ !== 'news') {
        continue;
      }

      items.push(
        buildResourceItem({
          id: `npr-${Buffer.from(link).toString('base64').slice(0, 16)}`,
          title,
          description: desc || 'National Public Radio broadcast news, cultural reporting, and world events.',
          resourceUrl: link,
          downloadUrl: link,
          previewUrl: thumb,
          thumbnailUrl: thumb,
          category: 'news',
          providerId: 'npr_news',
          providerName: 'NPR News',
          rawLicense: 'NPR Public Editorial',
          licenseUrl: link,
          providerDefaultLicense: {
            type: 'NPR Public Editorial',
            commercialAllowed: false,
            attributionRequired: true
          },
          attributes: {
            publisher: 'National Public Radio (NPR)',
            publishedAt: pubDate,
            isLiveNews: true,
            language: 'en-US'
          }
        })
      );
    }

    if (items.length === 0 && itemMatches.length > 0) {
      for (let i = 0; i < Math.min(8, itemMatches.length); i++) {
        const block = itemMatches[i];
        const rawTitle = block.match(/<title>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/title>/i);
        const rawLink = block.match(/<link>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/link>/i);
        const rawDate = block.match(/<pubDate>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/pubDate>/i);
        const rawDesc = block.match(/<description>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/description>/i);
        const title = cleanText(rawTitle?.[1] || rawTitle?.[2] || '');
        const link = (rawLink?.[1] || rawLink?.[2] || '').trim();
        const desc = cleanText(rawDesc?.[1] || rawDesc?.[2] || '');
        const pubDate = (rawDate?.[1] || rawDate?.[2] || '').trim();
        const thumb = extractThumbnail(block) || 'https://images.unsplash.com/photo-1526470608268-f674ce90ebd4?w=800&auto=format&fit=crop&q=80';
        if (title && link) {
          items.push(
            buildResourceItem({
              id: `npr-${Buffer.from(link).toString('base64').slice(0, 16)}`,
              title,
              description: desc,
              resourceUrl: link,
              downloadUrl: link,
              previewUrl: thumb,
              thumbnailUrl: thumb,
              category: 'news',
              providerId: 'npr_news',
              providerName: 'NPR News',
              rawLicense: 'NPR Public Editorial',
              licenseUrl: link,
              providerDefaultLicense: { type: 'NPR Public Editorial', commercialAllowed: false, attributionRequired: true },
              attributes: { publisher: 'NPR', publishedAt: pubDate, isLiveNews: true }
            })
          );
        }
      }
    }

    recordProviderSuccess('npr_news', items.length);
    return items;
  } catch (err: any) {
    recordProviderFailure('npr_news', err.message);
    return [];
  }
}

// ============================================================================
// 5. Al Jazeera English Live International
// ============================================================================
export async function queryAlJazeeraNews(query: string): Promise<ResourceItem[]> {
  const url = 'https://www.aljazeera.com/xml/rss/all.xml';
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(4000)
    });
    if (!res.ok) throw new Error(`Al Jazeera returned ${res.status}`);
    const xml = await res.text();
    const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
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
      const thumb = extractThumbnail(block) || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&auto=format&fit=crop&q=80';

      if (!title || !link) continue;
      if (lowerQ && !title.toLowerCase().includes(lowerQ) && !desc.toLowerCase().includes(lowerQ) && lowerQ !== 'news') {
        continue;
      }

      items.push(
        buildResourceItem({
          id: `aje-${Buffer.from(link).toString('base64').slice(0, 16)}`,
          title,
          description: desc || 'Al Jazeera English global geopolitical and breaking news reporting.',
          resourceUrl: link,
          downloadUrl: link,
          previewUrl: thumb,
          thumbnailUrl: thumb,
          category: 'news',
          providerId: 'al_jazeera_news',
          providerName: 'Al Jazeera English',
          rawLicense: 'Al Jazeera Media Editorial',
          licenseUrl: link,
          providerDefaultLicense: {
            type: 'Al Jazeera Media Editorial',
            commercialAllowed: false,
            attributionRequired: true
          },
          attributes: {
            publisher: 'Al Jazeera Media Network',
            publishedAt: pubDate,
            isLiveNews: true,
            language: 'en'
          }
        })
      );
    }

    if (items.length === 0 && itemMatches.length > 0) {
      for (let i = 0; i < Math.min(6, itemMatches.length); i++) {
        const block = itemMatches[i];
        const rawTitle = block.match(/<title>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/title>/i);
        const rawLink = block.match(/<link>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/link>/i);
        const rawDate = block.match(/<pubDate>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/pubDate>/i);
        const rawDesc = block.match(/<description>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/description>/i);
        const title = cleanText(rawTitle?.[1] || rawTitle?.[2] || '');
        const link = (rawLink?.[1] || rawLink?.[2] || '').trim();
        const desc = cleanText(rawDesc?.[1] || rawDesc?.[2] || '');
        const pubDate = (rawDate?.[1] || rawDate?.[2] || '').trim();
        const thumb = extractThumbnail(block) || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&auto=format&fit=crop&q=80';
        if (title && link) {
          items.push(
            buildResourceItem({
              id: `aje-${Buffer.from(link).toString('base64').slice(0, 16)}`,
              title,
              description: desc,
              resourceUrl: link,
              downloadUrl: link,
              previewUrl: thumb,
              thumbnailUrl: thumb,
              category: 'news',
              providerId: 'al_jazeera_news',
              providerName: 'Al Jazeera English',
              rawLicense: 'Al Jazeera Media Editorial',
              licenseUrl: link,
              providerDefaultLicense: { type: 'Al Jazeera Media Editorial', commercialAllowed: false, attributionRequired: true },
              attributes: { publisher: 'Al Jazeera Media Network', publishedAt: pubDate, isLiveNews: true }
            })
          );
        }
      }
    }

    recordProviderSuccess('al_jazeera_news', items.length);
    return items;
  } catch (err: any) {
    recordProviderFailure('al_jazeera_news', err.message);
    return [];
  }
}

// ============================================================================
// 6. Hacker News Real-Time Breaking Tech Feed
// ============================================================================
export async function queryHackerNewsLive(query: string): Promise<ResourceItem[]> {
  const term = query.trim() || 'ai';
  const url = `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(term)}&tags=story&hitsPerPage=15`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(4000)
    });
    if (!res.ok) throw new Error(`Hacker News returned ${res.status}`);
    const data = await res.json();
    const hits = data?.hits || [];
    const items: ResourceItem[] = [];

    for (const h of hits) {
      if (!h.title) continue;
      const targetUrl = h.url || `https://news.ycombinator.com/item?id=${h.objectID}`;
      const title = cleanText(h.title);
      const fallbackPhoto = 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80';

      items.push(
        buildResourceItem({
          id: `hnlive-${h.objectID}`,
          title,
          description: `Real-time developer & tech discussion on Hacker News. Posted by @${h.author || 'anon'} with ${h.points || 0} points and ${h.num_comments || 0} comments.`,
          resourceUrl: targetUrl,
          downloadUrl: targetUrl,
          previewUrl: fallbackPhoto,
          thumbnailUrl: fallbackPhoto,
          category: 'news',
          providerId: 'hacker_news_live',
          providerName: 'Hacker News Live',
          rawLicense: 'Public Community Discussion',
          licenseUrl: targetUrl,
          providerDefaultLicense: {
            type: 'Public Community Discussion',
            commercialAllowed: false,
            attributionRequired: true
          },
          attributes: {
            publisher: 'Y Combinator / Hacker News',
            author: h.author,
            points: h.points,
            comments: h.num_comments,
            publishedAt: h.created_at || new Date().toISOString(),
            isLiveNews: true
          }
        })
      );
    }

    recordProviderSuccess('hacker_news_live', items.length);
    return items;
  } catch (err: any) {
    recordProviderFailure('hacker_news_live', err.message);
    return [];
  }
}

// ============================================================================
// 7. TechCrunch Real-Time Startup & Tech News
// ============================================================================
export async function queryTechCrunchNews(query: string): Promise<ResourceItem[]> {
  const url = 'https://techcrunch.com/feed/';
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(4000)
    });
    if (!res.ok) throw new Error(`TechCrunch returned ${res.status}`);
    const xml = await res.text();
    const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
    const items: ResourceItem[] = [];
    const lowerQ = query.trim().toLowerCase();

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
      const author = cleanText(rawCreator?.[1] || rawCreator?.[2] || 'TechCrunch Staff');
      const thumb = extractThumbnail(block) || 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80';

      if (!title || !link) continue;
      if (lowerQ && !title.toLowerCase().includes(lowerQ) && !desc.toLowerCase().includes(lowerQ) && lowerQ !== 'news') {
        continue;
      }

      items.push(
        buildResourceItem({
          id: `tc-${Buffer.from(link).toString('base64').slice(0, 16)}`,
          title,
          description: desc || `Breaking startup, venture, and artificial intelligence report by ${author}.`,
          resourceUrl: link,
          downloadUrl: link,
          previewUrl: thumb,
          thumbnailUrl: thumb,
          category: 'news',
          providerId: 'techcrunch_news',
          providerName: 'TechCrunch',
          rawLicense: 'TechCrunch Editorial',
          licenseUrl: link,
          providerDefaultLicense: {
            type: 'TechCrunch Editorial',
            commercialAllowed: false,
            attributionRequired: true
          },
          attributes: {
            publisher: 'TechCrunch',
            author,
            publishedAt: pubDate,
            isLiveNews: true
          }
        })
      );
    }

    if (items.length === 0 && itemMatches.length > 0) {
      for (let i = 0; i < Math.min(6, itemMatches.length); i++) {
        const block = itemMatches[i];
        const rawTitle = block.match(/<title>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/title>/i);
        const rawLink = block.match(/<link>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/link>/i);
        const rawDate = block.match(/<pubDate>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/pubDate>/i);
        const rawDesc = block.match(/<description>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/description>/i);
        const title = cleanText(rawTitle?.[1] || rawTitle?.[2] || '');
        const link = (rawLink?.[1] || rawLink?.[2] || '').trim();
        const desc = cleanText(rawDesc?.[1] || rawDesc?.[2] || '');
        const pubDate = (rawDate?.[1] || rawDate?.[2] || '').trim();
        const thumb = extractThumbnail(block) || 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80';
        if (title && link) {
          items.push(
            buildResourceItem({
              id: `tc-${Buffer.from(link).toString('base64').slice(0, 16)}`,
              title,
              description: desc,
              resourceUrl: link,
              downloadUrl: link,
              previewUrl: thumb,
              thumbnailUrl: thumb,
              category: 'news',
              providerId: 'techcrunch_news',
              providerName: 'TechCrunch',
              rawLicense: 'TechCrunch Editorial',
              licenseUrl: link,
              providerDefaultLicense: { type: 'TechCrunch Editorial', commercialAllowed: false, attributionRequired: true },
              attributes: { publisher: 'TechCrunch', publishedAt: pubDate, isLiveNews: true }
            })
          );
        }
      }
    }

    recordProviderSuccess('techcrunch_news', items.length);
    return items;
  } catch (err: any) {
    recordProviderFailure('techcrunch_news', err.message);
    return [];
  }
}

// ============================================================================
// 8. Spaceflight News API (SNAPI v4)
// ============================================================================
export async function querySpaceflightNews(query: string): Promise<ResourceItem[]> {
  const term = query.trim() || 'space';
  const url = `https://api.spaceflightnewsapi.net/v4/articles/?search=${encodeURIComponent(term)}&limit=12`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(4000)
    });
    if (!res.ok) throw new Error(`SNAPI returned ${res.status}`);
    const data = await res.json();
    const results = data?.results || [];
    const items: ResourceItem[] = [];

    for (const r of results) {
      if (!r.title || !r.url) continue;

      const photo = r.image_url || 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80';

      items.push(
        buildResourceItem({
          id: `snapi-${r.id}`,
          title: r.title,
          description: r.summary || `Spaceflight and orbital mission reporting from ${r.news_site || 'SNAPI'}.`,
          resourceUrl: r.url,
          downloadUrl: r.url,
          previewUrl: photo,
          thumbnailUrl: photo,
          category: 'news',
          providerId: 'spaceflight_news',
          providerName: r.news_site ? `Spaceflight News (${r.news_site})` : 'Spaceflight News',
          rawLicense: 'Open Access Space News',
          licenseUrl: r.url,
          providerDefaultLicense: {
            type: 'Open Access Space News',
            commercialAllowed: false,
            attributionRequired: true
          },
          attributes: {
            publisher: r.news_site || 'Spaceflight News API',
            publishedAt: r.published_at,
            isLiveNews: true,
            authors: r.authors?.map((a: any) => a.name).join(', ')
          }
        })
      );
    }

    recordProviderSuccess('spaceflight_news', items.length);
    return items;
  } catch (err: any) {
    recordProviderFailure('spaceflight_news', err.message);
    return [];
  }
}

// ============================================================================
// 9. Wikinews Open Collaborative Journalism
// ============================================================================
export async function queryWikinewsOpen(query: string): Promise<ResourceItem[]> {
  const term = query.trim() || 'news';
  const url = `https://en.wikinews.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(term)}&srlimit=12&format=json`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(4000)
    });
    if (!res.ok) throw new Error(`Wikinews returned ${res.status}`);
    const data = await res.json();
    const search = data?.query?.search || [];
    const items: ResourceItem[] = [];

    for (const s of search) {
      if (!s.title) continue;
      const articleUrl = `https://en.wikinews.org/wiki/${encodeURIComponent(s.title.replace(/ /g, '_'))}`;
      const snippet = cleanText(s.snippet);
      const fallbackPhoto = 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&auto=format&fit=crop&q=80';

      items.push(
        buildResourceItem({
          id: `wikinews-${s.pageid}`,
          title: s.title,
          description: snippet || 'Wikinews open-content journalistic news release.',
          resourceUrl: articleUrl,
          downloadUrl: articleUrl,
          previewUrl: fallbackPhoto,
          thumbnailUrl: fallbackPhoto,
          category: 'news',
          providerId: 'wikinews_open',
          providerName: 'Wikinews Open Source Journalism',
          rawLicense: 'Creative Commons CC-BY 2.5',
          licenseUrl: articleUrl,
          providerDefaultLicense: {
            type: 'Creative Commons CC-BY 2.5',
            commercialAllowed: true,
            attributionRequired: true
          },
          attributes: {
            publisher: 'Wikimedia Foundation',
            publishedAt: s.timestamp,
            isLiveNews: true
          }
        })
      );
    }

    recordProviderSuccess('wikinews_open', items.length);
    return items;
  } catch (err: any) {
    recordProviderFailure('wikinews_open', err.message);
    return [];
  }
}

// ============================================================================
// 10. Dev.to Real-Time Developer & Software News
// ============================================================================
export async function queryDevtoNews(query: string): Promise<ResourceItem[]> {
  const term = query.trim().toLowerCase();
  const url = term && term !== 'news'
    ? `https://dev.to/api/articles?q=${encodeURIComponent(term)}&per_page=12`
    : `https://dev.to/api/articles?tag=news&per_page=12`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(4000)
    });
    if (!res.ok) throw new Error(`Dev.to returned ${res.status}`);
    const list = await res.json();
    if (!Array.isArray(list)) return [];
    const items: ResourceItem[] = [];

    for (const a of list) {
      if (!a.title || !a.url) continue;

      const photo = a.social_image || a.cover_image || 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80';

      items.push(
        buildResourceItem({
          id: `devto-${a.id}`,
          title: a.title,
          description: a.description || `Software development, open-source, and web engineering news by @${a.user?.username || 'dev'}.`,
          resourceUrl: a.url,
          downloadUrl: a.url,
          previewUrl: photo,
          thumbnailUrl: photo,
          category: 'news',
          providerId: 'devto_news',
          providerName: 'Dev.to Tech News',
          rawLicense: 'Dev.to Community Access',
          licenseUrl: a.url,
          providerDefaultLicense: {
            type: 'Dev.to Community Access',
            commercialAllowed: false,
            attributionRequired: true
          },
          attributes: {
            publisher: 'DEV Community',
            author: a.user?.name || a.user?.username,
            publishedAt: a.published_timestamp || a.readable_publish_date,
            isLiveNews: true,
            tags: a.tag_list?.join(', ')
          }
        })
      );
    }

    recordProviderSuccess('devto_news', items.length);
    return items;
  } catch (err: any) {
    recordProviderFailure('devto_news', err.message);
    return [];
  }
}
