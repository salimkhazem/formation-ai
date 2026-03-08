const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'ai-maturity-secret-change-in-prod';

function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token manquant' });
    }
    const token = header.slice(7);
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload;
        next();
    } catch {
        return res.status(401).json({ error: 'Token invalide ou expiré' });
    }
}

function requireAdmin(req, res, next) {
    requireAuth(req, res, () => {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
        }
        next();
    });
}

function signToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
}

function signRefreshToken(payload) {
    return jwt.sign(payload, JWT_SECRET + '_refresh', { expiresIn: '30d' });
}

function verifyRefreshToken(token) {
    return jwt.verify(token, JWT_SECRET + '_refresh');
}

module.exports = { requireAuth, requireAdmin, signToken, signRefreshToken, verifyRefreshToken };
