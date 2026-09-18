import { ResourceItem, SearchFilters } from '../src/types/resource';

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function computeTextRelevance(
  item: ResourceItem,
  query: string
): { score: number; hasAnyMatch: boolean; titleMatchCount: number } {
  const cleanQ = (query || '').trim().toLowerCase();
  if (!cleanQ) {
    return { score: 0, hasAnyMatch: true, titleMatchCount: 0 };
  }

  // Tokenize query into distinct words (skip tiny single-char tokens unless alphanumeric digit)
  const queryTokens = Array.from(
    new Set(
      cleanQ
        .split(/[\s,._\-:;+/?!&()]+/)
        .filter((t) => t.length > 1 || /\d/.test(t))
    )
  );

  if (queryTokens.length === 0) {
    return { score: 0, hasAnyMatch: true, titleMatchCount: 0 };
  }

  const title = (item.title || '').toLowerCase();
  const desc = (item.description || '').toLowerCase();
  const creator = (
    item.creator?.name ||
    item.attributes.author ||
    item.attributes.artist ||
    item.attributes.channel ||
    ''
  ).toLowerCase();
  const tags = Array.isArray(item.attributes.tags)
    ? item.attributes.tags.join(' ').toLowerCase()
    : (item.attributes.genre || item.attributes.categories || '').toString().toLowerCase();
  const id = (item.id || item.source?.externalId || '').toLowerCase();

  let score = 0;
  let titleMatchCount = 0;
  let creatorMatchCount = 0;
  let tagMatchCount = 0;
  let descMatchCount = 0;

  // Exact phrase matches
  if (title === cleanQ) {
    score += 160;
    titleMatchCount = queryTokens.length;
  } else if (title.startsWith(cleanQ)) {
    score += 100;
    titleMatchCount = queryTokens.length;
  } else if (title.includes(cleanQ)) {
    score += 80;
    titleMatchCount = queryTokens.length;
  }

  if (creator.includes(cleanQ)) {
    score += 70;
    creatorMatchCount = queryTokens.length;
  }

  if (tags.includes(cleanQ)) {
    score += 45;
    tagMatchCount = queryTokens.length;
  }

  if (desc.includes(cleanQ)) {
    score += 30;
    descMatchCount = queryTokens.length;
  }

  // Token-by-token checks
  for (const token of queryTokens) {
    const escaped = escapeRegExp(token);
    const wordBoundaryRegex = new RegExp(`\\b${escaped}\\b`, 'i');

    if (wordBoundaryRegex.test(title)) {
      titleMatchCount++;
      score += 40;
    } else if (title.includes(token)) {
      titleMatchCount++;
      score += 25;
    }

    if (wordBoundaryRegex.test(creator)) {
      creatorMatchCount++;
      score += 30;
    } else if (creator.includes(token)) {
      creatorMatchCount++;
      score += 18;
    }

    if (tags.includes(token)) {
      tagMatchCount++;
      score += 15;
    }

    if (desc.includes(token)) {
      descMatchCount++;
      score += 8;
    }

    if (id.includes(token)) {
      score += 20;
    }
  }

  // Full query coverage bonus: all tokens present in title or creator
  if (titleMatchCount >= queryTokens.length) {
    score += 60;
  } else if (titleMatchCount > 0 && creatorMatchCount > 0) {
    score += 35;
  }

  const hasAnyMatch =
    titleMatchCount > 0 ||
    creatorMatchCount > 0 ||
    tagMatchCount > 0 ||
    descMatchCount > 0 ||
    score > 0;

  return { score, hasAnyMatch, titleMatchCount };
}

export function rankAndFilterResources(
  items: ResourceItem[],
  filters: SearchFilters
): ResourceItem[] {
  let filtered = [...items];
  const query = (filters.query || '').trim();

  // Quality filter
  if (filters.quality && filters.quality !== 'Any') {
    filtered = filtered.filter((i) => i.attributes.quality === filters.quality);
  }

  // License filter
  if (filters.license && filters.license.length > 0) {
    filtered = filtered.filter((item) => {
      if (!item.license) return false;
      return filters.license.some((lic) => {
        if (lic === 'Commercial allowed') return item.license?.commercialAllowed === true;
        if (lic === 'Public Domain / CC0')
          return item.license?.type?.includes('Public Domain') || item.license?.type?.includes('CC0');
        if (lic === 'Attribution required') return item.license?.attributionRequired === true;
        if (lic === 'Open Access') return item.license?.type?.includes('Open Access');
        return item.license?.type === lic;
      });
    });
  }

  // Format filter
  if (filters.format && filters.format !== 'all') {
    filtered = filtered.filter(
      (i) =>
        i.attributes.format &&
        i.attributes.format.toLowerCase().includes(filters.format.toLowerCase())
    );
  }

  // Pre-calculate textual relevance for every item
  const relevanceMap = new Map<string, { score: number; hasAnyMatch: boolean; titleMatchCount: number }>();
  let totalMatches = 0;

  for (const item of filtered) {
    const rel = computeTextRelevance(item, query);
    relevanceMap.set(item.id, rel);
    if (rel.hasAnyMatch) {
      totalMatches++;
    }
  }

  // If the user entered a specific search query and we have matching items,
  // filter out completely irrelevant items (zero matches in title, desc, creator, or tags)
  if (query.length >= 2 && totalMatches > 0) {
    const matchedItems = filtered.filter((item) => relevanceMap.get(item.id)?.hasAnyMatch);
    if (matchedItems.length >= 4) {
      filtered = matchedItems;
    }
  }

  // Sort
  if (filters.sortBy === 'newest') {
    filtered.sort((a, b) => (b.attributes.year || 0) - (a.attributes.year || 0));
  } else if (filters.sortBy === 'downloads') {
    filtered.sort(
      (a, b) =>
        (b.attributes.downloads || b.attributes.citations || 0) -
        (a.attributes.downloads || a.attributes.citations || 0)
    );
  } else if (filters.sortBy === 'quality') {
    const qualityScore = (i: ResourceItem) => {
      if (i.attributes.quality === '4K' || i.attributes.quality === 'Original') return 4;
      if (i.attributes.quality === 'Full HD') return 3;
      if (i.attributes.quality === 'HD') return 2;
      return 1;
    };
    filtered.sort((a, b) => qualityScore(b) - qualityScore(a));
  } else {
    // Relevance sort: textual relevance + rich media signals
    const totalRelevanceScore = (i: ResourceItem) => {
      const textRel = relevanceMap.get(i.id) || computeTextRelevance(i, query);
      let score = textRel.score;

      // Penalize items with zero keyword matches when query is non-empty
      if (query.length >= 2 && !textRel.hasAnyMatch) {
        score -= 200;
      }

      // Richness & playable signals as tie-breakers
      if (i.previewUrl) score += 6;
      if (i.downloadUrl) score += 4;
      if (i.thumbnailUrl) score += 4;
      if (i.license?.verified) score += 4;
      if (i.license?.commercialAllowed) score += 2;
      if (i.creator?.name) score += 3;
      if (i.attributes.dimensions || i.attributes.resolution) score += 3;
      if (i.attributes.embedUrl) score += 5;
      if (i.attributes.doi || i.attributes.citations) score += 2;

      // Audio / Music streamable fidelity
      if (i.category === 'music' || i.category === 'audio') {
        if (i.attributes.isStreamable || i.previewUrl) score += 6;
        if (i.attributes.album) score += 3;
        if (i.attributes.genre) score += 2;
        if (i.attributes.duration) score += 2;
      }

      return score;
    };

    filtered.sort((a, b) => totalRelevanceScore(b) - totalRelevanceScore(a));

    // Multi-Modal Discovery Weaving: When browsing 'all', interleave across
    // images, videos, audio, papers, and books so users enjoy a rich media mix
    // only if the items actually match the query!
    if (!filters.category || filters.category === 'all') {
      filtered = interleaveMultiModal(filtered, relevanceMap, query);
    } else if (filters.category === 'music' || filters.category === 'audio') {
      filtered = interleaveProviderDiversity(filtered);
    }
  }

  return filtered;
}

function interleaveProviderDiversity(items: ResourceItem[]): ResourceItem[] {
  if (items.length <= 4) return items;

  const byProvider = new Map<string, ResourceItem[]>();
  for (const item of items) {
    const pid = item.source.providerId;
    if (!byProvider.has(pid)) {
      byProvider.set(pid, []);
    }
    byProvider.get(pid)!.push(item);
  }

  const result: ResourceItem[] = [];
  const providers = Array.from(byProvider.keys());
  let hasMore = true;

  while (hasMore) {
    hasMore = false;
    for (const pid of providers) {
      const providerItems = byProvider.get(pid)!;
      if (providerItems.length > 0) {
        const takeCount = Math.min(2, providerItems.length);
        for (let i = 0; i < takeCount; i++) {
          result.push(providerItems.shift()!);
        }
        if (providerItems.length > 0) {
          hasMore = true;
        }
      }
    }
  }

  return result;
}

function interleaveMultiModal(
  items: ResourceItem[],
  relevanceMap: Map<string, { score: number; hasAnyMatch: boolean; titleMatchCount: number }>,
  query: string
): ResourceItem[] {
  if (items.length <= 4) return items;

  // If query is present, do NOT let items with zero matches take priority
  const isRelevant = (i: ResourceItem) => {
    if (!query) return true;
    return relevanceMap.get(i.id)?.hasAnyMatch !== false;
  };

  const relevantItems = query ? items.filter(isRelevant) : items;
  const irrelevantItems = query ? items.filter((i) => !isRelevant(i)) : [];

  const images = relevantItems.filter((i) => i.category === 'images' || i.category === 'art' || i.category === 'gifs');
  const videos = relevantItems.filter((i) => i.category === 'videos');
  const audio = relevantItems.filter((i) => i.category === 'music' || i.category === 'audio');
  const papers = relevantItems.filter((i) => i.category === 'papers');
  const books = relevantItems.filter((i) => i.category === 'books');
  const others = relevantItems.filter(
    (i) => !['images', 'art', 'gifs', 'videos', 'music', 'audio', 'papers', 'books'].includes(i.category)
  );

  const interleaved: ResourceItem[] = [];
  let imgIdx = 0;
  let vidIdx = 0;
  let audIdx = 0;
  let papIdx = 0;
  let bkIdx = 0;
  let othIdx = 0;

  const total = relevantItems.length;
  while (interleaved.length < total) {
    let addedAny = false;

    // 1. Video
    if (vidIdx < videos.length) {
      interleaved.push(videos[vidIdx++]);
      addedAny = true;
    }

    // 2. High-resolution images (up to 2)
    for (let c = 0; c < 2; c++) {
      if (imgIdx < images.length) {
        interleaved.push(images[imgIdx++]);
        addedAny = true;
      }
    }

    // 3. Books & literature
    if (bkIdx < books.length) {
      interleaved.push(books[bkIdx++]);
      addedAny = true;
    }

    // 4. Playable audio/music track
    if (audIdx < audio.length) {
      interleaved.push(audio[audIdx++]);
      addedAny = true;
    }

    // 5. Research paper
    if (papIdx < papers.length) {
      interleaved.push(papers[papIdx++]);
      addedAny = true;
    }

    // 6. Encyclopedic / data / map entity
    if (othIdx < others.length) {
      interleaved.push(others[othIdx++]);
      addedAny = true;
    }

    // Flush remaining
    if (!addedAny) {
      while (vidIdx < videos.length) interleaved.push(videos[vidIdx++]);
      while (bkIdx < books.length) interleaved.push(books[bkIdx++]);
      while (imgIdx < images.length) interleaved.push(images[imgIdx++]);
      while (audIdx < audio.length) interleaved.push(audio[audIdx++]);
      while (papIdx < papers.length) interleaved.push(papers[papIdx++]);
      while (othIdx < others.length) interleaved.push(others[othIdx++]);
      break;
    }
  }

  // Append any irrelevant items at the very end if total items was small
  return [...interleaved, ...irrelevantItems];
}
