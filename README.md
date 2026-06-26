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

| Env var    | Default                 | Description                                   |
| ---------- | ----------------------- | --------------------------------------------- |
| `PORT`     | `3000`                  | Port the server listens on                    |
| `BASE_URL` | request host            | Base URL used when building returned links    |

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
src/
  app.ts          Express app factory (routes)
  server.ts       Server entrypoint
  store.ts        LinkStore interface + in-memory implementation
  shortcode.ts    base62 encode/decode + code validation
  url.ts          URL validation/normalization
  __tests__/      Jest unit + integration tests
public/
  index.html      Frontend markup
  styles.css      Styles
  app.js          Frontend logic
```

## License

MIT
