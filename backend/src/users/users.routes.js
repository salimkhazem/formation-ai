const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db/pool');
const { requireAuth, requireAdmin } = require('../auth/auth.middleware');

const router = express.Router();

// GET /api/users — list users in own company
router.get('/', requireAuth, async (req, res) => {
    try {
        const companyId = req.user.role === 'admin' ? req.user.company_id : req.user.company_id;
        const { rows } = await pool.query(
            `SELECT id, email, name, role, status, created_at
             FROM users
             WHERE company_id = $1
             ORDER BY created_at DESC`,
            [companyId]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// GET /api/users/:id
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT id, email, name, role, status, created_at, company_id
             FROM users WHERE id = $1`,
            [req.params.id]
        );
        if (!rows[0]) return res.status(404).json({ error: 'Utilisateur non trouvé' });

        // Users can only see their own profile, admins can see all in their company
        if (req.user.role !== 'admin' && rows[0].id !== req.user.id) {
            return res.status(403).json({ error: 'Accès refusé' });
        }
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// PUT /api/users/:id — update profile
router.put('/:id', requireAuth, async (req, res) => {
    if (req.user.role !== 'admin' && req.params.id !== req.user.id) {
        return res.status(403).json({ error: 'Accès refusé' });
    }
    const { name, role } = req.body;
    // Only admins can change roles
    const newRole = (req.user.role === 'admin' && role) ? role : undefined;

    try {
        const { rows } = await pool.query(
            `UPDATE users SET
               name = COALESCE($1, name),
               role = COALESCE($2, role)
             WHERE id = $3
             RETURNING id, email, name, role, status`,
            [name, newRole, req.params.id]
        );
        if (!rows[0]) return res.status(404).json({ error: 'Utilisateur non trouvé' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// DELETE /api/users/:id — admin removes user
router.delete('/:id', requireAdmin, async (req, res) => {
    if (req.params.id === req.user.id) {
        return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
    }
    try {
        const { rowCount } = await pool.query(
            'DELETE FROM users WHERE id = $1 AND company_id = $2',
            [req.params.id, req.user.company_id]
        );
        if (!rowCount) return res.status(404).json({ error: 'Utilisateur non trouvé' });
        res.json({ message: 'Utilisateur supprimé' });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// POST /api/users/change-password
router.post('/change-password', requireAuth, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Mots de passe requis' });
    if (newPassword.length < 8) return res.status(400).json({ error: 'Mot de passe trop court' });

    try {
        const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
        if (!rows[0]) return res.status(404).json({ error: 'Utilisateur non trouvé' });

        const match = await bcrypt.compare(currentPassword, rows[0].password_hash);
        if (!match) return res.status(401).json({ error: 'Mot de passe actuel incorrect' });

        const hash = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);
        res.json({ message: 'Mot de passe mis à jour' });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// GET /api/users/:id/audits — audit history for a user
router.get('/:id/audits', requireAuth, async (req, res) => {
    if (req.user.role !== 'admin' && req.params.id !== req.user.id) {
        return res.status(403).json({ error: 'Accès refusé' });
    }
    try {
        const { rows } = await pool.query(
            `SELECT id, profile_id, scores, ai_analysis, created_at
             FROM audits WHERE user_id = $1
             ORDER BY created_at DESC`,
            [req.params.id]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;
