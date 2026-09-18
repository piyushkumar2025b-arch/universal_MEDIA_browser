import { ResourceItem } from '../../src/types/resource';
import { buildResourceItem } from '../normalizer';
import { registerTracker, recordProviderSuccess, recordProviderFailure } from '../telemetry';
import { getGoogleApiKey, getGoogleSearchEngineId } from '../config/google_keys';

const USER_AGENT = 'URMIL-Universal-Browser/1.0 (https://ai.studio; contact: team@urmil.org)';

registerTracker({
  id: 'wikipedia',
  name: 'Wikipedia Open Encyclopedia',
  category: 'Knowledge',
  rateLimit: '200 req/sec',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'wikidata',
  name: 'Wikidata Linked Open Knowledge Graph',
  category: 'Knowledge',
  rateLimit: 'Open MediaWiki API (CC0)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'wikiquote',
  name: 'Wikiquote Quotes & Speeches Compendium',
  category: 'Knowledge',
  rateLimit: 'Open MediaWiki API (CC BY-SA)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'wikisource',
  name: 'Wikisource Free Library of Primary Sources & Manuscripts',
  category: 'Knowledge & Literature',
  rateLimit: 'Open MediaWiki API (CC BY-SA / CC0)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'dbpedia',
  name: 'DBpedia Linked Open Data Knowledge Base',
  category: 'Knowledge',
  rateLimit: 'Open Public SPARQL / Lookup API (CC-BY-SA)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'wiktionary',
  name: 'Wiktionary Free Multilingual Dictionary',
  category: 'Knowledge & Linguistics',
  rateLimit: 'Open MediaWiki API (CC BY-SA)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'google_search',
  name: 'Google Custom Search (Web & Knowledge)',
  category: 'Knowledge',
  rateLimit: 'Custom Search JSON API (100 queries/day free tier)',
  authRequired: true,
  authConfigured: Boolean(getGoogleApiKey() && getGoogleSearchEngineId())
});

registerTracker({
  id: 'wikivoyage',
  name: 'Wikivoyage Free World Travel & Destination Guide',
  category: 'Knowledge & Travel',
  rateLimit: 'Open MediaWiki API (CC BY-SA 4.0)',
  authRequired: false,
  authConfigured: true
});

export async function queryWikipedia(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=10&origin=*`;

  try {
    const res = await fetch(searchUrl, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('wikipedia', Date.now() - start);

    const searchResults = data.query?.search || [];
    return searchResults.map((item: any) => {
      const pageTitle = item.title;
      const snippet = item.snippet ? item.snippet.replace(/<[^>]+>/g, '') : undefined;
      const pageUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitle.replace(/ /g, '_'))}`;

      return buildResourceItem({
        id: `wiki-${item.pageid}`,
        title: pageTitle,
        category: 'knowledge',
        description: snippet,
        previewUrl: pageUrl,
        downloadUrl: pageUrl,
        providerId: 'wikipedia',
        providerName: 'Wikipedia',
        resourceUrl: pageUrl,
        externalId: String(item.pageid),
        creatorName: 'Wikipedia Editors and Contributors',
        rawLicense: 'Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)',
        licenseUrl: 'https://en.wikipedia.org/wiki/Wikipedia:Text_of_the_Creative_Commons_Attribution-ShareAlike_4.0_International_License',
        providerDefaultLicense: {
          type: 'Creative Commons BY-SA',
          commercialAllowed: true,
          attributionRequired: true
        },
        attributes: {
          format: 'html/wiki',
          quality: 'Original',
          tags: ['Encyclopedia', 'Open Knowledge']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('wikipedia', err.message);
    return [];
  }
}

// 2. Wikidata Linked Open Knowledge Graph
export async function queryWikidataEntities(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(query)}&language=en&format=json&limit=15&origin=*`;

  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('wikidata', Date.now() - start);

    const entities = data.search || [];
    return entities.map((e: any) => {
      const entityUrl = e.concepturi || `https://www.wikidata.org/wiki/${e.id}`;
      return buildResourceItem({
        id: `wikidata-${e.id}`,
        title: `${e.label || e.id} [${e.id}]`,
        category: 'knowledge',
        description: e.description ? `${e.description} • Wikidata Linked Data Entity` : 'Wikidata Linked Entity',
        previewUrl: entityUrl,
        downloadUrl: `https://www.wikidata.org/wiki/Special:EntityData/${e.id}.json`,
        providerId: 'wikidata',
        providerName: 'Wikidata Knowledge Graph',
        resourceUrl: entityUrl,
        externalId: e.id,
        creatorName: 'Wikidata Contributors',
        rawLicense: 'Creative Commons CC0 1.0 Universal Public Domain',
        licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
        attributes: {
          format: 'json/rdf',
          quality: 'Original',
          tags: ['Wikidata', 'Linked Data', 'Semantic Web', e.id]
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('wikidata', err.message);
    return [];
  }
}

// 3. Wikiquote Notable Quotations & Speeches Compendium
export async function queryWikiquote(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = `https://en.wikiquote.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=15&format=json&origin=*`;

  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('wikiquote', Date.now() - start);

    const titles: string[] = data[1] || [];
    const snippets: string[] = data[2] || [];
    const urls: string[] = data[3] || [];

    return titles.map((title: string, idx: number) => {
      const pageUrl = urls[idx] || `https://en.wikiquote.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
      const desc = snippets[idx] || `Quotations and notable statements from ${title} on Wikiquote.`;
      const id = title.toLowerCase().replace(/[^\w]/g, '-');

      return buildResourceItem({
        id: `wikiquote-${id}-${idx}`,
        title: `${title} (Quotes)`,
        category: 'knowledge',
        description: desc,
        previewUrl: pageUrl,
        downloadUrl: pageUrl,
        providerId: 'wikiquote',
        providerName: 'Wikiquote Compendium',
        resourceUrl: pageUrl,
        externalId: title,
        creatorName: 'Wikiquote Community',
        rawLicense: 'Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)',
        licenseUrl: 'https://en.wikiquote.org/wiki/Wikiquote:Copyrights',
        providerDefaultLicense: {
          type: 'Creative Commons BY-SA',
          commercialAllowed: true,
          attributionRequired: true
        },
        attributes: {
          format: 'text/quotes',
          quality: 'Verified Quotations',
          tags: ['Quotations', 'Philosophy', 'Speech', 'Wikiquote']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('wikiquote', err.message);
    return [];
  }
}

// 4. Wikisource (Primary Historical Source Documents, Treaties, Literature & Manuscripts)
export async function queryWikisource(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const searchUrl = `https://en.wikisource.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=10&origin=*`;

  try {
    const res = await fetch(searchUrl, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('wikisource', Date.now() - start);

    const searchResults = data.query?.search || [];
    return searchResults.map((item: any) => {
      const pageTitle = item.title;
      const snippet = item.snippet ? item.snippet.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&#039;/g, "'") : undefined;
      const pageUrl = `https://en.wikisource.org/wiki/${encodeURIComponent(pageTitle.replace(/ /g, '_'))}`;

      return buildResourceItem({
        id: `wikisource-${item.pageid}`,
        title: pageTitle,
        category: 'knowledge',
        description: snippet || `Historical manuscript, speech, treaty, or literary work in Wikisource free library.`,
        previewUrl: pageUrl,
        downloadUrl: pageUrl,
        providerId: 'wikisource',
        providerName: 'Wikisource Primary Documents',
        resourceUrl: pageUrl,
        externalId: String(item.pageid),
        creatorName: 'Wikisource Free Library of Source Texts',
        rawLicense: 'Creative Commons Attribution-ShareAlike or Public Domain',
        licenseUrl: 'https://en.wikisource.org/wiki/Wikisource:Copyright',
        attributes: {
          format: 'text/document',
          wordCount: item.wordcount,
          quality: 'Primary Source Text',
          tags: ['Wikisource', 'Primary Source', 'Literature', 'History']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('wikisource', err.message);
    return [];
  }
}

// 5. DBpedia Linked Open Data Knowledge Base
export async function queryDBpedia(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const clean = query.trim() || 'Knowledge';
  const url = `https://lookup.dbpedia.org/api/search?query=${encodeURIComponent(clean)}&format=json&maxResults=10`;

  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('dbpedia', Date.now() - start);

    const docs = data.docs || [];
    return docs.map((doc: any, idx: number) => {
      const resourceUri = (doc.resource && doc.resource[0]) || `http://dbpedia.org/resource/${encodeURIComponent(clean)}`;
      const rawLabel = (doc.label && doc.label[0]) || (doc.redirectlabel && doc.redirectlabel[0]) || clean;
      const cleanLabel = rawLabel.replace(/<[^>]+>/g, '');
      const comment = (doc.comment && doc.comment[0]) || '';
      const cleanComment = comment.replace(/<[^>]+>/g, '');
      const typeNames = (doc.typeName || []).map((t: string) => t.split('/').pop()).filter(Boolean);

      return buildResourceItem({
        id: `dbpedia-${encodeURIComponent(cleanLabel)}-${idx}`,
        title: cleanLabel,
        category: 'knowledge',
        description: cleanComment || `Structured ontology entity from the DBpedia Linked Open Data Cloud (${resourceUri}).`,
        previewUrl: resourceUri,
        downloadUrl: `${resourceUri}.json`,
        providerId: 'dbpedia',
        providerName: 'DBpedia Linked Data',
        resourceUrl: resourceUri,
        externalId: resourceUri,
        creatorName: 'DBpedia Association & Semantic Web Community',
        rawLicense: 'Creative Commons Attribution-ShareAlike 3.0 (CC BY-SA) & GFDL',
        licenseUrl: 'https://www.dbpedia.org/about/',
        providerDefaultLicense: {
          type: 'Creative Commons BY-SA',
          commercialAllowed: true,
          attributionRequired: true
        },
        attributes: {
          format: 'rdf/linked-data',
          category: typeNames[0] || 'Entity',
          quality: 'Structured Linked Knowledge',
          tags: ['DBpedia', 'Ontology', 'Semantic Web', ...typeNames.slice(0, 3)]
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('dbpedia', err.message);
    return [];
  }
}

// 6. Wiktionary (Free Multilingual Dictionary & Lexicography)
export async function queryWiktionary(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const clean = encodeURIComponent(query.trim() || 'ephemeral');
  const url = `https://en.wiktionary.org/w/api.php?action=query&list=search&srsearch=${clean}&format=json&srlimit=12&origin=*`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('wiktionary', Date.now() - start);

    const items = data.query?.search || [];
    return items.map((doc: any) => {
      const pageid = doc.pageid;
      const title = doc.title;
      const snippet = (doc.snippet || '').replace(/<\/?[^>]+(>|$)/g, '');
      const resourceUrl = `https://en.wiktionary.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;

      return buildResourceItem({
        id: `wiktionary-${pageid}`,
        title: `Definition: "${title}"`,
        category: 'knowledge',
        description: `${snippet.substring(0, 260)}... Complete etymology, part of speech, pronunciations, and lexical senses from Wiktionary.`,
        previewUrl: resourceUrl,
        downloadUrl: `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(title)}`,
        providerId: 'wiktionary',
        providerName: 'Wiktionary Lexicon',
        resourceUrl,
        externalId: String(pageid),
        creatorName: 'Wiktionary Lexicographers',
        creatorOrg: 'Wikimedia Foundation',
        rawLicense: 'Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)',
        licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
        providerDefaultLicense: {
          type: 'Creative Commons SA',
          commercialAllowed: true,
          attributionRequired: true
        },
        attributes: {
          format: 'lexical/definition',
          quality: 'Crowdsourced Peer-Reviewed Dictionary',
          tags: ['Dictionary', 'Lexicography', 'Etymology', 'Wiktionary', title].filter(Boolean)
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('wiktionary', err.message);
    return [];
  }
}

// 7. Google Custom Search (Web & Knowledge)
export async function queryGoogleSearch(query: string): Promise<ResourceItem[]> {
  const apiKey = getGoogleApiKey();
  const cx = getGoogleSearchEngineId();

  if (!apiKey || !cx) {
    return await queryWikipedia(query);
  }

  const start = Date.now();
  const cleanQ = query.trim() || 'technology';
  const url = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(apiKey)}&cx=${encodeURIComponent(cx)}&q=${encodeURIComponent(cleanQ)}&num=10`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(7500)
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}: ${errText.substring(0, 150)}`);
    }

    const data = await res.json();
    recordProviderSuccess('google_search', Date.now() - start);

    const items = data.items || [];
    return items.map((item: any, idx: number) => {
      const title = item.title || 'Untitled Web Result';
      const snippet = item.snippet || item.htmlSnippet?.replace(/<\/?[^>]+(>|$)/g, '') || '';
      const link = item.link || '';
      const displayLink = item.displayLink || '';
      const thumbnail = item.pagemap?.cse_thumbnail?.[0]?.src || item.pagemap?.cse_image?.[0]?.src;

      return buildResourceItem({
        id: `google-web-${Buffer.from(link || `${idx}-${Date.now()}`).toString('base64url').substring(0, 24)}`,
        title,
        category: 'knowledge',
        description: snippet,
        thumbnailUrl: thumbnail,
        previewUrl: link,
        downloadUrl: link,
        providerId: 'google_search',
        providerName: 'Google Web Search',
        resourceUrl: link,
        externalId: link,
        creatorName: displayLink || 'Web Publisher',
        creatorOrg: 'Google Custom Search Index',
        rawLicense: 'Web Content (Refer to source site terms)',
        licenseUrl: link,
        providerDefaultLicense: {
          type: 'Web Standard',
          commercialAllowed: false,
          attributionRequired: true
        },
        attributes: {
          format: 'text/html',
          quality: 'Indexed Web Document',
          tags: ['Google Search', 'Web', displayLink].filter(Boolean)
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('google_search', err.message);
    return await queryWikipedia(query);
  }
}

/**
 * Wikivoyage - Free Worldwide Travel, Geography, and Destination Encyclopedia
 * MediaWiki REST Action API
 */
export async function queryWikivoyage(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const searchUrl = `https://en.wikivoyage.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=10&origin=*`;

  try {
    const res = await fetch(searchUrl, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('wikivoyage', Date.now() - start);

    const searchHits = data.query?.search || [];
    return searchHits.map((hit: any) => {
      const cleanSnippet = (hit.snippet || '').replace(/<\/?[^>]+(>|$)/g, '').trim();
      const pageUrl = `https://en.wikivoyage.org/wiki/${encodeURIComponent(hit.title.replace(/ /g, '_'))}`;

      return buildResourceItem({
        id: `wikivoyage-${hit.pageid}`,
        title: `${hit.title} - Travel Guide`,
        category: 'knowledge',
        description: cleanSnippet || `Comprehensive open travel guide and cultural directory for ${hit.title}, covering itineraries, local attractions, cuisine, and geography.`,
        thumbnailUrl: `/api/image-proxy?title=${encodeURIComponent(hit.title)}&category=knowledge`,
        previewUrl: pageUrl,
        downloadUrl: pageUrl,
        providerId: 'wikivoyage',
        providerName: 'Wikivoyage World Travel Guide',
        resourceUrl: pageUrl,
        externalId: String(hit.pageid),
        creatorName: 'Wikivoyage Community Contributors',
        creatorOrg: 'Wikimedia Foundation',
        rawLicense: 'Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)',
        licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
        providerDefaultLicense: {
          type: 'CC BY-SA 4.0',
          commercialAllowed: true,
          attributionRequired: true
        },
        attributes: {
          format: 'text/html',
          quality: 'Open Travel Guide (MediaWiki)',
          tags: ['Travel', 'Geography', 'Destinations', 'Culture', 'Wikivoyage', hit.title]
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('wikivoyage', err.message);
    return [];
  }
}
