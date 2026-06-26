import path from 'path';
import express, { Express, NextFunction, Request, Response } from 'express';
import { CodeTakenError, InMemoryLinkStore, LinkRecord, LinkStore } from './store';
import { isValidCode } from './shortcode';
import { normalizeUrl } from './url';

export interface AppOptions {
  store?: LinkStore;
  /** Base URL used when building the returned short link, e.g. http://localhost:3000 */
  baseUrl?: string;
}

function publicLink(req: Request, baseUrl: string | undefined, code: string): string {
  const base = baseUrl ?? `${req.protocol}://${req.get('host')}`;
  return `${base.replace(/\/+$/, '')}/${code}`;
}

function serializeRecord(
  req: Request,
  baseUrl: string | undefined,
  record: LinkRecord,
): Record<string, unknown> {
  return {
    code: record.code,
    url: record.url,
    shortUrl: publicLink(req, baseUrl, record.code),
    createdAt: record.createdAt,
    hits: record.hits,
  };
}

export function createApp(options: AppOptions = {}): Express {
  const store = options.store ?? new InMemoryLinkStore();
  const baseUrl = options.baseUrl ?? process.env.BASE_URL;

  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  // Create a short link.
  app.post('/api/shorten', (req: Request, res: Response) => {
    const { url, code } = req.body ?? {};

    const normalized = normalizeUrl(url);
    if (!normalized) {
      return res.status(400).json({
        error: 'A valid http(s) URL is required.',
      });
    }

    let customCode: string | undefined;
    if (code !== undefined && code !== null && code !== '') {
      if (typeof code !== 'string' || !isValidCode(code)) {
        return res.status(400).json({
          error: 'Custom code may only contain letters and digits.',
        });
      }
      customCode = code;
    }

    try {
      const record = store.create(normalized, customCode);
      return res.status(201).json(serializeRecord(req, baseUrl, record));
    } catch (err) {
      if (err instanceof CodeTakenError) {
        return res.status(409).json({ error: err.message });
      }
      throw err;
    }
  });

  // Inspect a short link's metadata without redirecting.
  app.get('/api/links/:code', (req: Request, res: Response) => {
    const record = store.get(req.params.code);
    if (!record) {
      return res.status(404).json({ error: 'Short code not found.' });
    }
    return res.json(serializeRecord(req, baseUrl, record));
  });

  // List all short links.
  app.get('/api/links', (req: Request, res: Response) => {
    const links = store.all().map((record) => serializeRecord(req, baseUrl, record));
    res.json({ links });
  });

  // Redirect a short code to its target URL.
  app.get('/:code', (req: Request, res: Response, next: NextFunction) => {
    const { code } = req.params;
    if (!isValidCode(code)) {
      return next();
    }

    const record = store.recordHit(code);
    if (!record) {
      return res.status(404).json({ error: 'Short code not found.' });
    }
    return res.redirect(302, record.url);
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  });

  return app;
}
