import request from 'supertest';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';
import {createTestEnvironment, deleteTestFile, type TestEnvironment} from './testDataIsolation.js';

describe('Registration Flow', () => {
    let env: TestEnvironment;

    beforeAll(() => {
        env = createTestEnvironment('registration-flow');
        // Start with no users or settings
        deleteTestFile(env.files.usersFile);
        deleteTestFile(env.files.settingsFile);
    });

    afterAll(() => {
        env.cleanup();
    });

    it('handles first registration and auto-disables', async () => {
        const {app} = env;

        // 1. Initial status should be enabled (since no users)
        const status1 = await request(app).get('/api/registration-status');
        expect(status1.body.registrationEnabled).toBe(true);

        // 2. Register first user
        const reg1 = await request(app)
            .post('/api/register')
            .send({username: 'user1', password: 'password123'});
        expect(reg1.status).toBe(201);
        expect(reg1.body.tier).toBe('Admin');

        // 3. Status should now be disabled
        const status2 = await request(app).get('/api/registration-status');
        expect(status2.body.registrationEnabled).toBe(false);

        // 4. Register second user should fail
        const reg2 = await request(app)
            .post('/api/register')
            .send({username: 'user2', password: 'password123'});
        expect(reg2.status).toBe(403);
        expect(reg2.body.error).toContain('disabled');

        // 5. Login as user1
        const loginRes = await request(app)
            .post('/api/login')
            .send({username: 'user1', password: 'password123'});
        expect(loginRes.status).toBe(200);
        const cookie = loginRes.header['set-cookie'];

        // 6. Toggle registration back ON
        const toggleRes = await request(app)
            .put('/api/settings/registration')
            .set('Cookie', cookie)
            .send({registrationEnabled: true});
        expect(toggleRes.status).toBe(200);
        expect(toggleRes.body.registrationEnabled).toBe(true);

        // 7. Status should now be enabled
        const status3 = await request(app).get('/api/registration-status');
        expect(status3.body.registrationEnabled).toBe(true);

        // 8. Register second user should now succeed
        const reg3 = await request(app)
            .post('/api/register')
            .send({username: 'user2', password: 'password123'});
        expect(reg3.status).toBe(201);
        expect(reg3.body.tier).toBe('Viewer');

        // 9. Login as user2 should return tier Viewer and username
        const loginRes2 = await request(app)
            .post('/api/login')
            .send({username: 'user2', password: 'password123'});
        expect(loginRes2.status).toBe(200);
        expect(loginRes2.body.tier).toBe('Viewer');
        expect(loginRes2.body.username).toBe('user2');

        // 10. /api/me should include tier
        const cookie2 = loginRes2.header['set-cookie'];
        const meRes = await request(app)
            .get('/api/me')
            .set('Cookie', cookie2);
        expect(meRes.status).toBe(200);
        expect(meRes.body.tier).toBe('Viewer');
    });
});
