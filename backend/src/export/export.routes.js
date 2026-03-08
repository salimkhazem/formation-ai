const express = require('express');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const pool = require('../db/pool');
const { requireAdmin, requireAuth } = require('../auth/auth.middleware');

const router = express.Router();

const PROFILE_NAMES = {
    'developpeur': 'Développeur',
    'business-analyst': 'Business Analyst',
    'manager': 'Manager',
    'fonctionnel': 'Fonctionnel',
    'expert-ia': 'Expert IA'
};

// GET /api/export/excel?companyId=
router.get('/excel', requireAdmin, async (req, res) => {
    const companyId = req.query.companyId || req.user.company_id;

    try {
        const { rows: company } = await pool.query('SELECT * FROM companies WHERE id = $1', [companyId]);
        if (!company[0]) return res.status(404).json({ error: 'Entreprise non trouvée' });

        const { rows: audits } = await pool.query(
            `SELECT a.*, u.email AS user_email, u.name AS user_name
             FROM audits a
             LEFT JOIN users u ON a.user_id = u.id
             WHERE a.company_id = $1
             ORDER BY a.created_at DESC`,
            [companyId]
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

        // Style header row
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
                level: scores.levelLabel || '',
                date: new Date(audit.created_at).toLocaleDateString('fr-FR')
            });
        }

        // ── Sheet 2: Dimensions Detail ────────────────────────────
        const dimSheet = workbook.addWorksheet('Dimensions');
        const allDimensions = new Set();
        audits.forEach(a => {
            if (a.scores?.dimensions) {
                Object.keys(a.scores.dimensions).forEach(d => allDimensions.add(d));
            }
        });

        const dimColumns = [
            { header: 'Participant', key: 'name', width: 25 },
            { header: 'Profil', key: 'profile', width: 20 },
            ...Array.from(allDimensions).map(d => ({ header: d, key: d, width: 18 }))
        ];
        dimSheet.columns = dimColumns;

        dimSheet.getRow(1).eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8B5CF6' } };
            cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
        });

        for (const audit of audits) {
            const row = {
                name: audit.user_name || 'Anonyme',
                profile: PROFILE_NAMES[audit.profile_id] || audit.profile_id
            };
            if (audit.scores?.dimensions) {
                for (const [dim, score] of Object.entries(audit.scores.dimensions)) {
                    row[dim] = score;
                }
            }
            dimSheet.addRow(row);
        }

        // ── Sheet 3: AI Analysis ──────────────────────────────────
        const aiSheet = workbook.addWorksheet('Analyses IA');
        aiSheet.columns = [
            { header: 'Participant', key: 'name', width: 25 },
            { header: 'Profil', key: 'profile', width: 20 },
            { header: 'Score', key: 'score', width: 10 },
            { header: 'Analyse Claude', key: 'analysis', width: 80 }
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
        res.setHeader('Content-Disposition', `attachment; filename="ai-maturity-${company[0].name}-${Date.now()}.xlsx"`);
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error('Excel export error:', err);
        res.status(500).json({ error: 'Erreur lors de la génération du fichier Excel' });
    }
});

// GET /api/export/pdf?auditId=
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

        // Access control
        if (req.user.role !== 'admin' && audit.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Accès refusé' });
        }

        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="audit-${auditId}.pdf"`);
        doc.pipe(res);

        const scores = audit.scores || {};
        const profileName = PROFILE_NAMES[audit.profile_id] || audit.profile_id;

        // ── Header ────────────────────────────────────────────────
        doc.fontSize(24).fillColor('#6366f1').text('AI Maturity Platform', { align: 'center' });
        doc.fontSize(14).fillColor('#8b5cf6').text('Rapport d\'Évaluation de Maturité IA', { align: 'center' });
        doc.moveDown();

        // ── Participant Info ───────────────────────────────────────
        doc.fontSize(12).fillColor('#333333');
        doc.rect(50, doc.y, 495, 80).fillAndStroke('#f8f9ff', '#e2e8f0');
        const infoY = doc.y + 10;
        doc.fillColor('#333333')
            .text(`Participant : ${audit.user_name || 'Anonyme'}`, 60, infoY)
            .text(`Email : ${audit.user_email || '—'}`, 60)
            .text(`Entreprise : ${audit.company_name || '—'}`, 60)
            .text(`Profil : ${profileName}`, 60)
            .text(`Date : ${new Date(audit.created_at).toLocaleDateString('fr-FR')}`, 60);

        doc.moveDown(2);

        // ── Overall Score ─────────────────────────────────────────
        doc.fontSize(18).fillColor('#6366f1').text(`Score Global : ${scores.overall || 0}%`, { align: 'center' });
        doc.fontSize(14).fillColor(scores.levelColor || '#666').text(`${scores.levelEmoji || ''} ${scores.levelLabel || ''}`, { align: 'center' });
        doc.moveDown();

        // ── Dimensions ────────────────────────────────────────────
        if (scores.dimensions && Object.keys(scores.dimensions).length > 0) {
            doc.fontSize(14).fillColor('#333333').text('Scores par Dimension', { underline: true });
            doc.moveDown(0.5);

            for (const [dim, score] of Object.entries(scores.dimensions)) {
                doc.fontSize(11).fillColor('#555555').text(`${dim}`, { continued: true });
                doc.fillColor('#6366f1').text(` — ${score}%`, { align: 'right' });

                // Progress bar
                const barY = doc.y;
                doc.rect(50, barY, 495, 8).fillColor('#e2e8f0').fill();
                doc.rect(50, barY, Math.round(495 * score / 100), 8).fillColor('#6366f1').fill();
                doc.moveDown(0.8);
            }
            doc.moveDown();
        }

        // ── Recommendations ───────────────────────────────────────
        if (scores.recommendations?.length) {
            doc.fontSize(14).fillColor('#333333').text('Recommandations', { underline: true });
            doc.moveDown(0.5);
            scores.recommendations.forEach((rec, i) => {
                doc.fontSize(10).fillColor('#555555').text(`${i + 1}. ${rec}`);
                doc.moveDown(0.3);
            });
            doc.moveDown();
        }

        // ── AI Analysis ───────────────────────────────────────────
        if (audit.ai_analysis) {
            doc.fontSize(14).fillColor('#333333').text('Analyse Personnalisée (Claude AI)', { underline: true });
            doc.moveDown(0.5);
            doc.fontSize(10).fillColor('#444444').text(audit.ai_analysis, { align: 'justify', lineGap: 4 });
        }

        // ── Footer ────────────────────────────────────────────────
        doc.moveDown(2);
        doc.fontSize(9).fillColor('#94a3b8').text(
            `Rapport généré le ${new Date().toLocaleDateString('fr-FR')} par AI Maturity Platform`,
            { align: 'center' }
        );

        doc.end();
    } catch (err) {
        console.error('PDF export error:', err);
        res.status(500).json({ error: 'Erreur lors de la génération du PDF' });
    }
});

module.exports = router;
