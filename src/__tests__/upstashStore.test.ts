import type { Redis } from '@upstash/redis';
import { CodeTakenError } from '../store';
import { UpstashLinkStore } from '../upstashStore';

/**
 * A tiny in-memory fake covering the subset of the Upstash Redis client used by
 * UpstashLinkStore. It mimics the relevant semantics (NX writes, hash fields,
 * sets, atomic counters) so the store can be tested without a live Redis.
 */
class FakeRedis {
  private strings = new Map<string, string>();
  private hashes = new Map<string, Map<string, string>>();
  private sets = new Map<string, Set<string>>();

  async get<T = string>(key: string): Promise<T | null> {
    return (this.strings.get(key) as unknown as T) ?? null;
  }

  async set(
    key: string,
    value: string | number,
    opts?: { nx?: boolean },
  ): Promise<'OK' | null> {
    if (opts?.nx && this.strings.has(key)) {
      return null;
    }
    this.strings.set(key, String(value));
    return 'OK';
  }

  async incr(key: string): Promise<number> {
    const next = Number(this.strings.get(key) ?? '0') + 1;
    this.strings.set(key, String(next));
    return next;
  }

  private hash(key: string): Map<string, string> {
    let h = this.hashes.get(key);
    if (!h) {
      h = new Map();
      this.hashes.set(key, h);
    }
    return h;
  }

  async hsetnx(key: string, field: string, value: string | number): Promise<0 | 1> {
    const h = this.hash(key);
    if (h.has(field)) {
      return 0;
    }
    h.set(field, String(value));
    return 1;
  }

  async hset(key: string, obj: Record<string, string | number>): Promise<number> {
    const h = this.hash(key);
    for (const [k, v] of Object.entries(obj)) {
      h.set(k, String(v));
    }
    return Object.keys(obj).length;
  }

  async hgetall<T>(key: string): Promise<T | null> {
    const h = this.hashes.get(key);
    if (!h || h.size === 0) {
      return null;
    }
    return Object.fromEntries(h.entries()) as T;
  }

  async hincrby(key: string, field: string, increment: number): Promise<number> {
    const h = this.hash(key);
    const next = Number(h.get(field) ?? '0') + increment;
    h.set(field, String(next));
    return next;
  }

  async exists(key: string): Promise<number> {
    return this.hashes.has(key) || this.strings.has(key) ? 1 : 0;
  }

  async sadd(key: string, member: string): Promise<number> {
    let s = this.sets.get(key);
    if (!s) {
      s = new Set();
      this.sets.set(key, s);
    }
    const had = s.has(member);
    s.add(member);
    return had ? 0 : 1;
  }

  async smembers(key: string): Promise<string[]> {
    return Array.from(this.sets.get(key) ?? []);
  }
}

function buildStore() {
  return new UpstashLinkStore(new FakeRedis() as unknown as Redis);
}

describe('UpstashLinkStore', () => {
  it('creates and retrieves a record', async () => {
    const store = buildStore();
    const record = await store.create('https://example.com/');
    expect(record.code).toBeTruthy();
    expect(await store.get(record.code)).toMatchObject({
      url: 'https://example.com/',
      hits: 0,
    });
  });

  it('reuses the same code for an identical URL', async () => {
    const store = buildStore();
    const first = await store.create('https://example.com/');
    const second = await store.create('https://example.com/');
    expect(second.code).toBe(first.code);
  });

  it('supports custom codes and rejects duplicates', async () => {
    const store = buildStore();
    const record = await store.create('https://example.com/', 'custom');
    expect(record.code).toBe('custom');
    await expect(store.create('https://other.com/', 'custom')).rejects.toThrow(
      CodeTakenError,
    );
  });

  it('records hits and lists all links', async () => {
    const store = buildStore();
    const { code } = await store.create('https://example.com/');
    await store.recordHit(code);
    await store.recordHit(code);
    expect((await store.get(code))?.hits).toBe(2);

    await store.create('https://second.com/');
    expect(await store.all()).toHaveLength(2);
  });

  it('returns undefined for unknown codes', async () => {
    const store = buildStore();
    expect(await store.get('missing')).toBeUndefined();
    expect(await store.recordHit('missing')).toBeUndefined();
  });
});
