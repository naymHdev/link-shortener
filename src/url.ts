/**
 * Validates and normalizes a URL string. Only http(s) URLs are accepted.
 * Returns the normalized URL on success, or null when the input is invalid.
 */
export function normalizeUrl(input: string): string | null {
  if (typeof input !== 'string') {
    return null;
  }

  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return null;
  }

  if (!parsed.hostname) {
    return null;
  }

  return parsed.toString();
}
