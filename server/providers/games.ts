import { ResourceItem } from '../../src/types/resource';
import { buildResourceItem } from '../normalizer';
import { registerTracker, recordProviderSuccess, recordProviderFailure } from '../telemetry';

const USER_AGENT = 'URMIL-Universal-Browser/1.0 (https://ai.studio; contact: team@urmil.org)';

registerTracker({
  id: 'pokeapi',
  name: 'PokéAPI Game & Creature Database',
  category: 'Games',
  rateLimit: '100 req/min (Open)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'open5e_rpg',
  name: 'Open5e Fantasy Lore & Gaming SRD',
  category: 'Games',
  rateLimit: 'Unlimited / Open CC-BY API',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'opentdb',
  name: 'Open Trivia DB Gaming Knowledge & Quizzes',
  category: 'Games & Trivia',
  rateLimit: 'Open Public API (Free CC-BY-SA 4.0)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'archive_pcgames',
  name: 'Internet Archive Classic Games & Emulation',
  category: 'Games & Software',
  rateLimit: 'Polite Open Search (Free Emulated Titles)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'scryfall',
  name: 'Scryfall Magic: The Gathering Open Database',
  category: 'Games & Pop Culture',
  rateLimit: '10 req/sec Open API (No Auth)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'yugioh',
  name: 'Yu-Gi-Oh! YGOPRODeck Open API',
  category: 'Games & Pop Culture',
  rateLimit: 'Open Public API (Unlimited / 20 req/sec)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'freetogame',
  name: 'FreeToGame Free Games Database',
  category: 'Games & Software',
  rateLimit: 'Open REST API (Unlimited)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'dnd5e_srd',
  name: 'D&D 5e Open Game SRD API',
  category: 'Games & Tabletop RPG',
  rateLimit: 'Open REST API (OGL 1.0a)',
  authRequired: false,
  authConfigured: true
});

export async function queryPokeAPI(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const cleanQuery = query.toLowerCase().trim();

  // Try direct lookup or query pokemon list
  const listUrl = `https://pokeapi.co/api/v2/pokemon?limit=150`;

  try {
    const res = await fetch(listUrl, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('pokeapi', Date.now() - start);

    const matches = (data.results || []).filter((p: any) =>
      p.name.includes(cleanQuery)
    ).slice(0, 6);

    const targets = matches.length > 0 ? matches : (data.results || []).slice(0, 6);

    const items: ResourceItem[] = [];
    for (const t of targets) {
      try {
        const dRes = await fetch(t.url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(4000) });
        if (!dRes.ok) continue;
        const d = await dRes.json();
        const sprite = d.sprites?.other?.['official-artwork']?.front_default || d.sprites?.front_default;
        const types = (d.types || []).map((ty: any) => ty.type?.name).join(', ');

        items.push(
          buildResourceItem({
            id: `poke-${d.id}`,
            title: `${d.name.charAt(0).toUpperCase() + d.name.slice(1)} (#${d.id})`,
            category: 'games',
            description: `Type: ${types} • Height: ${d.height / 10}m • Weight: ${d.weight / 10}kg • Base Exp: ${d.base_experience}. Official Game Data.`,
            thumbnailUrl: sprite,
            previewUrl: sprite,
            downloadUrl: sprite,
            providerId: 'pokeapi',
            providerName: 'PokéAPI',
            resourceUrl: `https://pokeapi.co/api/v2/pokemon/${d.id}`,
            externalId: String(d.id),
            creatorName: 'PokéAPI Open Source Collective',
            rawLicense: 'Educational & Fair Use / BSD 3-Clause',
            licenseUrl: 'https://pokeapi.co/docs/v2#fairuse',
            attributes: {
              format: 'png/json',
              quality: 'Original',
              tags: [types, `Gen ${Math.ceil(d.id / 151)}`].filter(Boolean)
            }
          })
        );
      } catch {
        continue;
      }
    }

    return items;
  } catch (err: any) {
    recordProviderFailure('pokeapi', err.message);
    return [];
  }
}

// 2. Open5e Fantasy Lore, Monsters & Tabletop SRD Database
export async function queryOpen5e(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const cleanQ = encodeURIComponent(query.trim() || 'dragon');
  const url = `https://api.open5e.com/v1/monsters/?search=${cleanQ}&limit=12`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6500)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('open5e_rpg', Date.now() - start);

    const results = data.results || [];
    return results.map((m: any) => {
      const slug = m.slug || Math.random().toString(36).substring(7);
      const name = m.name || 'Fantasy Creature';
      const cr = m.challenge_rating ? `CR ${m.challenge_rating}` : 'Unranked';
      const sizeType = `${m.size || 'Medium'} ${m.type || 'Creature'}`;
      const hp = m.hit_points ? `${m.hit_points} HP (${m.hit_dice || ''})` : '';
      const ac = m.armor_class ? `AC ${m.armor_class}` : '';
      const alignment = m.alignment ? `• ${m.alignment}` : '';
      const doc = m.document__title || 'Open5e SRD';
      const pageUrl = `https://open5e.com/monsters/${slug}`;

      return buildResourceItem({
        id: `open5e-${slug}`,
        title: `${name} (${cr})`,
        category: 'games',
        description: `${sizeType} ${alignment}. Combat: ${ac} ${hp ? `• ${hp}` : ''}. Document: ${doc}.`,
        previewUrl: pageUrl,
        downloadUrl: pageUrl,
        providerId: 'open5e_rpg',
        providerName: 'Open5e Gaming Lore',
        resourceUrl: pageUrl,
        externalId: slug,
        creatorName: doc,
        creatorOrg: 'Open5e Tabletop SRD',
        rawLicense: 'Open Gaming License (OGL / CC-BY-4.0)',
        licenseUrl: 'https://open5e.com/legal',
        providerDefaultLicense: {
          type: 'Creative Commons BY',
          commercialAllowed: true,
          attributionRequired: true
        },
        attributes: {
          format: 'json/srd',
          quality: 'Verified Game Lore',
          tags: ['Tabletop RPG', m.type || 'Beast', cr, 'Open5e'].filter(Boolean)
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('open5e_rpg', err.message);
    return [];
  }
}

// 3. Open Trivia Database (Open Gaming Quizzes & Trivia)
export async function queryOpenTriviaDB(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  // OpenTDB provides an open question bank with 10 questions per batch
  const url = `https://opentdb.com/api.php?amount=10&encode=url3986`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('opentdb', Date.now() - start);

    const questions = (data.results || []).map((q: any, idx: number) => {
      const question = decodeURIComponent(q.question);
      const category = decodeURIComponent(q.category);
      const difficulty = decodeURIComponent(q.difficulty);
      const correctAnswer = decodeURIComponent(q.correct_answer);
      const incorrectAnswers = (q.incorrect_answers || []).map((a: string) => decodeURIComponent(a));
      const allAnswers = [...incorrectAnswers, correctAnswer].sort();

      return buildResourceItem({
        id: `trivia-${Date.now()}-${idx}`,
        title: question,
        category: 'games',
        description: `Category: ${category} • Difficulty: ${difficulty.toUpperCase()} • Answer Options: ${allAnswers.join(', ')}. Official Open Trivia DB card.`,
        previewUrl: 'https://opentdb.com',
        downloadUrl: 'https://opentdb.com/api.php?amount=10',
        providerId: 'opentdb',
        providerName: 'Open Trivia DB',
        resourceUrl: 'https://opentdb.com',
        externalId: `otdb-${idx}`,
        creatorName: 'Open Trivia Database Community',
        rawLicense: 'Creative Commons Attribution-ShareAlike 4.0 (CC BY-SA 4.0)',
        licenseUrl: 'https://opentdb.com',
        attributes: {
          format: 'json/trivia',
          category,
          difficulty,
          correctAnswer,
          quality: 'Original',
          tags: ['Trivia', 'Gaming', category, difficulty]
        }
      });
    });

    const clean = query.toLowerCase().trim();
    if (clean) {
      const filtered = questions.filter((q: any) =>
        q.title.toLowerCase().includes(clean) ||
        (q.description && q.description.toLowerCase().includes(clean))
      );
      return filtered.length > 0 ? filtered : questions;
    }
    return questions;
  } catch (err: any) {
    recordProviderFailure('opentdb', err.message);
    return [];
  }
}

// 4. Internet Archive Classic PC Games & Historical Software
export async function queryArchiveGames(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const clean = query.trim() || 'arcade';
  const url = `https://archive.org/advancedsearch.php?q=(collection:(classicpcgames)%20OR%20collection:(historicalsoftware))%20AND%20(${encodeURIComponent(clean)})&fl[]=identifier,title,creator,date,year,description,downloads&sort[]=downloads%20desc&rows=12&page=1&output=json`;

  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('archive_pcgames', Date.now() - start);

    const docs = data.response?.docs || [];
    return docs.map((doc: any) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const dev = doc.creator || 'Classic Game Studio';
      const year = doc.year || (doc.date ? doc.date.substring(0, 4) : undefined);
      const resourceUrl = `https://archive.org/details/${id}`;
      const embedUrl = `https://archive.org/embed/${id}`;
      const thumbUrl = `https://archive.org/services/img/${id}`;

      return buildResourceItem({
        id: `retrogame-${id}`,
        title,
        category: 'games',
        description: `Classic playable video game / software by ${dev} (${year || 'Historic'}). Emulated in browser via the Internet Archive Historical Software Library.`,
        previewUrl: embedUrl,
        downloadUrl: `https://archive.org/download/${id}/${id}.zip`,
        thumbnailUrl: thumbUrl,
        providerId: 'archive_pcgames',
        providerName: 'Internet Archive Software Library',
        resourceUrl,
        externalId: id,
        creatorName: dev,
        rawLicense: 'Preserved Historical Software / Abandonware (Public Access)',
        licenseUrl: 'https://archive.org/about/',
        attributes: {
          format: 'game/dos-emulated',
          quality: 'Playable In-Browser Emulator',
          year: year ? parseInt(String(year), 10) : undefined,
          tags: ['Video Game', 'DOS', 'Retro Game', 'Abandonware', dev]
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('archive_pcgames', err.message);
    return [];
  }
}

// 5. Scryfall Magic: The Gathering
export async function queryScryfallCards(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const clean = encodeURIComponent(query.trim() || 'dragon');
  const url = `https://api.scryfall.com/cards/search?q=${clean}&order=edhrec`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'URMIL-MediaBrowser/2.0' },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('scryfall', Date.now() - start);

    const cards = (data.data || []).slice(0, 15);
    return cards.map((c: any) => {
      const id = c.id;
      const title = c.name;
      const artist = c.artist || 'Magic Artist';
      const typeLine = c.type_line || 'Card';
      const oracleText = c.oracle_text || c.flavor_text || 'Trading Card Game Item';
      const imageUrl = c.image_uris?.normal || c.card_faces?.[0]?.image_uris?.normal || '';
      const thumbUrl = c.image_uris?.small || c.card_faces?.[0]?.image_uris?.small || imageUrl;
      const highResUrl = c.image_uris?.large || c.image_uris?.png || imageUrl;
      const resourceUrl = c.scryfall_uri || `https://scryfall.com/card/${c.set}/${c.collector_number}`;

      return buildResourceItem({
        id: `scryfall-${id}`,
        title,
        category: 'games',
        description: `[${typeLine}] ${oracleText.substring(0, 200)}. Set: ${c.set_name} (${c.released_at ? c.released_at.substring(0, 4) : 'TCG'}). Illustrated by ${artist}.`,
        previewUrl: highResUrl || imageUrl,
        downloadUrl: highResUrl || imageUrl,
        thumbnailUrl: thumbUrl,
        providerId: 'scryfall',
        providerName: 'Scryfall MTG Database',
        resourceUrl,
        externalId: id,
        creatorName: artist,
        creatorOrg: 'Wizards of the Coast / Hasbro',
        rawLicense: 'Wizards of the Coast Fan Content Policy',
        licenseUrl: 'https://company.wizards.com/en/legal/fancontentpolicy',
        attributes: {
          format: 'card/tcg',
          quality: 'High-Resolution Card Art',
          tags: ['Magic: The Gathering', 'MTG', 'Trading Card', typeLine, artist].filter(Boolean)
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('scryfall', err.message);
    return [];
  }
}

// 6. Yu-Gi-Oh! YGOPRODeck
export async function queryYugiohCards(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const clean = encodeURIComponent(query.trim() || 'magician');
  const url = `https://db.ygoprodeck.com/api/v7/cardinfo.php?fname=${clean}&num=15&offset=0`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('yugioh', Date.now() - start);

    const cards = (data.data || []).slice(0, 15);
    return cards.map((c: any) => {
      const id = c.id;
      const title = c.name;
      const cardType = c.type || 'Monster Card';
      const race = c.race || '';
      const desc = c.desc || 'Yu-Gi-Oh Trading Card';
      const img = c.card_images?.[0];
      const imageUrl = img?.image_url || '';
      const thumbUrl = img?.image_url_small || imageUrl;
      const resourceUrl = c.ygoprodeck_url || `https://ygoprodeck.com/card/?search=${id}`;

      return buildResourceItem({
        id: `yugioh-${id}`,
        title,
        category: 'games',
        description: `[${cardType} • ${race}] ${desc.substring(0, 200)}. ATK: ${c.atk ?? '-'} / DEF: ${c.def ?? '-'}. Archetype: ${c.archetype || 'Classic'}.`,
        previewUrl: imageUrl,
        downloadUrl: imageUrl,
        thumbnailUrl: thumbUrl,
        providerId: 'yugioh',
        providerName: 'Yu-Gi-Oh! Database',
        resourceUrl,
        externalId: String(id),
        creatorName: 'Kazuki Takahashi',
        creatorOrg: 'Konami Digital Entertainment',
        rawLicense: 'Konami Fan & Tournament Policy',
        licenseUrl: 'https://ygoprodeck.com/api-guide/',
        attributes: {
          format: 'card/yugioh',
          quality: 'Official Full Card Scan',
          tags: ['Yu-Gi-Oh!', 'Card Game', cardType, race, c.archetype].filter(Boolean)
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('yugioh', err.message);
    return [];
  }
}

// 7. FreeToGame (Free PC & Browser Games)
export async function queryFreeToGame(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const clean = query.toLowerCase().trim();
  const url = `https://www.freetogame.com/api/games`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const games = await res.json();
    recordProviderSuccess('freetogame', Date.now() - start);

    if (!Array.isArray(games)) return [];

    const matched = games.filter((g: any) =>
      clean ? (g.title?.toLowerCase().includes(clean) || g.genre?.toLowerCase().includes(clean) || g.publisher?.toLowerCase().includes(clean)) : true
    ).slice(0, 15);

    const targets = matched.length > 0 ? matched : games.slice(0, 15);

    return targets.map((g: any) => {
      const id = g.id;
      const title = g.title;
      const dev = g.developer || g.publisher || 'Game Studio';
      const genre = g.genre || 'Action';
      const platform = g.platform || 'PC / Web';
      const releaseYear = g.release_date ? parseInt(g.release_date.substring(0, 4), 10) : undefined;
      const resourceUrl = g.freetogame_profile_url || g.game_url;

      return buildResourceItem({
        id: `freetogame-${id}`,
        title,
        category: 'games',
        description: `${g.short_description || 'Free-to-play title'}. Genre: ${genre} • Platform: ${platform} • Developer: ${dev} (${g.release_date || 'Live'}).`,
        previewUrl: g.thumbnail,
        downloadUrl: g.game_url,
        thumbnailUrl: g.thumbnail,
        providerId: 'freetogame',
        providerName: 'FreeToGame Catalog',
        resourceUrl,
        externalId: String(id),
        creatorName: dev,
        creatorOrg: g.publisher || dev,
        rawLicense: 'Free-to-Play Official License',
        licenseUrl: 'https://www.freetogame.com/',
        attributes: {
          format: 'game/executable',
          year: releaseYear,
          quality: 'Verified Free Game',
          tags: ['Free Game', genre, platform, dev].filter(Boolean)
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('freetogame', err.message);
    return [];
  }
}

// 8. D&D 5e SRD API (Spells, Monsters & Magic)
export async function queryDnD5e(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const clean = encodeURIComponent(query.trim() || 'fire');
  const url = `https://www.dnd5eapi.co/api/2014/spells/?name=${clean}`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('dnd5e_srd', Date.now() - start);

    const items = (data.results || []).slice(0, 12);
    return items.map((spell: any) => {
      const id = spell.index;
      const title = spell.name;
      const resourceUrl = `https://www.dnd5eapi.co/api/2014/spells/${id}`;

      return buildResourceItem({
        id: `dnd5e-${id}`,
        title: `D&D Spell: ${title}`,
        category: 'games',
        description: `Official Dungeons & Dragons 5th Edition System Reference Document (SRD) entry for ${title}. Indexed under open gaming rules.`,
        previewUrl: resourceUrl,
        downloadUrl: resourceUrl,
        providerId: 'dnd5e_srd',
        providerName: 'D&D 5e SRD API',
        resourceUrl,
        externalId: id,
        creatorName: 'Wizards of the Coast D&D Team',
        creatorOrg: 'Open Gaming Foundation',
        rawLicense: 'Open Game License (OGL) 1.0a / Creative Commons CC-BY-4.0',
        licenseUrl: 'https://www.dnd5eapi.co/',
        providerDefaultLicense: {
          type: 'Open Access / CC BY',
          commercialAllowed: true,
          attributionRequired: true
        },
        attributes: {
          format: 'json/rules',
          quality: 'Official SRD 5.1 Document',
          tags: ['D&D 5e', 'Tabletop RPG', 'SRD', 'Spell', 'Fantasy'].filter(Boolean)
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('dnd5e_srd', err.message);
    return [];
  }
}



