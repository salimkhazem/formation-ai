const express = require('express');
const pool = require('../db/pool');
const { requireAuth, requireAdmin } = require('../auth/auth.middleware');

const router = express.Router();

// GET /api/questions — list questions (optionally filter by profile_id or section)
router.get('/', requireAuth, async (req, res) => {
    const { profile_id, section } = req.query;
    try {
        let query = 'SELECT * FROM questions WHERE 1=1';
        const params = [];

        if (section === 'general') {
            query += ' AND profile_id IS NULL';
        } else if (profile_id) {
            query += ` AND (profile_id = $${params.length + 1} OR profile_id IS NULL)`;
            params.push(profile_id);
        }

        query += ' ORDER BY section ASC, order_index ASC';

        const { rows } = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// GET /api/questions/by-profile/:profileId — general + profile-specific (legacy compat)
router.get('/by-profile/:profileId', async (req, res) => {
    try {
        const { rows: general } = await pool.query(
            `SELECT * FROM questions WHERE profile_id IS NULL ORDER BY order_index ASC`
        );
        const { rows: specific } = await pool.query(
            `SELECT * FROM questions WHERE profile_id = $1 ORDER BY order_index ASC`,
            [req.params.profileId]
        );
        res.json({ general, specific });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// GET /api/questions/:id
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM questions WHERE id = $1', [req.params.id]);
        if (!rows[0]) return res.status(404).json({ error: 'Question non trouvée' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// POST /api/questions — admin creates a question
router.post('/', requireAdmin, async (req, res) => {
    const { id, profile_id, text, type, options, dimension, weight, order_index, section } = req.body;
    if (!id || !text || !type) return res.status(400).json({ error: 'id, text et type sont requis' });

    const validTypes = ['single', 'multiple', 'scale', 'boolean'];
    if (!validTypes.includes(type)) return res.status(400).json({ error: `Type invalide. Valeurs acceptées: ${validTypes.join(', ')}` });

    try {
        const { rows } = await pool.query(
            `INSERT INTO questions (id, profile_id, text, type, options, dimension, weight, order_index, section)
             VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9)
             RETURNING *`,
            [id, profile_id || null, text, type, JSON.stringify(options || []), dimension || 'Général', weight || 1, order_index || 0, section || 'general']
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ error: 'Une question avec cet ID existe déjà' });
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// PUT /api/questions/:id — admin updates a question
router.put('/:id', requireAdmin, async (req, res) => {
    const { text, type, options, dimension, weight, order_index, section } = req.body;
    try {
        const { rows } = await pool.query(
            `UPDATE questions SET
               text = COALESCE($1, text),
               type = COALESCE($2, type),
               options = COALESCE($3::jsonb, options),
               dimension = COALESCE($4, dimension),
               weight = COALESCE($5, weight),
               order_index = COALESCE($6, order_index),
               section = COALESCE($7, section)
             WHERE id = $8
             RETURNING *`,
            [text, type, options ? JSON.stringify(options) : null, dimension, weight, order_index, section, req.params.id]
        );
        if (!rows[0]) return res.status(404).json({ error: 'Question non trouvée' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// DELETE /api/questions/:id
router.delete('/:id', requireAdmin, async (req, res) => {
    try {
        const { rowCount } = await pool.query('DELETE FROM questions WHERE id = $1', [req.params.id]);
        if (!rowCount) return res.status(404).json({ error: 'Question non trouvée' });
        res.json({ message: 'Question supprimée' });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// PUT /api/questions/reorder — batch reorder
router.put('/reorder/batch', requireAdmin, async (req, res) => {
    const { orders } = req.body; // [{ id, order_index }]
    if (!Array.isArray(orders)) return res.status(400).json({ error: 'orders array requis' });

    try {
        await Promise.all(
            orders.map(({ id, order_index }) =>
                pool.query('UPDATE questions SET order_index = $1 WHERE id = $2', [order_index, id])
            )
        );
        res.json({ message: 'Ordre mis à jour' });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;
