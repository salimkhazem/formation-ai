require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:4200',
    credentials: true
}));
app.use(express.json());

// ── Legacy JSON-based routes (backward compat) ────────────────
const db = require('./database');

app.get('/api/profiles', (req, res) => {
    const profiles = db.getProfiles().map(p => ({
        ...p,
        auditCount: db.getAudits().filter(a => a.profileId === p.id).length
    }));
    res.json(profiles);
});

app.get('/api/profiles/:id', (req, res) => {
    const profile = db.getProfileById(req.params.id);
    if (!profile) return res.status(404).json({ error: 'Profil non trouvé' });
    res.json(profile);
});

app.get('/api/questions/:profileId', (req, res) => {
    const profile = db.getProfileById(req.params.profileId);
    if (!profile) return res.status(404).json({ error: 'Profil non trouvé' });
    res.json(db.getQuestionsForProfile(req.params.profileId));
});

app.get('/api/audits', (req, res) => {
    const { profileId } = req.query;
    let audits = db.getAudits();
    if (profileId) audits = audits.filter(a => a.profileId === profileId);
    res.json(audits);
});

app.get('/api/audits/:id', (req, res) => {
    const audit = db.getAuditById(req.params.id);
    if (!audit) return res.status(404).json({ error: 'Audit non trouvé' });
    res.json(audit);
});

app.post('/api/audits', (req, res) => {
    const { profileId, respondentName, respondentEmail, answers } = req.body;
    if (!profileId || !answers) {
        return res.status(400).json({ error: 'Le profil et les réponses sont requis' });
    }
    const audit = db.createAudit({ profileId, respondentName, respondentEmail, answers });
    if (!audit) return res.status(400).json({ error: 'Profil invalide' });
    res.status(201).json(audit);
});

app.delete('/api/audits/:id', (req, res) => {
    const success = db.deleteAudit(req.params.id);
    if (!success) return res.status(404).json({ error: 'Audit non trouvé' });
    res.json({ message: 'Audit supprimé' });
});

// ── New API routes ────────────────────────────────────────────
app.use('/api/auth', require('./auth/auth.routes'));
app.use('/api/companies', require('./companies/companies.routes'));
app.use('/api/users', require('./users/users.routes'));
app.use('/api/questions', require('./questions/questions.routes'));
app.use('/api/chatbot', require('./chatbot/chatbot.routes'));
app.use('/api/export', require('./export/export.routes'));
app.use('/api/ai-chat', require('./ai-chat/ai-chat.routes'));

// ── Health check ──────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', version: '2.0.0', timestamp: new Date().toISOString() });
});

// ── 404 handler ───────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.path} non trouvée` });
});

// ── Error handler ─────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Erreur serveur interne' });
});

app.listen(PORT, () => {
    console.log(`🚀 AI Maturity API v2.0 running on http://localhost:${PORT}`);
});
