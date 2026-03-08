const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');
const emailService = require('../email/email.service');
const { signToken, signRefreshToken, verifyRefreshToken, requireAuth } = require('./auth.middleware');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    try {
        const { rows } = await pool.query(
            `SELECT u.*, c.name AS company_name
             FROM users u
             LEFT JOIN companies c ON u.company_id = c.id
             WHERE u.email = $1`,
            [email.toLowerCase()]
        );
        const user = rows[0];

        if (!user || !user.password_hash) {
            return res.status(401).json({ error: 'Identifiants invalides' });
        }
        if (user.status !== 'active') {
            return res.status(401).json({ error: 'Compte non activé. Vérifiez votre email.' });
        }

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return res.status(401).json({ error: 'Identifiants invalides' });
        }

        const payload = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            company_id: user.company_id,
            company_name: user.company_name
        };

        res.json({
            token: signToken(payload),
            refreshToken: signRefreshToken({ id: user.id }),
            user: payload
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token requis' });

    try {
        const decoded = verifyRefreshToken(refreshToken);
        const { rows } = await pool.query(
            `SELECT u.*, c.name AS company_name
             FROM users u
             LEFT JOIN companies c ON u.company_id = c.id
             WHERE u.id = $1 AND u.status = 'active'`,
            [decoded.id]
        );
        const user = rows[0];
        if (!user) return res.status(401).json({ error: 'Utilisateur non trouvé' });

        const payload = { id: user.id, email: user.email, name: user.name, role: user.role, company_id: user.company_id, company_name: user.company_name };
        res.json({ token: signToken(payload) });
    } catch {
        res.status(401).json({ error: 'Refresh token invalide' });
    }
});

// POST /api/auth/invite — Admin sends invitation
router.post('/invite', requireAuth, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Accès refusé' });

    const { email, name } = req.body;
    if (!email) return res.status(400).json({ error: 'Email requis' });

    try {
        const token = uuidv4();
        const { rows: existing } = await pool.query('SELECT id, status FROM users WHERE email = $1', [email.toLowerCase()]);

        if (existing.length > 0 && existing[0].status === 'active') {
            return res.status(409).json({ error: 'Un utilisateur actif avec cet email existe déjà' });
        }

        if (existing.length > 0) {
            await pool.query(
                'UPDATE users SET invitation_token = $1, name = $2 WHERE email = $3',
                [token, name || existing[0].name, email.toLowerCase()]
            );
        } else {
            await pool.query(
                `INSERT INTO users (company_id, email, name, role, invitation_token, status)
                 VALUES ($1, $2, $3, 'user', $4, 'pending')`,
                [req.user.company_id, email.toLowerCase(), name || '', token]
            );
        }

        await emailService.sendInvitation(email, name || email, token, req.user.company_name);

        res.json({ message: 'Invitation envoyée', email });
    } catch (err) {
        console.error('Invite error:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// POST /api/auth/accept-invite — User activates account
router.post('/accept-invite', async (req, res) => {
    const { token, password, name } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token et mot de passe requis' });
    if (password.length < 8) return res.status(400).json({ error: 'Mot de passe trop court (min 8 caractères)' });

    try {
        const { rows } = await pool.query(
            'SELECT * FROM users WHERE invitation_token = $1 AND status = $2',
            [token, 'pending']
        );
        const user = rows[0];
        if (!user) return res.status(404).json({ error: 'Token invalide ou déjà utilisé' });

        const passwordHash = await bcrypt.hash(password, 10);
        await pool.query(
            `UPDATE users SET password_hash = $1, status = 'active', invitation_token = NULL, name = COALESCE($2, name)
             WHERE id = $3`,
            [passwordHash, name || null, user.id]
        );

        res.json({ message: 'Compte activé avec succès. Vous pouvez maintenant vous connecter.' });
    } catch (err) {
        console.error('Accept invite error:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT u.id, u.email, u.name, u.role, u.status, u.created_at, c.name AS company_name, c.id AS company_id
             FROM users u LEFT JOIN companies c ON u.company_id = c.id
             WHERE u.id = $1`,
            [req.user.id]
        );
        if (!rows[0]) return res.status(404).json({ error: 'Utilisateur non trouvé' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;
