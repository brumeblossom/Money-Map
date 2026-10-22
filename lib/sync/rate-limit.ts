// In-memory sliding window rate limiter for sync API (PRD section 7)
// 60 requests per minute per user on /api/sync/* returning 429 {"error":"rate_limited"}

interface RateLimitRecord {
  timestamps: number[];
}

// Keyed by userId
const userRateLimits = new Map<string, RateLimitRecord>();

/**
 * Check if a request from userId is allowed.
 * Records the request timestamp if within limits.
 *
 * @param userId Auth user ID
 * @param maxRequests Maximum allowed requests per window (default 60)
 * @param windowMs Window duration in milliseconds (default 60,000 ms = 1 minute)
 * @returns true if allowed, false if rate limited
 */
export function checkSyncRateLimit(
  userId: string,
  maxRequests = 60,
  windowMs = 60_000,
): boolean {
  const now = Date.now();
  const windowStart = now - windowMs;

  let record = userRateLimits.get(userId);
  if (!record) {
    record = { timestamps: [] };
    userRateLimits.set(userId, record);
  }

  // Prune timestamps older than window
  record.timestamps = record.timestamps.filter((t) => t > windowStart);

  if (record.timestamps.length >= maxRequests) {
    return false;
  }

  record.timestamps.push(now);
  return true;
}

// Keyed by userId for share links (PRD section 7: 10 a minute on /api/share-links)
const shareLinkRateLimits = new Map<string, RateLimitRecord>();

export function checkShareLinksRateLimit(
  userId: string,
  maxRequests = 10,
  windowMs = 60_000,
): boolean {
  const now = Date.now();
  const windowStart = now - windowMs;

  let record = shareLinkRateLimits.get(userId);
  if (!record) {
    record = { timestamps: [] };
    shareLinkRateLimits.set(userId, record);
  }

  record.timestamps = record.timestamps.filter((t) => t > windowStart);

  if (record.timestamps.length >= maxRequests) {
    return false;
  }

  record.timestamps.push(now);
  return true;
}

/**
 * Clears all rate limit state (useful in test suites)
 */
export function resetSyncRateLimits(): void {
  userRateLimits.clear();
  shareLinkRateLimits.clear();
}
