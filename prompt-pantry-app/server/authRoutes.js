/**
 * Authentication Routes - Registration, login, logout, /api/me
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export function registerAuthRoutes(app, { dataAccess, middleware, validators, authLimiter, JWT_SECRET }) {
    const { readUsers, saveUsers, readSettings, saveSettings } = dataAccess;
    const { authenticate } = middleware;
    const { userValidator } = validators;

    app.get('/api/registration-status', (req, res) => {
        const settings = readSettings();
        res.json({registrationEnabled: settings.registrationEnabled});
    });

    app.post('/api/register', authLimiter, async (req, res) => {
        const settings = readSettings();
        if (!settings.registrationEnabled) {
            return res.status(403).json({error: 'Registration is currently disabled'});
        }

        const {username, password} = req.body;
        if (!userValidator({username, password, tier: 'Viewer'})) {
            return res.status(400).json({error: 'Invalid input'});
        }

        const users = readUsers();
        if (users.find(u => u.username === username)) {
            return res.status(400).json({error: 'User already exists'});
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const tier = users.length === 0 ? 'Admin' : 'Viewer';
        const newUser = {username, password: hashedPassword, tier};
        users.push(newUser);
        saveUsers(users);

        settings.registrationEnabled = false;
        saveSettings(settings);

        res.status(201).json({message: 'User registered', tier});
    });

    app.post('/api/login', authLimiter, async (req, res) => {
        const {username, password} = req.body;
        if (!username || typeof username !== 'string' || !password || typeof password !== 'string') {
            return res.status(400).json({error: 'Username and password are required'});
        }
        const users = readUsers();
        const user = users.find(u => u.username === username);

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({error: 'Invalid credentials'});
        }

        const token = jwt.sign({username: user.username}, JWT_SECRET, {expiresIn: '7d'});
        res.cookie('token', token, {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production' || process.env.SECURE_COOKIES === 'true',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        res.json({message: 'Login successful', username: user.username, tier: user.tier});
    });

    app.post('/api/logout', (req, res) => {
        res.clearCookie('token');
        res.json({message: 'Logged out'});
    });

    app.get('/api/me', authenticate, (req, res) => {
        const users = readUsers();
        const user = users.find(u => u.username === req.user.username);
        if (!user) {
            res.clearCookie('token');
            return res.status(404).json({error: 'User not found'});
        }
        res.json({username: user.username, tier: user.tier});
    });
}

