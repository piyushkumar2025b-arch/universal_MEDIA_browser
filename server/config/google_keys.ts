/**
 * Centralized Google API credentials resolver for YouTube, Google Books, and Google Search.
 * Ensures fallback to user-provided keys if not explicitly defined in container environment.
 */

/**
 * Centralized Google API credentials resolver for YouTube, Google Books, and Google Search.
 * Strictly reads from environment variables without hardcoded fallbacks in source code.
 */

export function getGoogleApiKey(): string {
  return (
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_SEARCH_API_KEY ||
    process.env.YOUTUBE_API_KEY ||
    process.env.GOOGLE_BOOKS_API_KEY ||
    ''
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
    ''
  );
}

