import request from 'supertest';
import fs from 'fs';
import {afterAll, beforeAll, beforeEach, describe, expect, it} from 'vitest';
import {createTestEnvironment, deleteTestFile, writeTestFile, readTestFile, type TestEnvironment} from './testDataIsolation.js';
import {createApp} from '../../serverFactory.js';

describe('Legacy user cleanup', () => {
    let env: TestEnvironment;

    beforeAll(() => {
        env = createTestEnvironment('user-cleanup');
    });

    beforeEach(() => {
        deleteTestFile(env.files.usersFile);
        deleteTestFile(env.files.settingsFile);
    });

    afterAll(() => {
        env.cleanup();
    });

    it('purges tier-less users on startup', async () => {
        // Write a users file containing an invalid (no tier) and a valid user
        writeTestFile(env.files.usersFile, [
            {username: 'legacy', password: 'hash'},
            {username: 'good', password: 'hash', tier: 'Viewer'}
        ]);

        // Create a fresh app to trigger startup cleanup
        const freshApp = createApp(env.dataDir);

        const saved = readTestFile<Array<{username: string; tier?: string}>>(env.files.usersFile);
        expect(saved).toHaveLength(1);
        expect(saved[0].username).toBe('good');
        expect(saved[0].tier).toBe('Viewer');

        // sanity: app still responds after cleanup
        const res = await request(freshApp).get('/api/registration-status');
        expect(res.status).toBe(200);
    });

    it('purges tier-less users when users are read', async () => {
        const {app} = env;

        writeTestFile(env.files.usersFile, [{username: 'legacy', password: 'hash'}]);

        const res = await request(app).get('/api/registration-status');
        expect(res.status).toBe(200);
        expect(res.body.registrationEnabled).toBe(true);

        const saved = fs.existsSync(env.files.usersFile)
            ? readTestFile<Array<{username: string; tier?: string}>>(env.files.usersFile)
            : [];
        expect(saved).toHaveLength(0);
    });
});
