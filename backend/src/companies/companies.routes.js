const express = require('express');
const pool = require('../db/pool');
const { requireAuth, requireAdmin } = require('../auth/auth.middleware');

const router = express.Router();

// GET /api/companies — list all companies (super admin only in real use; here: admin sees own)
router.get('/', requireAdmin, async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT c.*, COUNT(u.id) AS user_count
             FROM companies c
             LEFT JOIN users u ON u.company_id = c.id
             GROUP BY c.id
             ORDER BY c.created_at DESC`
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// GET /api/companies/:id
router.get('/:id', requireAdmin, async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT c.*, COUNT(u.id) AS user_count
             FROM companies c
             LEFT JOIN users u ON u.company_id = c.id
             WHERE c.id = $1
             GROUP BY c.id`,
            [req.params.id]
        );
        if (!rows[0]) return res.status(404).json({ error: 'Entreprise non trouvée' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// POST /api/companies
router.post('/', requireAdmin, async (req, res) => {
    const { name, email } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Nom et email requis' });

    try {
        const { rows } = await pool.query(
            `INSERT INTO companies (name, email) VALUES ($1, $2) RETURNING *`,
            [name, email.toLowerCase()]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ error: 'Cet email est déjà utilisé' });
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// PUT /api/companies/:id
router.put('/:id', requireAdmin, async (req, res) => {
    const { name, email } = req.body;
    try {
        const { rows } = await pool.query(
            `UPDATE companies SET
               name = COALESCE($1, name),
               email = COALESCE($2, email)
             WHERE id = $3
             RETURNING *`,
            [name, email ? email.toLowerCase() : null, req.params.id]
        );
        if (!rows[0]) return res.status(404).json({ error: 'Entreprise non trouvée' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// GET /api/companies/:id/users
router.get('/:id/users', requireAdmin, async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT id, email, name, role, status, created_at
             FROM users
             WHERE company_id = $1
             ORDER BY created_at DESC`,
            [req.params.id]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// GET /api/companies/:id/audits — all audits for a company
router.get('/:id/audits', requireAdmin, async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT a.*, u.email AS user_email, u.name AS user_name
             FROM audits a
             LEFT JOIN users u ON a.user_id = u.id
             WHERE a.company_id = $1
             ORDER BY a.created_at DESC`,
            [req.params.id]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;
