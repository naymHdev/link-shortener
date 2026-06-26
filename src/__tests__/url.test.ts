import { normalizeUrl } from '../url';

describe('normalizeUrl', () => {
  it('accepts http and https URLs', () => {
    expect(normalizeUrl('https://example.com')).toBe('https://example.com/');
    expect(normalizeUrl('http://example.com/path?q=1')).toBe(
      'http://example.com/path?q=1',
    );
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeUrl('  https://example.com  ')).toBe('https://example.com/');
  });

  it('rejects non-http protocols', () => {
    expect(normalizeUrl('ftp://example.com')).toBeNull();
    expect(normalizeUrl('javascript:alert(1)')).toBeNull();
  });

  it('rejects malformed or empty input', () => {
    expect(normalizeUrl('not a url')).toBeNull();
    expect(normalizeUrl('')).toBeNull();
    expect(normalizeUrl('   ')).toBeNull();
  });
});
