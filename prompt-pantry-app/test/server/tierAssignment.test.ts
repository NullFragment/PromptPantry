import request from 'supertest';
import {afterAll, beforeAll, beforeEach, describe, expect, it} from 'vitest';
import {createTestEnvironment, deleteTestFile, writeTestFile, readTestFile, type TestEnvironment} from './testDataIsolation.js';

describe('Tier assignment on registration', () => {
    let env: TestEnvironment;

    beforeAll(() => {
        env = createTestEnvironment('tier-assignment');
    });

    beforeEach(() => {
        // Reset to clean state before each test
        deleteTestFile(env.files.usersFile);
        deleteTestFile(env.files.settingsFile);
    });

    afterAll(() => {
        env.cleanup();
    });

    it('assigns Admin to the very first user', async () => {
        const {app} = env;

        const res = await request(app)
            .post('/api/register')
            .send({username: 'first', password: 'password123'});

        expect(res.status).toBe(201);
        expect(res.body.tier).toBe('Admin');

        const saved = readTestFile<Array<{username: string; tier: string}>>(env.files.usersFile);
        expect(saved[0].tier).toBe('Admin');
    });

    it('assigns Viewer to any subsequent users when a user already exists', async () => {
        const {app} = env;

        writeTestFile(env.files.usersFile, [{username: 'existing', password: 'hash', tier: 'Viewer'}]);
        writeTestFile(env.files.settingsFile, {registrationEnabled: true, advancedMode: false});

        const res = await request(app)
            .post('/api/register')
            .send({username: 'second', password: 'password123'});

        expect(res.status).toBe(201);
        expect(res.body.tier).toBe('Viewer');

        const saved = readTestFile<Array<{username: string; tier: string}>>(env.files.usersFile);
        const newUser = saved.find(u => u.username === 'second');
        expect(newUser?.tier).toBe('Viewer');
    });
});
