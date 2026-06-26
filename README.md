# Link Shortener

A simple URL shortener built with **TypeScript** and **Express**, with a minimal web UI.

## Features

- Shorten any `http(s)` URL into a compact base62 short code
- Optional custom short codes
- `302` redirect from short code to the original URL
- Hit counting per link
- REST API + a minimal single-page frontend
- In-memory storage (swappable via the `LinkStore` interface)
- Fully typed, linted, and unit/integration tested

## Getting started

```bash
npm install
npm run dev      # start with hot reload on http://localhost:3000
```

Then open http://localhost:3000 in your browser.

### Production build

```bash
npm run build
npm start
```

## Configuration

| Env var                     | Default      | Description                                       |
| --------------------------- | ------------ | ------------------------------------------------- |
| `PORT`                      | `3000`       | Port the server listens on                        |
| `BASE_URL`                  | request host | Base URL used when building returned links        |
| `UPSTASH_REDIS_REST_URL`    | —            | Upstash Redis REST URL (enables persistent store) |
| `UPSTASH_REDIS_REST_TOKEN`  | —            | Upstash Redis REST token                          |
| `KV_REST_API_URL`           | —            | Vercel KV URL (alternative to Upstash vars)       |
| `KV_REST_API_TOKEN`         | —            | Vercel KV token (alternative to Upstash vars)     |

### Storage

The app selects its storage backend automatically:

- If Upstash/Vercel KV credentials are present → **Upstash Redis** (persistent).
- Otherwise → **in-memory** (fast for local dev, but state is lost on restart and
  does **not** persist across serverless invocations).

## Deploying to Vercel

This repo is Vercel-ready:

- `api/index.ts` exports the Express app as a serverless function.
- `vercel.json` rewrites all non-static requests to that function.
- `public/` is served as static assets.

Steps:

1. **Create an Upstash Redis database** (required for links to persist):
   - Easiest: in the Vercel dashboard → **Storage** → create an **Upstash Redis**
     (or **KV**) database and connect it to the project. Vercel injects the
     `KV_REST_API_URL` / `KV_REST_API_TOKEN` (or `UPSTASH_*`) env vars for you.
   - Or create one at [upstash.com](https://upstash.com), then copy the
     **REST URL** and **REST token** into the project's env vars as
     `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
2. **Import the repo** into Vercel (New Project → pick this repo). Framework
   preset: **Other**. No build settings changes are needed.
3. **Deploy.** Your app will be live at `https://<project>.vercel.app`.

> Without Redis credentials the deploy still works, but shortened links will
> reset between requests. Set the env vars for real usage.

## API

### `POST /api/shorten`

Body:

```json
{ "url": "https://example.com/very/long/link", "code": "optional-custom" }
```

Response `201`:

```json
{
  "code": "g8",
  "url": "https://example.com/very/long/link",
  "shortUrl": "http://localhost:3000/g8",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "hits": 0
}
```

### `GET /:code`

Redirects (`302`) to the original URL and increments the hit count.

### `GET /api/links/:code`

Returns metadata for a single short link.

### `GET /api/links`

Returns all short links.

### `GET /api/health`

Health check.

## Scripts

| Script              | Description                       |
| ------------------- | --------------------------------- |
| `npm run dev`       | Start dev server with hot reload  |
| `npm run build`     | Compile TypeScript to `dist/`     |
| `npm start`         | Run the compiled server           |
| `npm test`          | Run the Jest test suite           |
| `npm run lint`      | Lint with ESLint                  |
| `npm run typecheck` | Type-check without emitting       |

## Project structure

```
api/
  index.ts        Vercel serverless entry (exports the Express app)
src/
  app.ts          Express app factory (routes)
  server.ts       Server entrypoint (local/Node)
  store.ts        LinkStore interface + in-memory implementation
  upstashStore.ts Upstash Redis-backed LinkStore
  createStore.ts  Picks the store based on env (Redis vs in-memory)
  shortcode.ts    base62 encode/decode + code validation
  url.ts          URL validation/normalization
  __tests__/      Jest unit + integration tests
public/
  index.html      Frontend markup
  styles.css      Styles
  app.js          Frontend logic
vercel.json       Vercel routing config
```

## License

MIT
