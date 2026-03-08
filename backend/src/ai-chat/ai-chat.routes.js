const express = require('express');
const { requireAuth } = require('../auth/auth.middleware');
const { startSession, sendMessage, PROFILES } = require('./ai-chat.engine');

const router = express.Router();

// GET /api/ai-chat/profiles — list supported profiles
router.get('/profiles', (req, res) => {
    const profiles = Object.entries(PROFILES).map(([id, p]) => ({ id, ...p }));
    res.json(profiles);
});

// POST /api/ai-chat/start — start conversational AI session
router.post('/start', requireAuth, async (req, res) => {
    const { profileId } = req.body;
    if (!profileId) return res.status(400).json({ error: 'profileId requis' });

    try {
        const result = await startSession(req.user.id, profileId);
        res.json(result);
    } catch (err) {
        console.error('ai-chat start error:', err);
        res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
});

// POST /api/ai-chat/message — send user message
router.post('/message', requireAuth, async (req, res) => {
    const { sessionId, message } = req.body;
    if (!sessionId || !message) return res.status(400).json({ error: 'sessionId et message requis' });

    try {
        const result = await sendMessage(sessionId, req.user.id, message);
        res.json(result);
    } catch (err) {
        console.error('ai-chat message error:', err);
        const status = err.message.includes('Session') ? 404 : err.message.includes('Accès') ? 403 : 500;
        res.status(status).json({ error: err.message || 'Erreur serveur' });
    }
});

// GET /api/ai-chat/session/:id — get session state
router.get('/session/:id', requireAuth, async (req, res) => {
    const pool = require('../db/pool');
    try {
        const { rows } = await pool.query(
            'SELECT id, profile_id, status, scores, created_at FROM ai_chat_sessions WHERE id = $1 AND user_id = $2',
            [req.params.id, req.user.id]
        );
        if (!rows[0]) return res.status(404).json({ error: 'Session introuvable' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;
