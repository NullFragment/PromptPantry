/**
 * Authentication & Authorization Middleware
 */
import jwt from 'jsonwebtoken';

/**
 * @param {string} JWT_SECRET
 * @param {object} dataAccess - data access layer (readUsers)
 */
export function createMiddleware(JWT_SECRET, dataAccess) {
    const { readUsers } = dataAccess;

    const authenticate = (req, res, next) => {
        if (process.env.NODE_ENV === 'test' && !req.cookies.token) {
            if (process.env.DEPLOYED === 'true') {
                console.error('FATAL: NODE_ENV=test with DEPLOYED=true. Rejecting test bypass.');
                return res.status(500).json({error: 'Server misconfiguration'});
            }
            req.user = {username: 'testuser', isAdmin: true};
            return next();
        }
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({error: 'Unauthorized'});
        }
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            const users = readUsers();
            const user = users.find(u => u.username === decoded.username);
            req.user = { username: decoded.username, isAdmin: user?.tier === 'Admin' };
            next();
        } catch (err) {
            res.clearCookie('token');
            return res.status(401).json({error: 'Invalid token'});
        }
    };

    const requireTier = (allowedTiers) => (req, res, next) => {
        const users = readUsers();
        const user = users.find(u => u.username === req.user.username);
        if (!user || !allowedTiers.includes(user.tier)) {
            return res.status(403).json({error: `${allowedTiers[0]} access required`});
        }
        next();
    };

    const requireEditor = requireTier(['Editor', 'Admin']);
    const requireAdmin = requireTier(['Admin']);

    return { authenticate, requireEditor, requireAdmin };
}

export function safeDecodeURIComponent(str) {
    try {
        return decodeURIComponent(str);
    } catch {
        return null;
    }
}

