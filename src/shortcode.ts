const BASE62_ALPHABET =
  '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const BASE = BASE62_ALPHABET.length;

/**
 * Encodes a non-negative integer into a base62 string.
 */
export function encodeBase62(num: number): string {
  if (!Number.isInteger(num) || num < 0) {
    throw new RangeError('encodeBase62 expects a non-negative integer');
  }
  if (num === 0) {
    return BASE62_ALPHABET[0];
  }

  let result = '';
  let n = num;
  while (n > 0) {
    result = BASE62_ALPHABET[n % BASE] + result;
    n = Math.floor(n / BASE);
  }
  return result;
}

/**
 * Decodes a base62 string back into an integer.
 */
export function decodeBase62(code: string): number {
  let result = 0;
  for (const char of code) {
    const value = BASE62_ALPHABET.indexOf(char);
    if (value === -1) {
      throw new RangeError(`Invalid base62 character: ${char}`);
    }
    result = result * BASE + value;
  }
  return result;
}

const CODE_PATTERN = /^[0-9a-zA-Z]+$/;

/**
 * Returns true when the provided string is a syntactically valid short code.
 */
export function isValidCode(code: string): boolean {
  return CODE_PATTERN.test(code);
}
