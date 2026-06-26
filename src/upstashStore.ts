import { Redis } from '@upstash/redis';
import { encodeBase62 } from './shortcode';
import { CodeTakenError, LinkRecord, LinkStore } from './store';

const COUNTER_KEY = 'shortener:counter';
const INDEX_KEY = 'shortener:codes';
const codeKey = (code: string) => `shortener:link:${code}`;
const urlKey = (url: string) => `shortener:url:${url}`;

interface StoredFields extends Record<string, unknown> {
  code: string;
  url: string;
  createdAt: string;
  hits: number | string;
}

function toRecord(fields: StoredFields | null): LinkRecord | undefined {
  if (!fields || !fields.code) {
    return undefined;
  }
  return {
    code: fields.code,
    url: fields.url,
    createdAt: fields.createdAt,
    hits: Number(fields.hits ?? 0),
  };
}

/**
 * A {@link LinkStore} backed by Upstash Redis (also compatible with Vercel KV).
 * Records are stored as Redis hashes; URLs are de-duplicated via a reverse
 * index and short codes are generated from an atomic counter.
 */
export class UpstashLinkStore implements LinkStore {
  private readonly redis: Redis;
  private readonly startId: number;

  constructor(redis: Redis, startId = 1000) {
    this.redis = redis;
    this.startId = startId;
  }

  async create(url: string, customCode?: string): Promise<LinkRecord> {
    if (customCode !== undefined) {
      const created = await this.tryInsert(customCode, url);
      if (!created) {
        throw new CodeTakenError(customCode);
      }
      return created;
    }

    const existingCode = await this.redis.get<string>(urlKey(url));
    if (existingCode) {
      const existing = await this.get(existingCode);
      if (existing) {
        return existing;
      }
    }

    // Generate codes from an atomic counter until we find a free one.
    for (;;) {
      const next = await this.redis.incr(COUNTER_KEY);
      const code = encodeBase62(this.startId + next);
      const created = await this.tryInsert(code, url);
      if (created) {
        return created;
      }
    }
  }

  private async tryInsert(
    code: string,
    url: string,
  ): Promise<LinkRecord | undefined> {
    // Reserve the code atomically; fails if it already exists.
    const reserved = await this.redis.hsetnx(codeKey(code), 'code', code);
    if (reserved === 0) {
      return undefined;
    }

    const record: LinkRecord = {
      code,
      url,
      createdAt: new Date().toISOString(),
      hits: 0,
    };
    await this.redis.hset(codeKey(code), {
      url: record.url,
      createdAt: record.createdAt,
      hits: 0,
    });
    await this.redis.sadd(INDEX_KEY, code);
    // Best-effort reverse index; first writer wins for de-duplication.
    await this.redis.set(urlKey(url), code, { nx: true });
    return record;
  }

  async get(code: string): Promise<LinkRecord | undefined> {
    const fields = await this.redis.hgetall<StoredFields>(codeKey(code));
    return toRecord(fields);
  }

  async recordHit(code: string): Promise<LinkRecord | undefined> {
    const exists = await this.redis.exists(codeKey(code));
    if (!exists) {
      return undefined;
    }
    const hits = await this.redis.hincrby(codeKey(code), 'hits', 1);
    const record = await this.get(code);
    if (record) {
      record.hits = hits;
    }
    return record;
  }

  async all(): Promise<LinkRecord[]> {
    const codes = await this.redis.smembers(INDEX_KEY);
    const records = await Promise.all(codes.map((code) => this.get(code)));
    return records.filter((r): r is LinkRecord => r !== undefined);
  }
}
