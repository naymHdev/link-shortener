import request from 'supertest';
import { createApp } from '../app';
import { InMemoryLinkStore } from '../store';

function buildApp() {
  return createApp({
    store: new InMemoryLinkStore(),
    baseUrl: 'http://short.test',
  });
}

describe('Link shortener API', () => {
  it('reports health', async () => {
    const res = await request(buildApp()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('shortens a valid URL', async () => {
    const res = await request(buildApp())
      .post('/api/shorten')
      .send({ url: 'https://example.com/page' });

    expect(res.status).toBe(201);
    expect(res.body.url).toBe('https://example.com/page');
    expect(res.body.code).toBeTruthy();
    expect(res.body.shortUrl).toBe(`http://short.test/${res.body.code}`);
  });

  it('rejects an invalid URL', async () => {
    const res = await request(buildApp())
      .post('/api/shorten')
      .send({ url: 'not-a-url' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it('honors a custom code', async () => {
    const res = await request(buildApp())
      .post('/api/shorten')
      .send({ url: 'https://example.com/', code: 'custom1' });

    expect(res.status).toBe(201);
    expect(res.body.code).toBe('custom1');
  });

  it('rejects an invalid custom code', async () => {
    const res = await request(buildApp())
      .post('/api/shorten')
      .send({ url: 'https://example.com/', code: 'bad code!' });

    expect(res.status).toBe(400);
  });

  it('returns 409 for a duplicate custom code', async () => {
    const app = buildApp();
    await request(app)
      .post('/api/shorten')
      .send({ url: 'https://example.com/', code: 'dup' });
    const res = await request(app)
      .post('/api/shorten')
      .send({ url: 'https://other.com/', code: 'dup' });

    expect(res.status).toBe(409);
  });

  it('redirects a known short code and counts the hit', async () => {
    const app = buildApp();
    const created = await request(app)
      .post('/api/shorten')
      .send({ url: 'https://example.com/target' });
    const { code } = created.body;

    const redirect = await request(app).get(`/${code}`);
    expect(redirect.status).toBe(302);
    expect(redirect.headers.location).toBe('https://example.com/target');

    const meta = await request(app).get(`/api/links/${code}`);
    expect(meta.body.hits).toBe(1);
  });

  it('returns 404 for an unknown short code', async () => {
    const res = await request(buildApp()).get('/doesnotexist');
    expect(res.status).toBe(404);
  });

  it('lists created links', async () => {
    const app = buildApp();
    await request(app).post('/api/shorten').send({ url: 'https://a.com/' });
    await request(app).post('/api/shorten').send({ url: 'https://b.com/' });

    const res = await request(app).get('/api/links');
    expect(res.status).toBe(200);
    expect(res.body.links).toHaveLength(2);
  });
});
