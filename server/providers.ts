import { SearchFilters } from '../src/types/resource';
import { executeRoutedSearch, RouteExecutionResult } from './provider_router';
import { PROVIDER_TRACKERS } from './telemetry';

export { PROVIDER_TRACKERS };

export const REAL_DATA_POLICY = Object.freeze({
  rule1: "Every resource must originate from an external provider or uploaded user content.",
  rule2: "External resources must contain a real provider identifier.",
  rule3: "Never invent titles, creators, licenses, URLs, checksums, dimensions, file sizes, or quality scores.",
  rule4: "Never generate a fallback resource merely to avoid an empty result screen.",
  rule5: "If provider data is unavailable, mark the field unknown or omit it.",
  rule6: "If verification cannot be performed, integrityVerified is false.",
  rule7: "Never convert 'unknown' into 'verified'.",
  rule8: "Never claim an API request succeeded unless it actually succeeded."
});

export async function executeRealSearch(filters: SearchFilters): Promise<RouteExecutionResult> {
  return await executeRoutedSearch(filters);
}
