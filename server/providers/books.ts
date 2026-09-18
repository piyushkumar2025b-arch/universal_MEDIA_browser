import { ResourceItem } from '../../src/types/resource';
import { buildResourceItem } from '../normalizer';
import { registerTracker, recordProviderSuccess, recordProviderFailure } from '../telemetry';
import { getGoogleBooksApiKey } from '../config/google_keys';

const USER_AGENT = 'URMIL-Universal-Browser/1.0 (https://ai.studio; contact: team@urmil.org)';

registerTracker({
  id: 'open_library',
  name: 'Open Library (Internet Archive)',
  category: 'Books',
  rateLimit: '100 req/min (Open)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'gutendex',
  name: 'Project Gutenberg (Gutendex)',
  category: 'Books',
  rateLimit: 'Polite / Free Open',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'internet_archive_books',
  name: 'Internet Archive Open Books',
  category: 'Books',
  rateLimit: 'Unlimited / Polite',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'google_books',
  name: 'Google Books',
  category: 'Books',
  rateLimit: '1000 req/day',
  authRequired: true,
  authConfigured: Boolean(getGoogleBooksApiKey())
});

registerTracker({
  id: 'poetrydb',
  name: 'PoetryDB Classic Verse & Poetry Archive',
  category: 'Books',
  rateLimit: 'Unlimited / Free Public Domain API',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_comics',
  name: 'Internet Archive Golden Age Comics & Graphic Novels',
  category: 'Books & Graphic Novels',
  rateLimit: 'Polite Open Search (Free Public Domain Comics)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'wikibooks',
  name: 'Wikibooks (Open Educational Textbooks)',
  category: 'Books & Education',
  rateLimit: 'Open MediaWiki API (CC BY-SA)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_childrens_books',
  name: "Children's Digital Library (IACL / Archive)",
  category: 'Books & Illustrated Stories',
  rateLimit: 'Polite Open Search (Free Public Domain Books)',
  authRequired: false,
  authConfigured: true
});

// 1. Open Library Books
export async function queryOpenLibrary(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=15`;

  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(7000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('open_library', Date.now() - start);

    const docs = data.docs || [];
    if (docs.length === 0) {
      return queryArchiveBooks(query);
    }

    return docs.map((b: any) => {
      const coverId = b.cover_i;
      const coverUrl = coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : undefined;
      const key = b.key ? b.key.replace('/works/', '') : Math.random().toString(36).substring(7);
      const authors = (b.author_name || []).slice(0, 3).join(', ');

      return buildResourceItem({
        id: `openlibrary-${key}`,
        title: b.title || 'Book Title',
        category: 'books',
        description: b.first_sentence ? b.first_sentence[0] : (b.subtitle || undefined),
        thumbnailUrl: coverUrl,
        previewUrl: `https://openlibrary.org${b.key}`,
        downloadUrl: `https://openlibrary.org${b.key}`,
        providerId: 'open_library',
        providerName: 'Open Library',
        resourceUrl: `https://openlibrary.org${b.key}`,
        externalId: key,
        creatorName: authors || undefined,
        rawLicense: 'Open Library / Public Domain or Lending Access',
        licenseUrl: 'https://openlibrary.org/terms',
        attributes: {
          format: 'epub/pdf',
          author: authors,
          year: b.first_publish_year,
          isbn: b.isbn?.[0],
          pages: b.number_of_pages_median,
          tags: (b.subject || []).slice(0, 4)
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('open_library', err.message);
    try {
      return await queryArchiveBooks(query);
    } catch {
      return [];
    }
  }
}

// 2. Internet Archive Open Books & Texts
export async function queryArchiveBooks(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const cleanQ = encodeURIComponent(query.replace(/[^\w\s]/gi, ''));
  const url = `https://archive.org/advancedsearch.php?q=mediatype:texts+AND+(${cleanQ})&fl[]=identifier,title,creator,description,year,licenseurl&rows=15&page=1&output=json`;

  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('internet_archive_books', Date.now() - start);

    const docs = data.response?.docs || [];
    return docs.map((doc: any) => {
      const rawDesc = Array.isArray(doc.description) ? doc.description.join(' ') : (typeof doc.description === 'string' ? doc.description : '');
      const desc = rawDesc ? (rawDesc.length > 300 ? rawDesc.substring(0, 300) + '...' : rawDesc) : undefined;
      const creator = Array.isArray(doc.creator) ? doc.creator.join(', ') : (typeof doc.creator === 'string' ? doc.creator : 'Internet Archive Contributor');
      const title = Array.isArray(doc.title) ? doc.title[0] : (typeof doc.title === 'string' ? doc.title : 'Archived Book / Text');
      const year = doc.year ? Number(Array.isArray(doc.year) ? doc.year[0] : doc.year) : undefined;

      return buildResourceItem({
        id: `ia-book-${doc.identifier}`,
        title: title,
        category: 'books',
        description: desc,
        thumbnailUrl: `https://archive.org/services/img/${doc.identifier}`,
        previewUrl: `https://archive.org/details/${doc.identifier}`,
        downloadUrl: `https://archive.org/download/${doc.identifier}`,
        providerId: 'internet_archive_books',
        providerName: 'Internet Archive Open Books',
        resourceUrl: `https://archive.org/details/${doc.identifier}`,
        externalId: doc.identifier,
        creatorName: creator,
        rawLicense: doc.licenseurl || 'Open Access / Public Domain Book',
        licenseUrl: doc.licenseurl || 'https://archive.org/about/terms.php',
        providerDefaultLicense: {
          type: 'Public Domain / CC0',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'pdf/epub/text',
          author: creator,
          year: !isNaN(year as number) ? year : undefined,
          quality: 'Original',
          tags: ['Internet Archive', 'Public Domain', 'Texts']
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('internet_archive_books', err.message);
    return [];
  }
}

// 3. Project Gutenberg (Gutendex - 70,000+ public domain books)
export async function queryGutendex(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = `https://gutendex.com/books/?search=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(4500) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('gutendex', Date.now() - start);

    const items = (data.results || []).slice(0, 15).map((book: any) => {
      const authors = (book.authors || []).map((a: any) => a.name).join(', ');
      const formats = book.formats || {};
      const epub = formats['application/epub+zip'];
      const html = formats['text/html'] || formats['text/plain; charset=utf-8'];
      const cover = formats['image/jpeg'];

      return buildResourceItem({
        id: `gutenberg-${book.id}`,
        title: book.title || 'Classic Literature',
        category: 'books',
        description: `Classic literature preserved by Project Gutenberg. Total downloads: ${book.download_count || 0}.`,
        thumbnailUrl: cover,
        previewUrl: html || epub,
        downloadUrl: epub || html,
        providerId: 'gutendex',
        providerName: 'Project Gutenberg',
        resourceUrl: `https://www.gutenberg.org/ebooks/${book.id}`,
        externalId: String(book.id),
        creatorName: authors || 'Public Domain Author',
        rawLicense: 'Public Domain / Project Gutenberg License',
        licenseUrl: 'https://www.gutenberg.org/policy/license.html',
        providerDefaultLicense: {
          type: 'Public Domain / CC0',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: epub ? 'epub' : 'html',
          author: authors,
          downloads: book.download_count,
          tags: (book.subjects || []).slice(0, 4),
          quality: 'Original'
        }
      });
    });
    if (items.length > 0) return items;
    return await queryArchiveBooks(query);
  } catch (err: any) {
    recordProviderFailure('gutendex', err.message);
    return await queryArchiveBooks(query);
  }
}

// 4. Google Books
export async function queryGoogleBooks(query: string): Promise<ResourceItem[]> {
  const apiKey = getGoogleBooksApiKey();
  if (!apiKey) {
    return [];
  }
  const start = Date.now();
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&key=${encodeURIComponent(apiKey)}&maxResults=15`;

  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('google_books', Date.now() - start);

    return (data.items || []).map((item: any) => {
      const info = item.volumeInfo || {};
      const authors = (info.authors || []).join(', ');
      const thumb = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail;

      return buildResourceItem({
        id: `gbooks-${item.id}`,
        title: info.title || 'Book Edition',
        category: 'books',
        description: info.description ? info.description.substring(0, 300) + '...' : undefined,
        thumbnailUrl: thumb ? thumb.replace('http:', 'https:') : undefined,
        previewUrl: info.previewLink || info.infoLink,
        downloadUrl: info.infoLink,
        providerId: 'google_books',
        providerName: 'Google Books',
        resourceUrl: info.infoLink,
        externalId: item.id,
        creatorName: authors || undefined,
        creatorOrg: info.publisher,
        rawLicense: info.viewability === 'ALL_PAGES' ? 'Full Public Access' : 'Sample / Preview Access',
        licenseUrl: 'https://books.google.com',
        attributes: {
          format: 'book',
          author: authors,
          year: info.publishedDate ? Number(info.publishedDate.substring(0, 4)) : undefined,
          isbn: info.industryIdentifiers?.[0]?.identifier,
          pages: info.pageCount,
          tags: info.categories || []
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('google_books', err.message);
    return [];
  }
}

// 5. PoetryDB Classical Public Domain Poetry & Literature (Thousands of historical poems)
export async function queryPoetryDB(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const cleanQ = query.trim().replace(/[^\w\s]/g, '').slice(0, 30);
  const endpoint = cleanQ && cleanQ.length > 2
    ? `https://poetrydb.org/title/${encodeURIComponent(cleanQ)}`
    : `https://poetrydb.org/random/12`;

  try {
    const res = await fetch(endpoint, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('poetrydb', Date.now() - start);

    let poems = Array.isArray(data) ? data : [];
    if (poems.length === 0 && cleanQ && cleanQ.length > 2) {
      try {
        const fallbackRes = await fetch('https://poetrydb.org/random/12', {
          headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
          signal: AbortSignal.timeout(4000)
        });
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          if (Array.isArray(fallbackData)) {
            poems = fallbackData;
          }
        }
      } catch {
        // ignore fallback errors
      }
    }

    if (poems.length === 0) return [];

    return poems.slice(0, 15).map((poem: any, index: number) => {
      const title = poem.title || 'Classical Poem';
      const author = poem.author || 'Historic Poet';
      const lines = Array.isArray(poem.lines) ? poem.lines : [];
      const stanzaSnippet = lines.slice(0, 4).join(' / ');
      const lineCount = poem.linecount ? `${poem.linecount} lines` : undefined;
      const slug = title.toLowerCase().replace(/[^\w]/g, '-').slice(0, 40);
      const readUrl = `https://en.wikisource.org/wiki/Special:Search?search=${encodeURIComponent(title + ' ' + author)}`;

      return buildResourceItem({
        id: `poetry-${slug}-${index}`,
        title: `${title} — ${author}`,
        category: 'books',
        description: stanzaSnippet ? `"${stanzaSnippet}..." • ${lineCount || 'Classic verse'}. Public Domain Literature.` : `Classic poem by ${author}. ${lineCount || ''}`,
        previewUrl: readUrl,
        downloadUrl: readUrl,
        providerId: 'poetrydb',
        providerName: 'PoetryDB Classic Verse',
        resourceUrl: readUrl,
        externalId: `${slug}-${index}`,
        creatorName: author,
        creatorOrg: 'Public Domain Poetry Archive',
        rawLicense: 'Public Domain (CC0 / Open Literature)',
        licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'text/poem',
          quality: 'Original Historic Verse',
          author,
          tags: ['Poetry', 'Literature', 'Classic Verse', author].filter(Boolean)
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('poetrydb', err.message);
    return [];
  }
}

// 6. Internet Archive Golden Age Comics & Graphic Novels
export async function queryArchiveComics(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const clean = query.trim() || 'comics';
  const url = `https://archive.org/advancedsearch.php?q=mediatype:(texts)%20AND%20(subject:(comic)%20OR%20subject:(comics)%20OR%20collection:(comicbooksbx))%20AND%20(${encodeURIComponent(clean)})&fl[]=identifier,title,creator,date,year,description,downloads&sort[]=downloads%20desc&rows=12&page=1&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6500)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('archive_comics', Date.now() - start);

    const docs = data.response?.docs || [];
    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const publisher = doc.creator || 'Golden Age Comic Publisher';
      const year = doc.year || (doc.date ? doc.date.substring(0, 4) : undefined);
      const resourceUrl = `https://archive.org/details/${id}`;
      const thumbUrl = `https://archive.org/services/img/${id}`;
      const readUrl = `https://archive.org/stream/${id}`;
      const downloadPdf = `https://archive.org/download/${id}/${id}.pdf`;

      return buildResourceItem({
        id: `comic-${id}`,
        title,
        category: 'books',
        description: doc.description ? (typeof doc.description === 'string' ? doc.description.substring(0, 260) + '...' : 'Public domain vintage comic book issue.') : `Golden Age comic book published by ${publisher} (${year || 'Historic'}). Preserved in the Internet Archive Comic Book Collection.`,
        thumbnailUrl: thumbUrl,
        previewUrl: readUrl,
        downloadUrl: downloadPdf,
        providerId: 'archive_comics',
        providerName: 'Golden Age Comics Archive',
        resourceUrl,
        externalId: id,
        creatorName: publisher,
        rawLicense: 'Public Domain Comic Publication',
        licenseUrl: 'https://archive.org/details/comicbooksbx',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'comic/cbr-pdf',
          quality: 'Original High-Resolution Scan',
          year: year ? parseInt(String(year), 10) : undefined,
          tags: ['Comic Book', 'Golden Age', 'Graphic Novel', 'Vintage', publisher].filter(Boolean)
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_comics', err.message);
    return [];
  }
}

// 7. Wikibooks (Open Content Textbooks & Study Manuals)
export async function queryWikibooks(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const clean = encodeURIComponent(query.trim() || 'astronomy');
  const url = `https://en.wikibooks.org/w/api.php?action=query&list=search&srsearch=${clean}&format=json&srlimit=15&origin=*`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('wikibooks', Date.now() - start);

    const items = data.query?.search || [];
    return items.map((doc: any) => {
      const pageid = doc.pageid;
      const title = doc.title;
      const snippet = (doc.snippet || '').replace(/<\/?[^>]+(>|$)/g, '');
      const resourceUrl = `https://en.wikibooks.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;

      return buildResourceItem({
        id: `wikibook-${pageid}`,
        title: `Wikibook: ${title}`,
        category: 'books',
        description: `${snippet.substring(0, 260)}... Open educational textbook hosted by the Wikimedia Foundation. Word count: ${doc.wordcount?.toLocaleString() || '1,000+'}.`,
        previewUrl: resourceUrl,
        downloadUrl: `https://en.wikibooks.org/w/index.php?title=Special:Book&bookcmd=render_article&arttitle=${encodeURIComponent(title)}&writer=rdf2latex`,
        providerId: 'wikibooks',
        providerName: 'Wikibooks Open Textbooks',
        resourceUrl,
        externalId: String(pageid),
        creatorName: 'Wikimedia Contributors',
        creatorOrg: 'Wikimedia Foundation',
        rawLicense: 'Creative Commons Attribution-ShareAlike (CC BY-SA 3.0 / 4.0)',
        licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
        providerDefaultLicense: {
          type: 'Creative Commons SA',
          commercialAllowed: true,
          attributionRequired: true
        },
        attributes: {
          format: 'textbook/wiki-html',
          quality: 'Community Peer-Edited Open Textbook',
          tags: ['Wikibooks', 'Textbook', 'Open Education', 'Wikimedia', title].filter(Boolean)
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('wikibooks', err.message);
    return [];
  }
}

// 8. International Children's Digital Library (IACL / Internet Archive)
export async function queryArchiveChildrensBooks(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const clean = encodeURIComponent(query.trim() || 'fairy');
  const url = `https://archive.org/advancedsearch.php?q=collection:(iacl)+AND+(${clean})&fl[]=identifier,title,creator,year,description&rows=15&output=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('archive_childrens_books', Date.now() - start);

    const docs = data.response?.docs || [];
    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || 'Illustrated Children Book';
      const creator = doc.creator || 'Classic Author & Illustrator';
      const year = doc.year;
      const resourceUrl = `https://archive.org/details/${id}`;
      const thumbUrl = `https://archive.org/services/img/${id}`;
      const readUrl = `https://archive.org/stream/${id}`;
      const downloadPdf = `https://archive.org/download/${id}/${id}.pdf`;

      return buildResourceItem({
        id: `iacl-${id}`,
        title,
        category: 'books',
        description: doc.description
          ? (typeof doc.description === 'string' ? doc.description.substring(0, 260) + '...' : 'Illustrated historic children\'s book.')
          : `Classic illustrated children's story by ${creator} (${year || 'Historic'}). Preserved by the International Children's Digital Library.`,
        thumbnailUrl: thumbUrl,
        previewUrl: readUrl,
        downloadUrl: downloadPdf,
        providerId: 'archive_childrens_books',
        providerName: "Children's Digital Library (IACL)",
        resourceUrl,
        externalId: id,
        creatorName: creator,
        rawLicense: 'Public Domain / Free Open Access',
        licenseUrl: 'https://archive.org/details/iacl',
        providerDefaultLicense: {
          type: 'Public Domain',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'book/illustrated-pdf',
          quality: 'Full-Color Vintage Book Scan',
          year: year ? parseInt(String(year), 10) : undefined,
          tags: ['Children Book', 'Fairy Tale', 'Illustrated', 'Classic', creator].filter(Boolean)
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_childrens_books', err.message);
    return [];
  }
}



