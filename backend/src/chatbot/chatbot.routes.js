const express = require('express');
const { requireAuth } = require('../auth/auth.middleware');
const { startSession, submitAnswer, completeSession, getSession } = require('./engine');
const { analyzeAudit } = require('../ai/analyze');
const pool = require('../db/pool');
const emailService = require('../email/email.service');

const router = express.Router();

// POST /api/chatbot/start
router.post('/start', requireAuth, async (req, res) => {
    const { profileId } = req.body;
    if (!profileId) return res.status(400).json({ error: 'profileId requis' });

    try {
        const result = await startSession(req.user.id, profileId);
        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// POST /api/chatbot/answer
router.post('/answer', requireAuth, async (req, res) => {
    const { sessionId, answer } = req.body;
    if (!sessionId || answer === undefined) {
        return res.status(400).json({ error: 'sessionId et answer requis' });
    }

    try {
        const result = await submitAnswer(sessionId, answer);
        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// POST /api/chatbot/complete
router.post('/complete', requireAuth, async (req, res) => {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId requis' });

    try {
        const { auditId, scores, profile } = await completeSession(
            sessionId,
            req.user.id,
            req.user.company_id
        );

        // Trigger async AI analysis (don't block response)
        analyzeAudit(auditId, scores, profile, req.user.name).then(async (analysis) => {
            if (analysis) {
                await pool.query('UPDATE audits SET ai_analysis = $1 WHERE id = $2', [analysis, auditId]);
                // Optionally send results email
                if (req.user.email) {
                    emailService.sendAuditResults(req.user.email, req.user.name || req.user.email, auditId, scores)
                        .catch(err => console.error('Email error:', err));
                }
            }
        }).catch(err => console.error('AI analysis error:', err));

        res.json({ auditId, scores, profile });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// GET /api/chatbot/session/:sessionId
router.get('/session/:sessionId', requireAuth, async (req, res) => {
    try {
        const session = await getSession(req.params.sessionId);
        if (!session) return res.status(404).json({ error: 'Session non trouvée' });
        if (session.user_id !== req.user.id) return res.status(403).json({ error: 'Accès refusé' });
        res.json(session);
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// GET /api/chatbot/audits/:auditId — get audit with AI analysis
router.get('/audits/:auditId', requireAuth, async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT a.*, u.email AS user_email, u.name AS user_name
             FROM audits a
             LEFT JOIN users u ON a.user_id = u.id
             WHERE a.id = $1`,
            [req.params.auditId]
        );
        if (!rows[0]) return res.status(404).json({ error: 'Audit non trouvé' });
        const audit = rows[0];

        // Users can only see own audits, admins see all in their company
        if (req.user.role !== 'admin' && audit.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Accès refusé' });
        }

        res.json(audit);
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;
