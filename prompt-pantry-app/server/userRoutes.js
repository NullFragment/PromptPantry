/**
 * User Management Routes - Admin-only user CRUD endpoints
 */
import bcrypt from 'bcryptjs';
import { safeDecodeURIComponent } from './middleware.js';

export function registerUserRoutes(app, { dataAccess, middleware, validators }) {
    const { readUsers, saveUsers } = dataAccess;
    const { authenticate, requireAdmin } = middleware;
    const { userValidator } = validators;

    app.get('/api/users', authenticate, requireAdmin, (req, res) => {
        const users = readUsers();
        const sanitizedUsers = users.map(({password, ...rest}) => rest);
        res.json(sanitizedUsers);
    });

    app.post('/api/users', authenticate, requireAdmin, async (req, res) => {
        const {username, password, tier} = req.body;
        if (!userValidator({username, password, tier})) {
            return res.status(400).json({error: 'Invalid input', details: userValidator.errors});
        }

        const users = readUsers();
        if (users.find(u => u.username === username)) {
            return res.status(400).json({error: 'User already exists'});
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = {username, password: hashedPassword, tier};
        users.push(newUser);
        saveUsers(users);

        res.status(201).json({username, tier});
    });

    app.put('/api/users/:username', authenticate, requireAdmin, (req, res) => {
        const targetUsername = safeDecodeURIComponent(req.params.username);
        if (targetUsername === null) return res.status(400).json({error: 'Invalid URL encoding'});
        const {tier} = req.body;

        if (!tier || !['Viewer', 'Editor', 'Admin'].includes(tier)) {
            return res.status(400).json({error: 'Invalid tier'});
        }

        const users = readUsers();
        const idx = users.findIndex(u => u.username === targetUsername);
        if (idx === -1) {
            return res.status(404).json({error: 'User not found'});
        }

        if (req.user.username === targetUsername && tier !== 'Admin') {
            const adminCount = users.filter(u => u.tier === 'Admin').length;
            if (adminCount <= 1) {
                return res.status(400).json({error: 'Cannot demote the only admin'});
            }
        }

        users[idx].tier = tier;
        saveUsers(users);

        res.json({username: targetUsername, tier});
    });

    app.delete('/api/users/:username', authenticate, requireAdmin, (req, res) => {
        const targetUsername = safeDecodeURIComponent(req.params.username);
        if (targetUsername === null) return res.status(400).json({error: 'Invalid URL encoding'});

        const users = readUsers();
        const idx = users.findIndex(u => u.username === targetUsername);
        if (idx === -1) {
            return res.status(404).json({error: 'User not found'});
        }

        if (req.user.username === targetUsername) {
            return res.status(400).json({error: 'Cannot delete yourself'});
        }

        if (users[idx].tier === 'Admin') {
            const adminCount = users.filter(u => u.tier === 'Admin').length;
            if (adminCount <= 1) {
                return res.status(400).json({error: 'Cannot delete the only admin'});
            }
        }

        users.splice(idx, 1);
        saveUsers(users);

        res.status(204).send();
    });
}

