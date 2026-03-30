import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestEnvironment, writeTestFile, type TestEnvironment } from './testDataIsolation.js';

describe('GET /api/recipes/scrape', () => {
    let env: TestEnvironment;

    beforeAll(() => {
        env = createTestEnvironment('scrape-api');
        writeTestFile(env.files.usersFile, [
            { username: 'testuser', password: '$2a$10$hashedpassword', tier: 'Editor' }
        ]);
    });

    afterAll(() => {
        env.cleanup();
    });

    it('returns 401 when unauthenticated', async () => {
        const res = await request(env.app)
            .get('/api/recipes/scrape?url=https://example.com')
            .set('Cookie', 'token=invalid-token');
        expect(res.status).toBe(401);
    });

    it('returns 400 when url param is missing', async () => {
        const res = await request(env.app)
            .get('/api/recipes/scrape');
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/url/i);
    });

    it('returns 400 when url is not http/https', async () => {
        const res = await request(env.app)
            .get('/api/recipes/scrape?url=javascript:alert(1)');
        expect(res.status).toBe(400);
    });

    it('returns 502 when the remote page cannot be fetched', async () => {
        const res = await request(env.app)
            .get('/api/recipes/scrape?url=https://this-domain-does-not-exist-xyz.com');
        expect(res.status).toBe(502);
        expect(res.body.error).toMatch(/fetch/i);
    }, 15000);
});
