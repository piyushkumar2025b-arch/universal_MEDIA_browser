import { ResourceItem } from '../../src/types/resource';
import { buildResourceItem } from '../normalizer';
import { registerTracker, recordProviderSuccess, recordProviderFailure } from '../telemetry';

const USER_AGENT = 'URMIL-Universal-Browser/1.0 (https://ai.studio; contact: team@urmil.org)';

registerTracker({
  id: 'frankfurter',
  name: 'Frankfurter (European Central Bank Forex)',
  category: 'Finance',
  rateLimit: 'Unlimited / Open',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'coingecko',
  name: 'CoinGecko Crypto & Digital Asset Market',
  category: 'Finance',
  rateLimit: 'Open Public API (10-30 req/min)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'exchange_rates',
  name: 'Open Exchange Rates FX Benchmark',
  category: 'Finance & Currencies',
  rateLimit: 'Open Public API (160+ Currencies)',
  authRequired: false,
  authConfigured: true
});

export async function queryFrankfurter(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  // Check if query mentions a currency or default to USD/EUR
  const base = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF'].find((c) =>
    query.toUpperCase().includes(c)
  ) || 'USD';

  const url = `https://api.frankfurter.dev/v1/latest?from=${base}`;

  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('frankfurter', Date.now() - start);

    const rates = data.rates || {};
    const topPairs = Object.entries(rates).slice(0, 8).map(([c, r]) => `${c}: ${r}`).join(' • ');

    return [
      buildResourceItem({
        id: `fx-${base}-${data.date}`,
        title: `${base} Foreign Exchange Rates (ECB Reference)`,
        category: 'finance',
        description: `Official European Central Bank benchmark exchange rates for 1 ${base}. Top currency pairs: ${topPairs}. Reference date: ${data.date}.`,
        previewUrl: `https://www.frankfurter.app/`,
        downloadUrl: url,
        providerId: 'frankfurter',
        providerName: 'Frankfurter / European Central Bank',
        resourceUrl: `https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html`,
        externalId: `${base}-${data.date}`,
        creatorName: 'European Central Bank (ECB)',
        rawLicense: 'Open Data (European Central Bank Copyright)',
        licenseUrl: 'https://www.ecb.europa.eu/services/disclaimer/html/index.en.html',
        providerDefaultLicense: {
          type: 'Public Domain / CC0',
          commercialAllowed: true,
          attributionRequired: true
        },
        attributes: {
          format: 'json',
          currencyBase: base,
          rates: rates,
          quality: 'Original',
          tags: ['Forex', 'European Central Bank', base, 'Currency Rates']
        }
      })
    ];
  } catch (err: any) {
    recordProviderFailure('frankfurter', err.message);
    return [];
  }
}

// 2. CoinGecko (Cryptocurrencies, Tokens & Digital Assets)
export async function queryCoinGecko(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const clean = query.trim().toLowerCase();
  const searchUrl = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(clean || 'bitcoin')}`;

  try {
    const res = await fetch(searchUrl, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('coingecko', Date.now() - start);

    const coins = (data.coins || []).slice(0, 10);
    return coins.map((c: any) => {
      const pageUrl = `https://www.coingecko.com/en/coins/${c.id}`;
      const symbol = (c.symbol || '').toUpperCase();
      const rankText = c.market_cap_rank ? `Rank #${c.market_cap_rank}` : 'Unranked';

      return buildResourceItem({
        id: `coin-${c.id}`,
        title: `${c.name} (${symbol})`,
        category: 'finance',
        description: `${c.name} (${symbol}) digital currency asset • Market Cap ${rankText} • Tracked on CoinGecko open financial network.`,
        thumbnailUrl: c.large || c.thumb,
        previewUrl: pageUrl,
        downloadUrl: c.large || c.thumb || pageUrl,
        providerId: 'coingecko',
        providerName: 'CoinGecko Markets',
        resourceUrl: pageUrl,
        externalId: c.id,
        creatorName: 'CoinGecko Global Financial Index',
        rawLicense: 'Open Public Data / CoinGecko API',
        licenseUrl: 'https://www.coingecko.com/en/api_terms',
        attributes: {
          format: 'json/market',
          symbol,
          rank: c.market_cap_rank,
          quality: 'Original',
          tags: ['Crypto', symbol, rankText, 'Digital Asset'].filter(Boolean)
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('coingecko', err.message);
    return [];
  }
}

// 3. Open Exchange Rates FX Matrix
export async function queryExchangeRates(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const base = ['USD', 'EUR', 'GBP', 'JPY', 'INR', 'CAD', 'AUD', 'CHF', 'CNY'].find((c) =>
    query.toUpperCase().includes(c)
  ) || 'USD';
  const url = `https://open.er-api.com/v6/latest/${base}`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('exchange_rates', Date.now() - start);

    const rates = data.rates || {};
    const dateStr = data.time_last_update_utc || new Date().toISOString();
    const commonPairs = ['EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'INR', 'CNY', 'SGD', 'NZD']
      .filter((c) => c !== base && rates[c])
      .map((c) => `1 ${base} = ${rates[c]} ${c}`)
      .join(' • ');

    return [
      buildResourceItem({
        id: `fx-matrix-${base}-${Date.now().toString().substring(0, 7)}`,
        title: `${base} Global Currency Rates & FX Matrix`,
        category: 'finance',
        description: `Live interbank currency rates for base currency ${base}. Benchmark rates: ${commonPairs}. Updated: ${dateStr}. Over 160 global currencies supported.`,
        previewUrl: `https://open.er-api.com/v6/latest/${base}`,
        downloadUrl: `https://open.er-api.com/v6/latest/${base}`,
        providerId: 'exchange_rates',
        providerName: 'Open Exchange Rates (ER-API)',
        resourceUrl: `https://www.exchangerate-api.com/`,
        externalId: `${base}-fx`,
        creatorName: 'ExchangeRate-API Global Financial Feed',
        rawLicense: 'Open Access Financial Data Feed',
        licenseUrl: 'https://www.exchangerate-api.com/terms',
        providerDefaultLicense: {
          type: 'Open Access / CC BY',
          commercialAllowed: true,
          attributionRequired: true
        },
        attributes: {
          format: 'financial/fx-rates-json',
          currencyBase: base,
          quality: 'Live Interbank Rates',
          tags: ['Forex', 'Currency', 'Exchange Rate', base, 'Interbank'].filter(Boolean)
        }
      })
    ];
  } catch (err: any) {
    recordProviderFailure('exchange_rates', err.message);
    return [];
  }
}


