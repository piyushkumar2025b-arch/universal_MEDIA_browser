/**
 * Centralized Google API credentials resolver for YouTube, Google Books, and Google Search.
 * Ensures fallback to user-provided keys if not explicitly defined in container environment.
 */

export const GOOGLE_CONFIG = {
  // Provided user API key configured for YouTube Data API v3 & Google Books
  DEFAULT_API_KEY: 'AIzaSyA-zrYkTBm-3lC8mmNRMGFxkmC5P9Pz65w',
  // Provided Google Programmable Search Engine CX
  DEFAULT_CX: '30821318e53074c88'
};

export function getGoogleApiKey(): string {
  return (
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_SEARCH_API_KEY ||
    process.env.YOUTUBE_API_KEY ||
    process.env.GOOGLE_BOOKS_API_KEY ||
    GOOGLE_CONFIG.DEFAULT_API_KEY
  );
}

export function getYouTubeApiKey(): string {
  return process.env.YOUTUBE_API_KEY || getGoogleApiKey();
}

export function getGoogleBooksApiKey(): string {
  return process.env.GOOGLE_BOOKS_API_KEY || getGoogleApiKey();
}

export function getGoogleSearchEngineId(): string {
  return (
    process.env.GOOGLE_SEARCH_ENGINE_ID ||
    process.env.GOOGLE_CSE_ID ||
    process.env.GOOGLE_CUSTOM_SEARCH_CX ||
    GOOGLE_CONFIG.DEFAULT_CX
  );
}
