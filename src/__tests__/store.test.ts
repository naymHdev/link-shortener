import { CodeTakenError, InMemoryLinkStore } from '../store';

describe('InMemoryLinkStore', () => {
  it('creates a record with a generated code', () => {
    const store = new InMemoryLinkStore();
    const record = store.create('https://example.com/');
    expect(record.code).toBeTruthy();
    expect(record.url).toBe('https://example.com/');
    expect(record.hits).toBe(0);
  });

  it('reuses the same code for an identical URL', () => {
    const store = new InMemoryLinkStore();
    const first = store.create('https://example.com/');
    const second = store.create('https://example.com/');
    expect(second.code).toBe(first.code);
  });

  it('supports custom codes', () => {
    const store = new InMemoryLinkStore();
    const record = store.create('https://example.com/', 'mycode');
    expect(record.code).toBe('mycode');
    expect(store.get('mycode')?.url).toBe('https://example.com/');
  });

  it('throws when a custom code is already taken', () => {
    const store = new InMemoryLinkStore();
    store.create('https://example.com/', 'dup');
    expect(() => store.create('https://other.com/', 'dup')).toThrow(
      CodeTakenError,
    );
  });

  it('increments hit counts', () => {
    const store = new InMemoryLinkStore();
    const { code } = store.create('https://example.com/');
    store.recordHit(code);
    store.recordHit(code);
    expect(store.get(code)?.hits).toBe(2);
  });

  it('returns undefined for unknown codes', () => {
    const store = new InMemoryLinkStore();
    expect(store.get('nope')).toBeUndefined();
    expect(store.recordHit('nope')).toBeUndefined();
  });
});
