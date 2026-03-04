import request from 'supertest';
import {afterAll, beforeAll, beforeEach, describe, expect, it} from 'vitest';
import {createTestEnvironment, writeTestFile, readTestFile, type TestEnvironment} from './testDataIsolation.js';

describe('User management API', () => {
    let env: TestEnvironment;

    beforeAll(() => {
        env = createTestEnvironment('user-management');
    });

    beforeEach(() => {
        // Reset to clean state with an admin user
        // Note: In test mode, authentication defaults to 'testuser' so we make that an Admin
        writeTestFile(env.files.usersFile, [
            {username: 'testuser', password: '$2a$10$hashedpassword', tier: 'Admin'},
            {username: 'editor', password: '$2a$10$hashedpassword', tier: 'Editor'},
            {username: 'viewer', password: '$2a$10$hashedpassword', tier: 'Viewer'}
        ]);
        writeTestFile(env.files.settingsFile, {registrationEnabled: false, advancedMode: false});
    });

    afterAll(() => {
        env.cleanup();
    });

    describe('GET /api/users', () => {
        it('returns all users without passwords', async () => {
            const {app} = env;

            const res = await request(app)
                .get('/api/users');

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(3);
            expect(res.body[0]).toHaveProperty('username');
            expect(res.body[0]).toHaveProperty('tier');
            expect(res.body[0]).not.toHaveProperty('password');
        });
    });

    describe('POST /api/users', () => {
        it('creates a new user with specified tier', async () => {
            const {app} = env;

            const res = await request(app)
                .post('/api/users')
                .send({username: 'newuser', password: 'password123', tier: 'Editor'});

            expect(res.status).toBe(201);
            expect(res.body.username).toBe('newuser');
            expect(res.body.tier).toBe('Editor');
            expect(res.body).not.toHaveProperty('password');

            const saved = readTestFile<Array<{username: string; tier: string}>>(env.files.usersFile);
            const newUser = saved.find(u => u.username === 'newuser');
            expect(newUser).toBeDefined();
            expect(newUser?.tier).toBe('Editor');
        });

        it('rejects creating a duplicate user', async () => {
            const {app} = env;

            const res = await request(app)
                .post('/api/users')
                .send({username: 'testuser', password: 'password123', tier: 'Viewer'});

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('User already exists');
        });

        it('rejects invalid tier', async () => {
            const {app} = env;

            const res = await request(app)
                .post('/api/users')
                .send({username: 'badtier', password: 'password123', tier: 'SuperAdmin'});

            expect(res.status).toBe(400);
        });
    });

    describe('PUT /api/users/:username', () => {
        it('updates a user tier', async () => {
            const {app} = env;

            const res = await request(app)
                .put('/api/users/viewer')
                .send({tier: 'Editor'});

            expect(res.status).toBe(200);
            expect(res.body.tier).toBe('Editor');

            const saved = readTestFile<Array<{username: string; tier: string}>>(env.files.usersFile);
            const updated = saved.find(u => u.username === 'viewer');
            expect(updated?.tier).toBe('Editor');
        });

        it('returns 404 for non-existent user', async () => {
            const {app} = env;

            const res = await request(app)
                .put('/api/users/nonexistent')
                .send({tier: 'Editor'});

            expect(res.status).toBe(404);
        });

        it('rejects invalid tier value', async () => {
            const {app} = env;

            const res = await request(app)
                .put('/api/users/viewer')
                .send({tier: 'InvalidTier'});

            expect(res.status).toBe(400);
        });
    });

    describe('DELETE /api/users/:username', () => {
        it('deletes a user', async () => {
            const {app} = env;

            const res = await request(app)
                .delete('/api/users/viewer');

            expect(res.status).toBe(204);

            const saved = readTestFile<Array<{username: string}>>(env.files.usersFile);
            expect(saved.find(u => u.username === 'viewer')).toBeUndefined();
        });

        it('returns 404 for non-existent user', async () => {
            const {app} = env;

            const res = await request(app)
                .delete('/api/users/nonexistent');

            expect(res.status).toBe(404);
        });

        it('prevents deleting yourself', async () => {
            const {app} = env;

            const res = await request(app)
                .delete('/api/users/testuser');

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('Cannot delete yourself');
        });
    });
});

