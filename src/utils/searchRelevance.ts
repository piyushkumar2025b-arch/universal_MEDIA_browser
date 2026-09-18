import { ResourceItem } from '../types/resource';

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function rankClientResults(items: ResourceItem[], query: string): ResourceItem[] {
  const cleanQ = (query || '').trim().toLowerCase();
  if (!cleanQ || items.length <= 1) {
    return items;
  }

  const queryTokens = Array.from(
    new Set(
      cleanQ
        .split(/[\s,._\-:;+/?!&()]+/)
        .filter((t) => t.length > 1 || /\d/.test(t))
    )
  );

  const scoreItem = (item: ResourceItem): number => {
    let score = 0;
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

    // Exact title phrase match
    if (title === cleanQ) {
      score += 200;
    } else if (title.startsWith(cleanQ)) {
      score += 120;
    } else if (title.includes(cleanQ)) {
      score += 90;
    }

    if (creator.includes(cleanQ)) {
      score += 80;
    }

    if (tags.includes(cleanQ)) {
      score += 50;
    }

    if (desc.includes(cleanQ)) {
      score += 30;
    }

    let titleTokensMatched = 0;
    for (const token of queryTokens) {
      const regex = new RegExp(`\\b${escapeRegExp(token)}\\b`, 'i');
      if (regex.test(title)) {
        titleTokensMatched++;
        score += 45;
      } else if (title.includes(token)) {
        titleTokensMatched++;
        score += 25;
      }

      if (creator.includes(token)) {
        score += 30;
      }

      if (tags.includes(token)) {
        score += 20;
      }

      if (desc.includes(token)) {
        score += 10;
      }
    }

    if (titleTokensMatched >= queryTokens.length) {
      score += 60;
    }

    // Media richness signals
    if (item.previewUrl) score += 6;
    if (item.attributes?.embedUrl) score += 5;
    if (item.thumbnailUrl) score += 4;
    if (item.license?.verified) score += 3;

    return score;
  };

  return [...items].sort((a, b) => scoreItem(b) - scoreItem(a));
}
