import { Redis } from '@upstash/redis';
import { InMemoryLinkStore, LinkStore } from './store';
import { UpstashLinkStore } from './upstashStore';

/**
 * Reads Upstash/Vercel KV connection details from the environment.
 * Supports both Upstash-native and Vercel KV variable names.
 */
function readRedisConfig(): { url: string; token: string } | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

  if (url && token) {
    return { url, token };
  }
  return null;
}

/**
 * Builds the appropriate {@link LinkStore} for the current environment:
 * Upstash Redis when credentials are present, otherwise an in-memory store.
 */
export function createStore(): LinkStore {
  const config = readRedisConfig();
  if (config) {
    const redis = new Redis({ url: config.url, token: config.token });
    return new UpstashLinkStore(redis);
  }

  if (process.env.NODE_ENV === 'production') {
    // eslint-disable-next-line no-console
    console.warn(
      '[link-shortener] No Redis credentials found; using in-memory store. ' +
        'Links will NOT persist across serverless invocations. Set ' +
        'UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN (or the Vercel KV ' +
        'equivalents) for persistent storage.',
    );
  }
  return new InMemoryLinkStore();
}
