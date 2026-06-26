import { decodeBase62, encodeBase62, isValidCode } from '../shortcode';

describe('base62 encoding', () => {
  it('encodes zero to the first alphabet character', () => {
    expect(encodeBase62(0)).toBe('0');
  });

  it('round-trips a range of integers', () => {
    for (const n of [1, 61, 62, 63, 1000, 123456, 9999999]) {
      expect(decodeBase62(encodeBase62(n))).toBe(n);
    }
  });

  it('throws on negative numbers', () => {
    expect(() => encodeBase62(-1)).toThrow(RangeError);
  });

  it('throws when decoding invalid characters', () => {
    expect(() => decodeBase62('abc$')).toThrow(RangeError);
  });
});

describe('isValidCode', () => {
  it('accepts alphanumeric codes', () => {
    expect(isValidCode('abc123')).toBe(true);
  });

  it('rejects codes with symbols or slashes', () => {
    expect(isValidCode('ab/c')).toBe(false);
    expect(isValidCode('')).toBe(false);
    expect(isValidCode('a b')).toBe(false);
  });
});
