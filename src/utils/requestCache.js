// Request caching utility to prevent duplicate API calls
class RequestCache {
  constructor(ttl = 30000) { // 30 second default TTL
    this.cache = new Map();
    this.ttl = ttl;
  }

  set(key, value, customTtl = null) {
    const timeout = customTtl ?? this.ttl;
    const entry = {
      value,
      expiresAt: Date.now() + timeout,
    };
    this.cache.set(key, entry);
    return value;
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  has(key) {
    return this.get(key) !== null;
  }

  delete(key) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  // Clean up expired entries
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

// Create singleton instances for different cache types
export const marketDataCache = new RequestCache(45000); // 45 seconds for market data
export const watchlistCache = new RequestCache(60000);  // 60 seconds for watchlists
export const searchCache = new RequestCache(120000);     // 2 minutes for search results
export const dashboardCache = new RequestCache(30000);   // 30 seconds for dashboard

export default RequestCache;
