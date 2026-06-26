import { CodeTakenError, InMemoryLinkStore } from '../store';

describe('InMemoryLinkStore', () => {
  it('creates a record with a generated code', async () => {
    const store = new InMemoryLinkStore();
    const record = await store.create('https://example.com/');
    expect(record.code).toBeTruthy();
    expect(record.url).toBe('https://example.com/');
    expect(record.hits).toBe(0);
  });

  it('reuses the same code for an identical URL', async () => {
    const store = new InMemoryLinkStore();
    const first = await store.create('https://example.com/');
    const second = await store.create('https://example.com/');
    expect(second.code).toBe(first.code);
  });

  it('supports custom codes', async () => {
    const store = new InMemoryLinkStore();
    const record = await store.create('https://example.com/', 'mycode');
    expect(record.code).toBe('mycode');
    expect((await store.get('mycode'))?.url).toBe('https://example.com/');
  });

  it('throws when a custom code is already taken', async () => {
    const store = new InMemoryLinkStore();
    await store.create('https://example.com/', 'dup');
    await expect(store.create('https://other.com/', 'dup')).rejects.toThrow(
      CodeTakenError,
    );
  });

  it('increments hit counts', async () => {
    const store = new InMemoryLinkStore();
    const { code } = await store.create('https://example.com/');
    await store.recordHit(code);
    await store.recordHit(code);
    expect((await store.get(code))?.hits).toBe(2);
  });

  it('returns undefined for unknown codes', async () => {
    const store = new InMemoryLinkStore();
    expect(await store.get('nope')).toBeUndefined();
    expect(await store.recordHit('nope')).toBeUndefined();
  });
});
