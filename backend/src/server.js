const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const db = require('./database');

// ── Profiles ─────────────────────────────────────────────────

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

// ── Questions ────────────────────────────────────────────────

app.get('/api/questions/:profileId', (req, res) => {
    const profile = db.getProfileById(req.params.profileId);
    if (!profile) return res.status(404).json({ error: 'Profil non trouvé' });

    const questions = db.getQuestionsForProfile(req.params.profileId);
    res.json(questions);
});

// ── Audits ────────────────────────────────────────────────────

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
    if (!audit) {
        return res.status(400).json({ error: 'Profil invalide' });
    }

    res.status(201).json(audit);
});

app.delete('/api/audits/:id', (req, res) => {
    const success = db.deleteAudit(req.params.id);
    if (!success) return res.status(404).json({ error: 'Audit non trouvé' });
    res.json({ message: 'Audit supprimé' });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`🚀 Audit IA API running on http://localhost:${PORT}`);
});
