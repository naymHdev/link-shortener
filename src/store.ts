import { encodeBase62 } from './shortcode';

export interface LinkRecord {
  code: string;
  url: string;
  createdAt: string;
  hits: number;
}

export interface LinkStore {
  /** Creates a new short code for a URL, reusing an existing code if present. */
  create(url: string, customCode?: string): LinkRecord;
  /** Looks up a record by its short code. */
  get(code: string): LinkRecord | undefined;
  /** Increments and returns the hit count for a code. */
  recordHit(code: string): LinkRecord | undefined;
  /** Returns all stored records. */
  all(): LinkRecord[];
}

export class CodeTakenError extends Error {
  constructor(code: string) {
    super(`Short code "${code}" is already in use`);
    this.name = 'CodeTakenError';
  }
}

/**
 * An in-memory link store. Codes are generated sequentially and encoded as
 * base62. URLs are de-duplicated so the same URL always maps to one code.
 */
export class InMemoryLinkStore implements LinkStore {
  private readonly byCode = new Map<string, LinkRecord>();
  private readonly codeByUrl = new Map<string, string>();
  private counter: number;

  constructor(startId = 1000) {
    this.counter = startId;
  }

  create(url: string, customCode?: string): LinkRecord {
    if (customCode !== undefined) {
      if (this.byCode.has(customCode)) {
        throw new CodeTakenError(customCode);
      }
      return this.insert(customCode, url);
    }

    const existing = this.codeByUrl.get(url);
    if (existing) {
      const record = this.byCode.get(existing);
      if (record) {
        return record;
      }
    }

    let code = encodeBase62(this.counter++);
    while (this.byCode.has(code)) {
      code = encodeBase62(this.counter++);
    }
    return this.insert(code, url);
  }

  private insert(code: string, url: string): LinkRecord {
    const record: LinkRecord = {
      code,
      url,
      createdAt: new Date().toISOString(),
      hits: 0,
    };
    this.byCode.set(code, record);
    if (!this.codeByUrl.has(url)) {
      this.codeByUrl.set(url, code);
    }
    return record;
  }

  get(code: string): LinkRecord | undefined {
    return this.byCode.get(code);
  }

  recordHit(code: string): LinkRecord | undefined {
    const record = this.byCode.get(code);
    if (!record) {
      return undefined;
    }
    record.hits += 1;
    return record;
  }

  all(): LinkRecord[] {
    return Array.from(this.byCode.values());
  }
}
