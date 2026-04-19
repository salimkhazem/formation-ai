const express = require('express');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const pool = require('../db/pool');
const { requireAdmin, requireAuth, requireManager } = require('../auth/auth.middleware');

const router = express.Router();

const PROFILE_NAMES = {
    'developpeur': 'Développeur',
    'business-analyst': 'Business Analyst',
    'manager': 'Manager',
    'fonctionnel': 'Fonctionnel',
    'expert-ia': 'Expert IA'
};

const AXIS_ORDER = ['utilisation', 'prompting', 'ethique', 'formation', 'automatisation', 'gouvernance', 'impact'];
const AXIS_LABELS = {
    utilisation:    'Utilisation',
    prompting:      'Prompting',
    ethique:        'Éthique & Sécurité',
    formation:      'Formation',
    automatisation: 'Automatisation',
    gouvernance:    'Gouvernance',
    impact:         'Impact & ROI'
};

// ── Helpers ───────────────────────────────────────────────────────────────

function scoreColor(score) {
    if (score <= 25) return '#ef4444';
    if (score <= 50) return '#f97316';
    if (score <= 75) return '#eab308';
    return '#22c55e';
}

function levelLabel(score) {
    if (score <= 25) return 'Découverte';
    if (score <= 50) return 'Exploration';
    if (score <= 75) return 'Adoption';
    return 'Maîtrise';
}

// Normalize scores: handles both axisScores (new) and dimensions (legacy)
function getAxisScores(scores) {
    if (!scores) return [];
    if (scores.axisScores) {
        return AXIS_ORDER.map(key => {
            const a = scores.axisScores[key];
            if (!a) return null;
            return { key, label: a.label || AXIS_LABELS[key] || key, score: a.score };
        }).filter(Boolean);
    }
    if (scores.dimensions) {
        return Object.entries(scores.dimensions).map(([key, score]) => ({
            key, label: AXIS_LABELS[key] || key, score: Number(score)
        }));
    }
    return [];
}

// Draw a colored score bar in PDF
function drawBar(doc, x, y, width, score, color) {
    doc.rect(x, y, width, 7).fillColor('#e8e8f0').fill();
    if (score > 0) {
        doc.rect(x, y, Math.round(width * score / 100), 7).fillColor(color).fill();
    }
}

// Draw a single audit block inside a PDF document
function drawAuditBlock(doc, audit, { showUser = false, compact = false } = {}) {
    const scores = audit.scores || {};
    const axes = getAxisScores(scores);
    const overall = scores.overall || 0;
    const color = scoreColor(overall);
    const profileName = PROFILE_NAMES[audit.profile_id] || audit.profile_id;
    const date = new Date(audit.created_at).toLocaleDateString('fr-FR');

    const pageWidth = 595 - 100; // A4 - margins

    // Audit header row
    if (showUser) {
        doc.fontSize(11).fillColor('#1e1b4b').font('Helvetica-Bold')
            .text(`${audit.user_name || 'Anonyme'}`, 50, doc.y, { continued: true })
            .font('Helvetica').fillColor('#6b7280')
            .text(`  ·  ${audit.user_email || ''}  ·  ${profileName}  ·  ${date}`);
    } else {
        doc.fontSize(11).fillColor('#6b7280').font('Helvetica')
            .text(`${profileName}  ·  ${date}`);
    }

    doc.moveDown(0.3);

    // Overall score circle (inline via box)
    const boxY = doc.y;
    doc.roundedRect(50, boxY, pageWidth, compact ? 26 : 30).fillColor('#f5f5ff').fill();
    doc.fontSize(compact ? 11 : 12).fillColor(color).font('Helvetica-Bold')
        .text(`Score global : ${overall}%  —  ${levelLabel(overall)} ${scores.levelEmoji || ''}`,
              60, boxY + (compact ? 6 : 9));
    doc.y = boxY + (compact ? 32 : 38);

    // Axes
    if (axes.length > 0) {
        const colW = Math.floor(pageWidth / 2) - 10;
        const rows = compact
            ? axes.map((a, i) => ({ axis: a, col: i % 2, row: Math.floor(i / 2) }))
            : axes.map((a, i) => ({ axis: a, col: 0, row: i }));

        const startY = doc.y;
        let maxRow = 0;

        rows.forEach(({ axis, col, row }) => {
            const x = 50 + col * (colW + 20);
            const y = startY + row * (compact ? 22 : 28);
            const barW = colW - 60;

            doc.fontSize(9).fillColor('#374151').font('Helvetica')
                .text(axis.label, x, y + 1, { width: 55, lineBreak: false });
            drawBar(doc, x + 60, y + 2, barW, axis.score, scoreColor(axis.score));
            doc.fontSize(9).fillColor(scoreColor(axis.score)).font('Helvetica-Bold')
                .text(`${axis.score}%`, x + 60 + barW + 4, y + 1, { width: 26 });

            if (row > maxRow) maxRow = row;
        });

        doc.y = startY + (maxRow + 1) * (compact ? 22 : 28) + 6;
    }

    // Suggested modules
    if (!compact && scores.suggestedModules?.length) {
        doc.fontSize(9).fillColor('#6366f1').font('Helvetica-Bold').text('Modules recommandés :');
        scores.suggestedModules.forEach(item => {
            doc.fontSize(9).fillColor('#4b5563').font('Helvetica')
                .text(`  • ${item.module.name}  (${item.axisLabel} : ${item.score}%)`, { indent: 10 });
        });
        doc.moveDown(0.4);
    }

    // AI analysis
    if (!compact && audit.ai_analysis) {
        doc.fontSize(9).fillColor('#6366f1').font('Helvetica-Bold').text('Analyse IA :');
        doc.fontSize(9).fillColor('#4b5563').font('Helvetica')
            .text(audit.ai_analysis.slice(0, 600) + (audit.ai_analysis.length > 600 ? '…' : ''),
                  { align: 'justify', lineGap: 2 });
        doc.moveDown(0.4);
    }

    doc.moveDown(0.5);
    // Separator line
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
    doc.moveDown(0.5);
}

// PDF page header
function drawPageHeader(doc, title, subtitle = '') {
    // Purple band
    doc.rect(0, 0, 595, 56).fillColor('#6366f1').fill();
    doc.fontSize(18).fillColor('#ffffff').font('Helvetica-Bold')
        .text('AI Maturity Platform', 50, 12, { continued: !!subtitle });
    if (subtitle) {
        doc.fontSize(11).font('Helvetica').fillColor('#c7d2fe').text(`  ·  ${subtitle}`);
    }
    doc.fontSize(11).fillColor('#e0e7ff').font('Helvetica').text(title, 50, 34);
    doc.y = 72;
}

// ── GET /api/export/pdf?auditId= ─────────────────────────────────────────
// Individual audit PDF (user can download their own, admin can download any)
router.get('/pdf', requireAuth, async (req, res) => {
    const { auditId } = req.query;
    if (!auditId) return res.status(400).json({ error: 'auditId requis' });

    try {
        const { rows } = await pool.query(
            `SELECT a.*, u.email AS user_email, u.name AS user_name, c.name AS company_name
             FROM audits a
             LEFT JOIN users u ON a.user_id = u.id
             LEFT JOIN companies c ON a.company_id = c.id
             WHERE a.id = $1`,
            [auditId]
        );
        if (!rows[0]) return res.status(404).json({ error: 'Audit non trouvé' });
        const audit = rows[0];

        if (req.user.role !== 'admin' && audit.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Accès refusé' });
        }

        const scores = audit.scores || {};
        const profileName = PROFILE_NAMES[audit.profile_id] || audit.profile_id;
        const userName = audit.user_name || 'Anonyme';

        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition',
            `attachment; filename="evaluation-${userName.replace(/\s/g, '-')}-${auditId.slice(0, 8)}.pdf"`);
        doc.pipe(res);

        drawPageHeader(doc, `Rapport d'évaluation individuel`, audit.company_name || '');

        // ── Participant card ─────────────────────────────────────
        const cardY = doc.y;
        doc.roundedRect(50, cardY, 495, 72).fillColor('#f8f8ff').fill();
        doc.fontSize(14).fillColor('#1e1b4b').font('Helvetica-Bold')
            .text(userName, 64, cardY + 10);
        doc.fontSize(10).fillColor('#6b7280').font('Helvetica')
            .text(`${audit.user_email || '—'}`, 64, cardY + 28)
            .text(`Entreprise : ${audit.company_name || '—'}`, 64, cardY + 42)
            .text(`Profil : ${profileName}  ·  Date : ${new Date(audit.created_at).toLocaleDateString('fr-FR')}`, 64, cardY + 56);
        doc.y = cardY + 84;

        // ── Overall score ────────────────────────────────────────
        const overall = scores.overall || 0;
        const color = scoreColor(overall);
        doc.moveDown(0.5);
        doc.fontSize(28).fillColor(color).font('Helvetica-Bold')
            .text(`${overall}%`, 50, doc.y, { continued: true });
        doc.fontSize(14).fillColor('#374151').font('Helvetica')
            .text(`  ${scores.levelEmoji || ''}  ${levelLabel(overall)}`, { align: 'left' });
        doc.fontSize(10).fillColor('#9ca3af').font('Helvetica')
            .text('Score de maturité IA global');
        doc.moveDown(1);

        // ── 7 Axes ───────────────────────────────────────────────
        const axes = getAxisScores(scores);
        if (axes.length > 0) {
            doc.fontSize(13).fillColor('#1e1b4b').font('Helvetica-Bold').text('Scores par axe');
            doc.moveDown(0.4);

            axes.forEach(axis => {
                const c = scoreColor(axis.score);
                doc.fontSize(10).fillColor('#374151').font('Helvetica')
                    .text(axis.label, 50, doc.y, { width: 130, continued: false });
                const barY = doc.y - 12;
                drawBar(doc, 190, barY + 2, 270, axis.score, c);
                doc.fontSize(10).fillColor(c).font('Helvetica-Bold')
                    .text(`${axis.score}%`, 468, barY + 1, { width: 40 });
                doc.fontSize(8.5).fillColor('#9ca3af').font('Helvetica')
                    .text(levelLabel(axis.score), 514, barY + 2, { width: 60 });
                doc.moveDown(0.6);
            });
            doc.moveDown(0.5);
        }

        // ── Modules recommandés ──────────────────────────────────
        if (scores.suggestedModules?.length) {
            doc.fontSize(13).fillColor('#1e1b4b').font('Helvetica-Bold')
                .text('Modules de formation recommandés');
            doc.moveDown(0.4);
            scores.suggestedModules.forEach(item => {
                const boxY = doc.y;
                doc.roundedRect(50, boxY, 495, 38).fillColor('#eef2ff').fill();
                doc.fontSize(11).fillColor('#4338ca').font('Helvetica-Bold')
                    .text(item.module.name, 64, boxY + 6);
                doc.fontSize(9).fillColor('#6b7280').font('Helvetica')
                    .text(`${item.axisLabel} : ${item.score}%  ·  Durée : ${item.module.duration}  ·  Niveau : ${item.module.level}`,
                          64, boxY + 22);
                doc.y = boxY + 46;
            });
            doc.moveDown(0.5);
        }

        // ── AI Analysis ──────────────────────────────────────────
        if (audit.ai_analysis) {
            doc.fontSize(13).fillColor('#1e1b4b').font('Helvetica-Bold')
                .text('Analyse IA personnalisée');
            doc.moveDown(0.4);
            doc.roundedRect(50, doc.y, 495, 10).fillColor('#f5f3ff');
            doc.fontSize(10).fillColor('#374151').font('Helvetica')
                .text(audit.ai_analysis, 50, doc.y, { align: 'justify', lineGap: 3, width: 495 });
            doc.moveDown(1);
        }

        // ── Footer ───────────────────────────────────────────────
        doc.fontSize(8).fillColor('#9ca3af').font('Helvetica')
            .text(`Rapport généré le ${new Date().toLocaleDateString('fr-FR')} · AI Maturity Platform`,
                  50, 800, { align: 'center', width: 495 });

        doc.end();
    } catch (err) {
        console.error('PDF individual error:', err);
        res.status(500).json({ error: 'Erreur lors de la génération du PDF' });
    }
});

// ── GET /api/export/pdf/user?userId= ─────────────────────────────────────
// All audits for one user — admin OR the user themselves
router.get('/pdf/user', requireAuth, async (req, res) => {
    const userId = req.query.userId || req.user.id;

    // Non-admin can only download their own
    if (req.user.role !== 'admin' && userId !== req.user.id) {
        return res.status(403).json({ error: 'Accès refusé' });
    }

    try {
        const { rows: userRows } = await pool.query(
            `SELECT u.*, c.name AS company_name FROM users u
             LEFT JOIN companies c ON u.company_id = c.id
             WHERE u.id = $1`, [userId]
        );
        if (!userRows[0]) return res.status(404).json({ error: 'Utilisateur non trouvé' });
        const user = userRows[0];

        const { rows: audits } = await pool.query(
            `SELECT a.*, $1 AS user_name, $2 AS user_email
             FROM audits a
             WHERE a.user_id = $3
             ORDER BY a.created_at DESC`,
            [user.name, user.email, userId]
        );

        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const safeName = (user.name || 'user').replace(/\s/g, '-');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition',
            `attachment; filename="evaluations-${safeName}.pdf"`);
        doc.pipe(res);

        drawPageHeader(doc, `Toutes les évaluations — ${user.name || user.email}`, user.company_name || '');

        // User summary card
        const cardY = doc.y;
        doc.roundedRect(50, cardY, 495, 56).fillColor('#f8f8ff').fill();
        doc.fontSize(13).fillColor('#1e1b4b').font('Helvetica-Bold')
            .text(user.name || 'Anonyme', 64, cardY + 8);
        doc.fontSize(10).fillColor('#6b7280').font('Helvetica')
            .text(`${user.email}  ·  ${user.company_name || '—'}  ·  ${audits.length} évaluation(s)`,
                  64, cardY + 26);
        doc.y = cardY + 66;
        doc.moveDown(0.5);

        if (audits.length === 0) {
            doc.fontSize(12).fillColor('#9ca3af').font('Helvetica')
                .text('Aucune évaluation enregistrée.', { align: 'center' });
        } else {
            audits.forEach((audit, i) => {
                // Add new page if close to bottom
                if (doc.y > 700) doc.addPage();
                doc.fontSize(11).fillColor('#6366f1').font('Helvetica-Bold')
                    .text(`Évaluation ${i + 1}`, 50, doc.y);
                doc.moveDown(0.3);
                drawAuditBlock(doc, audit, { compact: false });
            });
        }

        // Footer
        doc.fontSize(8).fillColor('#9ca3af').font('Helvetica')
            .text(`Rapport généré le ${new Date().toLocaleDateString('fr-FR')} · AI Maturity Platform`,
                  50, 800, { align: 'center', width: 495 });

        doc.end();
    } catch (err) {
        console.error('PDF user error:', err);
        res.status(500).json({ error: 'Erreur lors de la génération du PDF' });
    }
});

// ── GET /api/export/pdf/company?companyId=&profileId= ────────────────────
// All users + all audits for a company — admin (any company) or manager (own company only)
router.get('/pdf/company', requireManager, async (req, res) => {
    let companyId;
    if (req.user.role === 'admin') {
        companyId = req.query.companyId || req.user.company_id;
    } else {
        companyId = req.user.company_id;
    }
    const profileId = req.query.profileId || null;

    try {
        const { rows: companyRows } = await pool.query(
            'SELECT * FROM companies WHERE id = $1', [companyId]
        );
        if (!companyRows[0]) return res.status(404).json({ error: 'Entreprise non trouvée' });
        const company = companyRows[0];

        const { rows: audits } = await pool.query(
            `SELECT a.*, u.name AS user_name, u.email AS user_email
             FROM audits a
             LEFT JOIN users u ON a.user_id = u.id
             WHERE a.company_id = $1 AND ($2::text IS NULL OR a.profile_id = $2)
             ORDER BY u.name, a.created_at DESC`,
            [companyId, profileId]
        );

        const { rows: users } = await pool.query(
            `SELECT id, name, email, role, status FROM users
             WHERE company_id = $1 AND ($2::text IS NULL OR id IN (
                 SELECT DISTINCT user_id FROM audits WHERE company_id = $1 AND profile_id = $2
             ))
             ORDER BY name`,
            [companyId, profileId]
        );

        // Group audits by user
        const auditsByUser = {};
        audits.forEach(a => {
            const key = a.user_id || 'unknown';
            if (!auditsByUser[key]) auditsByUser[key] = [];
            auditsByUser[key].push(a);
        });

        const avgScore = audits.length
            ? Math.round(audits.reduce((s, a) => s + (a.scores?.overall || 0), 0) / audits.length)
            : 0;

        const profileLabel = profileId ? (PROFILE_NAMES[profileId] || profileId) : null;
        const safeName = company.name.replace(/\s/g, '-');
        const safeProfile = profileId ? `-${profileId}` : '';
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition',
            `attachment; filename="rapport-equipe-${safeName}${safeProfile}.pdf"`);
        doc.pipe(res);

        // ── Cover page ────────────────────────────────────────────
        doc.rect(0, 0, 595, 842).fillColor('#6366f1').fill();
        doc.fontSize(36).fillColor('#ffffff').font('Helvetica-Bold')
            .text('AI Maturity', 50, 200, { align: 'center', width: 495 });
        doc.fontSize(20).fillColor('#c7d2fe').font('Helvetica')
            .text(profileLabel ? `Rapport — Profil ${profileLabel}` : 'Rapport d\'équipe',
                  50, 248, { align: 'center', width: 495 });
        doc.moveDown(2);
        doc.fontSize(24).fillColor('#ffffff').font('Helvetica-Bold')
            .text(company.name, 50, doc.y, { align: 'center', width: 495 });
        doc.moveDown(1);
        doc.fontSize(14).fillColor('#e0e7ff').font('Helvetica')
            .text(`${users.length} membres  ·  ${audits.length} évaluations  ·  Score moyen : ${avgScore}%`,
                  50, doc.y, { align: 'center', width: 495 });
        doc.fontSize(12).fillColor('#a5b4fc').font('Helvetica')
            .text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`,
                  50, doc.y + 20, { align: 'center', width: 495 });

        // ── Summary page ─────────────────────────────────────────
        doc.addPage();
        drawPageHeader(doc, `Résumé de l'équipe`, company.name);

        // Stats row
        const stats = [
            { label: 'Membres', value: users.length },
            { label: 'Évaluations', value: audits.length },
            { label: 'Score moyen', value: `${avgScore}%` },
            { label: 'Niveau moyen', value: levelLabel(avgScore) }
        ];
        const statW = 115;
        stats.forEach((s, i) => {
            const x = 50 + i * (statW + 8);
            const y = doc.y;
            doc.roundedRect(x, y, statW, 52).fillColor('#eef2ff').fill();
            doc.fontSize(20).fillColor('#4338ca').font('Helvetica-Bold')
                .text(String(s.value), x, y + 8, { width: statW, align: 'center' });
            doc.fontSize(9).fillColor('#6b7280').font('Helvetica')
                .text(s.label, x, y + 34, { width: statW, align: 'center' });
        });
        doc.y += 64;
        doc.moveDown(0.5);

        // Summary table header
        doc.fontSize(13).fillColor('#1e1b4b').font('Helvetica-Bold').text('Tableau récapitulatif');
        doc.moveDown(0.4);

        // Table headers
        const cols = [140, 80, 60, 80, 90];
        const colX = [50, 190, 270, 330, 410];
        const headers = ['Participant', 'Profil', 'Score', 'Niveau', 'Dernière éval.'];
        const tHeaderY = doc.y;
        doc.rect(50, tHeaderY, 495, 20).fillColor('#6366f1').fill();
        headers.forEach((h, i) => {
            doc.fontSize(9).fillColor('#ffffff').font('Helvetica-Bold')
                .text(h, colX[i], tHeaderY + 5, { width: cols[i] });
        });
        doc.y = tHeaderY + 24;

        // Table rows
        let rowAlt = false;
        audits.forEach(audit => {
            if (doc.y > 760) { doc.addPage(); drawPageHeader(doc, 'Récapitulatif (suite)', company.name); }
            const rowY = doc.y;
            if (rowAlt) doc.rect(50, rowY, 495, 18).fillColor('#f9f9ff').fill();
            const cells = [
                audit.user_name || 'Anonyme',
                PROFILE_NAMES[audit.profile_id] || audit.profile_id,
                `${audit.scores?.overall || 0}%`,
                levelLabel(audit.scores?.overall || 0),
                new Date(audit.created_at).toLocaleDateString('fr-FR')
            ];
            cells.forEach((cell, i) => {
                doc.fontSize(9).fillColor('#374151').font(i === 2 ? 'Helvetica-Bold' : 'Helvetica')
                    .fillColor(i === 2 ? scoreColor(audit.scores?.overall || 0) : '#374151')
                    .text(cell, colX[i], rowY + 4, { width: cols[i] });
            });
            doc.y = rowY + 22;
            rowAlt = !rowAlt;
        });

        // ── Per-user detail pages ─────────────────────────────────
        users.forEach(user => {
            const userAudits = auditsByUser[user.id] || [];
            if (userAudits.length === 0) return;

            doc.addPage();
            drawPageHeader(doc, `Détail — ${user.name || user.email}`, company.name);

            const cardY = doc.y;
            doc.roundedRect(50, cardY, 495, 46).fillColor('#f8f8ff').fill();
            doc.fontSize(12).fillColor('#1e1b4b').font('Helvetica-Bold')
                .text(user.name || 'Anonyme', 64, cardY + 7);
            doc.fontSize(9).fillColor('#6b7280').font('Helvetica')
                .text(`${user.email}  ·  ${userAudits.length} évaluation(s)`, 64, cardY + 25);
            doc.y = cardY + 56;
            doc.moveDown(0.3);

            userAudits.forEach((audit, i) => {
                if (doc.y > 700) doc.addPage();
                doc.fontSize(10).fillColor('#6366f1').font('Helvetica-Bold')
                    .text(`Évaluation ${i + 1}`, 50, doc.y);
                doc.moveDown(0.2);
                drawAuditBlock(doc, audit, { compact: userAudits.length > 2 });
            });
        });

        // Footer on last page
        doc.fontSize(8).fillColor('#9ca3af').font('Helvetica')
            .text(`Rapport généré le ${new Date().toLocaleDateString('fr-FR')} · AI Maturity Platform`,
                  50, 800, { align: 'center', width: 495 });

        doc.end();
    } catch (err) {
        console.error('PDF company error:', err);
        res.status(500).json({ error: 'Erreur lors de la génération du PDF' });
    }
});

// ── GET /api/export/excel?companyId=&profileId= ──────────────────────────
// Admin (any company) or manager (own company only)
router.get('/excel', requireManager, async (req, res) => {
    let companyId;
    if (req.user.role === 'admin') {
        companyId = req.query.companyId || req.user.company_id;
    } else {
        companyId = req.user.company_id;
    }
    const profileId = req.query.profileId || null;

    try {
        const { rows: company } = await pool.query('SELECT * FROM companies WHERE id = $1', [companyId]);
        if (!company[0]) return res.status(404).json({ error: 'Entreprise non trouvée' });

        const { rows: audits } = await pool.query(
            `SELECT a.*, u.email AS user_email, u.name AS user_name
             FROM audits a LEFT JOIN users u ON a.user_id = u.id
             WHERE a.company_id = $1 AND ($2::text IS NULL OR a.profile_id = $2)
             ORDER BY a.created_at DESC`,
            [companyId, profileId]
        );

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'AI Maturity Platform';
        workbook.created = new Date();

        // ── Sheet 1: Summary ──────────────────────────────────────
        const summarySheet = workbook.addWorksheet('Résumé');
        summarySheet.columns = [
            { header: 'Participant', key: 'name', width: 25 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'Profil', key: 'profile', width: 20 },
            { header: 'Score Global (%)', key: 'score', width: 18 },
            { header: 'Niveau', key: 'level', width: 15 },
            { header: 'Date', key: 'date', width: 20 }
        ];
        summarySheet.getRow(1).eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6366F1' } };
            cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
            cell.alignment = { horizontal: 'center' };
        });
        for (const audit of audits) {
            const scores = audit.scores || {};
            summarySheet.addRow({
                name: audit.user_name || 'Anonyme',
                email: audit.user_email || '',
                profile: PROFILE_NAMES[audit.profile_id] || audit.profile_id,
                score: scores.overall || 0,
                level: scores.levelLabel || levelLabel(scores.overall || 0),
                date: new Date(audit.created_at).toLocaleDateString('fr-FR')
            });
        }

        // ── Sheet 2: Axes detail ──────────────────────────────────
        const dimSheet = workbook.addWorksheet('Axes IA');
        const axisColumns = [
            { header: 'Participant', key: 'name', width: 25 },
            { header: 'Profil', key: 'profile', width: 20 },
            ...AXIS_ORDER.map(k => ({ header: AXIS_LABELS[k], key: k, width: 18 }))
        ];
        dimSheet.columns = axisColumns;
        dimSheet.getRow(1).eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8B5CF6' } };
            cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
        });
        for (const audit of audits) {
            const axes = getAxisScores(audit.scores);
            const row = {
                name: audit.user_name || 'Anonyme',
                profile: PROFILE_NAMES[audit.profile_id] || audit.profile_id
            };
            axes.forEach(a => { row[a.key] = a.score; });
            dimSheet.addRow(row);
        }

        // ── Sheet 3: AI Analysis ──────────────────────────────────
        const aiSheet = workbook.addWorksheet('Analyses IA');
        aiSheet.columns = [
            { header: 'Participant', key: 'name', width: 25 },
            { header: 'Profil', key: 'profile', width: 20 },
            { header: 'Score', key: 'score', width: 10 },
            { header: 'Analyse IA', key: 'analysis', width: 80 }
        ];
        aiSheet.getRow(1).eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEC4899' } };
            cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
        });
        for (const audit of audits) {
            const row = aiSheet.addRow({
                name: audit.user_name || 'Anonyme',
                profile: PROFILE_NAMES[audit.profile_id] || audit.profile_id,
                score: audit.scores?.overall || 0,
                analysis: audit.ai_analysis || 'Analyse non disponible'
            });
            row.getCell('analysis').alignment = { wrapText: true };
        }

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition',
            `attachment; filename="ai-maturity-${company[0].name}-${Date.now()}.xlsx"`);
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error('Excel export error:', err);
        res.status(500).json({ error: 'Erreur lors de la génération du fichier Excel' });
    }
});

// ── GET /api/export/pdf/legacy?auditId= ──────────────────────────────────
// PDF pour un audit du système legacy (JSON database)
router.get('/pdf/legacy', async (req, res) => {
    const { auditId } = req.query;
    if (!auditId) return res.status(400).json({ error: 'auditId requis' });

    try {
        const db = require('../database');
        const audit = db.getAuditById(auditId);
        if (!audit) return res.status(404).json({ error: 'Audit non trouvé' });

        const scores = audit.scores || {};
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const safeName = (audit.respondentName || 'anonyme').replace(/\s/g, '-');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition',
            `attachment; filename="evaluation-${safeName}.pdf"`);
        doc.pipe(res);

        // ── Header ────────────────────────────────────────────────
        doc.rect(0, 0, 595, 56).fillColor('#6366f1').fill();
        doc.fontSize(18).fillColor('#ffffff').font('Helvetica-Bold')
            .text('AI Maturity Platform', 50, 12);
        doc.fontSize(11).fillColor('#e0e7ff').font('Helvetica')
            .text('Rapport d\'évaluation', 50, 34);
        doc.y = 72;

        // ── Participant card ──────────────────────────────────────
        const cardY = doc.y;
        doc.roundedRect(50, cardY, 495, 60).fillColor('#f8f8ff').fill();
        doc.fontSize(14).fillColor('#1e1b4b').font('Helvetica-Bold')
            .text(audit.respondentName || 'Anonyme', 64, cardY + 10);
        doc.fontSize(10).fillColor('#6b7280').font('Helvetica')
            .text(`Email : ${audit.respondentEmail || '—'}`, 64, cardY + 28)
            .text(`Profil : ${audit.profileName || audit.profileId}  ·  Date : ${new Date(audit.created_at).toLocaleDateString('fr-FR')}`, 64, cardY + 43);
        doc.y = cardY + 72;

        // ── Score global ──────────────────────────────────────────
        const overall = scores.overall || 0;
        const color = scoreColor(overall);
        doc.moveDown(0.5);
        doc.fontSize(28).fillColor(color).font('Helvetica-Bold')
            .text(`${overall}%`, 50, doc.y, { continued: true });
        doc.fontSize(14).fillColor('#374151').font('Helvetica')
            .text(`  ${scores.levelEmoji || ''}  ${scores.levelLabel || levelLabel(overall)}`);
        doc.fontSize(10).fillColor('#9ca3af').text('Score de maturité IA global');
        doc.moveDown(1);

        // ── Scores par dimension ──────────────────────────────────
        if (scores.dimensions && Object.keys(scores.dimensions).length > 0) {
            doc.fontSize(13).fillColor('#1e1b4b').font('Helvetica-Bold').text('Scores par dimension');
            doc.moveDown(0.4);

            for (const [dim, score] of Object.entries(scores.dimensions)) {
                const s = Number(score);
                const c = scoreColor(s);
                doc.fontSize(10).fillColor('#374151').font('Helvetica')
                    .text(dim, 50, doc.y, { width: 130 });
                const barY = doc.y - 12;
                drawBar(doc, 190, barY + 2, 270, s, c);
                doc.fontSize(10).fillColor(c).font('Helvetica-Bold')
                    .text(`${s}%`, 468, barY + 1, { width: 40 });
                doc.fontSize(8.5).fillColor('#9ca3af').font('Helvetica')
                    .text(levelLabel(s), 514, barY + 2, { width: 60 });
                doc.moveDown(0.6);
            }
            doc.moveDown(0.5);
        }

        // ── Recommandations ───────────────────────────────────────
        if (scores.recommendations?.length) {
            doc.fontSize(13).fillColor('#1e1b4b').font('Helvetica-Bold').text('Recommandations');
            doc.moveDown(0.4);
            scores.recommendations.forEach((rec, i) => {
                const boxY = doc.y;
                doc.roundedRect(50, boxY, 495, 24).fillColor('#eef2ff').fill();
                doc.fontSize(10).fillColor('#374151').font('Helvetica')
                    .text(`${i + 1}.  ${rec}`, 64, boxY + 6, { width: 467 });
                doc.y = boxY + 30;
            });
            doc.moveDown(0.5);
        }

        // ── Footer ────────────────────────────────────────────────
        doc.fontSize(8).fillColor('#9ca3af').font('Helvetica')
            .text(`Rapport généré le ${new Date().toLocaleDateString('fr-FR')} · AI Maturity Platform`,
                  50, 800, { align: 'center', width: 495 });

        doc.end();
    } catch (err) {
        console.error('PDF legacy error:', err);
        res.status(500).json({ error: 'Erreur lors de la génération du PDF' });
    }
});

module.exports = router;
