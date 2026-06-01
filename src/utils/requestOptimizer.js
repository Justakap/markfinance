// Request debouncing and rate limiting utility
export class RequestDebouncer {
  constructor(delay = 500) {
    this.delay = delay;
    this.timers = new Map();
  }

  debounce(key, fn, customDelay = null) {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    const timer = setTimeout(() => {
      fn();
      this.timers.delete(key);
    }, customDelay ?? this.delay);

    this.timers.set(key, timer);
  }

  immediate(key, fn) {
    if (this.timers.has(key)) {
      return; // Already queued, skip
    }
    fn();
    this.timers.set(key, true);
  }

  cancel(key) {
    if (this.timers.has(key)) {
      const timer = this.timers.get(key);
      if (typeof timer === 'number') {
        clearTimeout(timer);
      }
      this.timers.delete(key);
    }
  }

  clear() {
    for (const timer of this.timers.values()) {
      if (typeof timer === 'number') {
        clearTimeout(timer);
      }
    }
    this.timers.clear();
  }
}

// Request batching for multiple API calls
export class RequestBatcher {
  constructor(batchDelay = 100, maxBatchSize = 50) {
    this.batchDelay = batchDelay;
    this.maxBatchSize = maxBatchSize;
    this.batches = new Map();
    this.timers = new Map();
  }

  async add(batchKey, item, handler) {
    if (!this.batches.has(batchKey)) {
      this.batches.set(batchKey, []);
    }

    const batch = this.batches.get(batchKey);
    batch.push(item);

    // Flush if batch is full
    if (batch.length >= this.maxBatchSize) {
      return this.flush(batchKey, handler);
    }

    // Schedule flush
    return new Promise((resolve) => {
      if (this.timers.has(batchKey)) {
        clearTimeout(this.timers.get(batchKey));
      }

      const timer = setTimeout(() => {
        this.flush(batchKey, handler).then(resolve);
      }, this.batchDelay);

      this.timers.set(batchKey, timer);
    });
  }

  async flush(batchKey, handler) {
    const batch = this.batches.get(batchKey);
    if (!batch || batch.length === 0) return null;

    this.batches.delete(batchKey);
    if (this.timers.has(batchKey)) {
      clearTimeout(this.timers.get(batchKey));
      this.timers.delete(batchKey);
    }

    return handler(batch);
  }

  clear() {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.batches.clear();
  }
}

// Create singleton instances
export const requestDebouncer = new RequestDebouncer(500);
export const stockUpdateBatcher = new RequestBatcher(200, 100); // Batch stock updates
export const searchDebouncer = new RequestDebouncer(300);
export const marketDataDebouncer = new RequestDebouncer(2000); // 2 second debounce for market data

export default { RequestDebouncer, RequestBatcher };
