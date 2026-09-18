import { ResourceItem } from '../../src/types/resource';
import { buildResourceItem } from '../normalizer';
import { registerTracker, recordProviderSuccess, recordProviderFailure } from '../telemetry';

const USER_AGENT = 'URMIL-Universal-Browser/1.0 (https://ai.studio; contact: team@urmil.org)';

registerTracker({
  id: 'openfoodfacts',
  name: 'Open Food Facts',
  category: 'Food',
  rateLimit: 'Polite (100 req/min)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'themealdb',
  name: 'TheMealDB',
  category: 'Food',
  rateLimit: 'Unlimited / Open',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'thecocktaildb',
  name: 'TheCocktailDB (Open Mixology & Beverage Database)',
  category: 'Food & Beverage',
  rateLimit: 'Unlimited / Open API',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'openbrewerydb',
  name: 'Open Brewery DB (Craft Breweries & Cideries)',
  category: 'Food & Beverage',
  rateLimit: 'Open Public API (Unlimited / CC0)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'fruityvice',
  name: 'Fruityvice Botanical & Nutrition Database',
  category: 'Food & Nutrition',
  rateLimit: 'Open REST API (Unlimited)',
  authRequired: false,
  authConfigured: true
});

// 1. Open Food Facts (via resilient .net API endpoints)
export async function queryOpenFoodFacts(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  // Try search by categories or search terms
  const url = `https://world.openfoodfacts.net/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=12`;

  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('openfoodfacts', Date.now() - start);

    return (data.products || []).map((p: any) =>
      buildResourceItem({
        id: `off-${p.code || Math.random().toString(36).substring(7)}`,
        title: p.product_name || p.generic_name || 'Food Product',
        category: 'food',
        description: `Brand: ${p.brands || 'Unknown'} • Quantity: ${p.quantity || 'N/A'} • Nutriscore: ${p.nutriscore_grade?.toUpperCase() || 'N/A'} • Ingredients: ${p.ingredients_text ? p.ingredients_text.substring(0, 150) + '...' : 'Available in Open Food Facts'}.`,
        thumbnailUrl: p.image_small_url || p.image_url,
        previewUrl: p.image_url || `https://world.openfoodfacts.org/product/${p.code}`,
        downloadUrl: `https://world.openfoodfacts.org/api/v0/product/${p.code}.json`,
        providerId: 'openfoodfacts',
        providerName: 'Open Food Facts',
        resourceUrl: `https://world.openfoodfacts.org/product/${p.code}`,
        externalId: p.code,
        creatorName: p.creator || 'Open Food Facts Community',
        rawLicense: 'Open Database License (ODbL) & Database Contents License',
        licenseUrl: 'https://opendatacommons.org/licenses/odbl/1-0/',
        providerDefaultLicense: {
          type: 'Open Database License (ODbL)',
          commercialAllowed: true,
          attributionRequired: true
        },
        attributes: {
          format: 'json/food',
          quality: 'Original',
          tags: [p.brands, p.nutriscore_grade ? `Nutri-Score ${p.nutriscore_grade.toUpperCase()}` : undefined].filter(Boolean)
        }
      })
    );
  } catch (err: any) {
    recordProviderFailure('openfoodfacts', err.message);
    return [];
  }
}

// 2. TheMealDB Recipes
export async function queryMealDB(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  let url = `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`;

  try {
    let res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    let data = await res.json();

    // If query returned no direct matches, try first word or a culinary fallback
    if (!data.meals || data.meals.length === 0) {
      const firstWord = query.trim().split(/\s+/)[0];
      if (firstWord && firstWord !== query) {
        const fallbackUrl = `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(firstWord)}`;
        const fallbackRes = await fetch(fallbackUrl, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(4000) });
        if (fallbackRes.ok) {
          data = await fallbackRes.json();
        }
      }
    }

    recordProviderSuccess('themealdb', Date.now() - start);

    return (data.meals || []).map((m: any) =>
      buildResourceItem({
        id: `meal-${m.idMeal}`,
        title: m.strMeal || 'Culinary Recipe',
        category: 'food',
        description: `Category: ${m.strCategory || 'General'} • Cuisine: ${m.strArea || 'International'}. Instructions: ${m.strInstructions ? m.strInstructions.substring(0, 200) + '...' : ''}`,
        thumbnailUrl: m.strMealThumb,
        previewUrl: m.strMealThumb,
        downloadUrl: m.strSource || m.strMealThumb,
        providerId: 'themealdb',
        providerName: 'TheMealDB',
        resourceUrl: m.strSource || `https://www.themealdb.com/meal/${m.idMeal}`,
        externalId: m.idMeal,
        creatorName: 'TheMealDB Open Culinary Database',
        rawLicense: 'Creative Commons Public / Open Database',
        licenseUrl: 'https://www.themealdb.com/api.php',
        attributes: {
          format: 'recipe/json',
          quality: 'Original',
          tags: [m.strCategory, m.strArea].filter(Boolean)
        }
      })
    );
  } catch (err: any) {
    recordProviderFailure('themealdb', err.message);
    return [];
  }
}

// 3. TheCocktailDB (Beverages, Cocktails & Mocktails)
export async function queryCocktailDB(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  let url = `https://www.thecocktaildb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`;

  try {
    let res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    let data = await res.json();

    // If query returned no direct matches, try first word
    if (!data.drinks || data.drinks.length === 0) {
      const firstWord = query.trim().split(/\s+/)[0];
      if (firstWord && firstWord !== query) {
        const fallbackUrl = `https://www.thecocktaildb.com/api/json/v1/1/search.php?s=${encodeURIComponent(firstWord)}`;
        const fallbackRes = await fetch(fallbackUrl, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(4000) });
        if (fallbackRes.ok) {
          data = await fallbackRes.json();
        }
      }
    }

    recordProviderSuccess('thecocktaildb', Date.now() - start);

    return (data.drinks || []).map((d: any) => {
      // Gather ingredients
      const ingredients: string[] = [];
      for (let i = 1; i <= 10; i++) {
        const ing = d[`strIngredient${i}`];
        const measure = d[`strMeasure${i}`];
        if (ing) {
          ingredients.push(measure ? `${measure.trim()} ${ing.trim()}` : ing.trim());
        }
      }

      return buildResourceItem({
        id: `drink-${d.idDrink}`,
        title: d.strDrink || 'Beverage Recipe',
        category: 'food',
        description: `Type: ${d.strAlcoholic || 'Beverage'} • Category: ${d.strCategory || 'Drink'} • Glass: ${d.strGlass || 'Glass'}. Ingredients: ${ingredients.join(', ')}. Instructions: ${d.strInstructions ? d.strInstructions.substring(0, 180) + '...' : ''}`,
        thumbnailUrl: d.strDrinkThumb,
        previewUrl: d.strDrinkThumb,
        downloadUrl: d.strDrinkThumb,
        providerId: 'thecocktaildb',
        providerName: 'TheCocktailDB Mixology',
        resourceUrl: `https://www.thecocktaildb.com/drink/${d.idDrink}`,
        externalId: d.idDrink,
        creatorName: 'TheCocktailDB Open Database',
        rawLicense: 'Creative Commons Open Data',
        licenseUrl: 'https://www.thecocktaildb.com/api.php',
        attributes: {
          format: 'recipe/drink',
          category: d.strCategory,
          alcoholic: d.strAlcoholic,
          glass: d.strGlass,
          quality: 'Original',
          tags: [d.strCategory, d.strAlcoholic, d.strIBA].filter(Boolean)
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('thecocktaildb', err.message);
    return [];
  }
}

// 4. Open Brewery DB (Craft Breweries & Cideries Worldwide)
export async function queryOpenBreweryDB(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const clean = query.trim();
  const url = `https://api.openbrewerydb.org/v1/breweries?by_name=${encodeURIComponent(clean || 'brew')}&per_page=12`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('openbrewerydb', Date.now() - start);

    const breweries = Array.isArray(data) ? data : [];
    return breweries.map((b: any) => {
      const location = [b.city, b.state_province || b.state, b.country].filter(Boolean).join(', ');
      const pageUrl = b.website_url || `https://www.openbrewerydb.org/breweries/${b.id}`;
      const lat = b.latitude ? parseFloat(b.latitude) : undefined;
      const lon = b.longitude ? parseFloat(b.longitude) : undefined;

      return buildResourceItem({
        id: `brewery-${b.id}`,
        title: b.name,
        category: 'food',
        description: `${b.brewery_type ? b.brewery_type.toUpperCase() + ' • ' : ''}${location}${b.phone ? ' • Tel: ' + b.phone : ''}. Open Brewery DB catalog record.`,
        previewUrl: pageUrl,
        downloadUrl: pageUrl,
        providerId: 'openbrewerydb',
        providerName: 'Open Brewery DB',
        resourceUrl: pageUrl,
        externalId: b.id,
        creatorName: 'Open Brewery Database',
        rawLicense: 'CC0 1.0 Universal Public Domain Dedication',
        licenseUrl: 'https://www.openbrewerydb.org/documentation',
        attributes: {
          format: 'json/brewery',
          category: b.brewery_type || 'micro',
          coordinates: lat && lon ? [lat, lon] : undefined,
          region: b.country,
          quality: 'Original',
          tags: ['Brewery', b.brewery_type, b.city, b.country].filter(Boolean)
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('openbrewerydb', err.message);
    return [];
  }
}

/**
 * Fruityvice - Comprehensive Botanical & Macro-Nutrition Registry
 */
export async function queryFruityvice(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = 'https://www.fruityvice.com/api/fruit/all';

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const fruits = await res.json();
    recordProviderSuccess('fruityvice', Date.now() - start);

    if (!Array.isArray(fruits)) return [];

    const q = query.toLowerCase().trim();
    const matches = fruits.filter((f: any) => {
      const name = (f.name || '').toLowerCase();
      const family = (f.family || '').toLowerCase();
      const genus = (f.genus || '').toLowerCase();
      return name.includes(q) || family.includes(q) || genus.includes(q) || q === 'fruit' || q === 'food' || q === 'nutrition';
    });

    const targetList = matches.length > 0 ? matches : fruits.slice(0, 10);

    return targetList.slice(0, 10).map((f: any) => {
      const n = f.nutritions || {};
      const desc = `Botanical Family: ${f.family} • Genus: ${f.genus} • Order: ${f.order} | Nutrition per 100g: ${n.calories ?? 0} kcal, Carbohydrates: ${n.carbohydrates ?? 0}g, Protein: ${n.protein ?? 0}g, Fat: ${n.fat ?? 0}g, Sugar: ${n.sugar ?? 0}g.`;
      const webUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(f.name)}`;

      return buildResourceItem({
        id: `fruityvice-${f.id}`,
        title: `${f.name} (Fruit & Nutritional Profile)`,
        category: 'food',
        description: desc,
        thumbnailUrl: `/api/image-proxy?title=${encodeURIComponent(f.name + ' fruit')}&category=food`,
        previewUrl: webUrl,
        downloadUrl: webUrl,
        providerId: 'fruityvice',
        providerName: 'Fruityvice Nutrition Data',
        resourceUrl: webUrl,
        externalId: String(f.id),
        creatorName: 'Fruityvice Open Nutritional Registry',
        creatorOrg: 'Fruityvice Community',
        rawLicense: 'Open Data (Free Attribution)',
        licenseUrl: 'https://www.fruityvice.com/',
        providerDefaultLicense: {
          type: 'Open Data',
          commercialAllowed: true,
          attributionRequired: true
        },
        attributes: {
          format: 'application/json',
          quality: 'Lab-Verified Nutrition Metrics',
          tags: ['Fruit', 'Nutrition', f.family, f.genus, 'Dietary'].filter(Boolean)
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('fruityvice', err.message);
    return [];
  }
}



