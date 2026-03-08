const sgMail = require('@sendgrid/mail');

const APP_URL = process.env.APP_URL || 'http://localhost:4200';

if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

async function sendInvitation(toEmail, userName, token, companyName) {
    const link = `${APP_URL}/accept-invite?token=${token}`;

    if (!process.env.SENDGRID_API_KEY) {
        console.log(`[EMAIL DEV] Invitation to ${toEmail}: ${link}`);
        return;
    }

    const msg = {
        to: toEmail,
        from: process.env.SENDGRID_FROM || 'noreply@ai-maturity.com',
        subject: `Invitation à rejoindre ${companyName} sur AI Maturity Platform`,
        html: `
            <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f1a; color: #e2e8f0; padding: 40px; border-radius: 16px;">
                <h1 style="color: #6366f1; margin-bottom: 8px;">AI Maturity Platform</h1>
                <p style="color: #94a3b8; margin-bottom: 32px;">Plateforme d'évaluation de maturité IA</p>

                <h2 style="color: #f1f5f9;">Bonjour ${userName},</h2>
                <p style="color: #cbd5e1; line-height: 1.6;">
                    Vous avez été invité(e) à rejoindre <strong style="color: #818cf8;">${companyName}</strong>
                    sur la plateforme AI Maturity pour évaluer votre niveau de maturité en intelligence artificielle.
                </p>

                <a href="${link}" style="display: inline-block; margin: 24px 0; padding: 14px 28px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px;">
                    Activer mon compte
                </a>

                <p style="color: #64748b; font-size: 14px;">
                    Ou copiez ce lien dans votre navigateur :<br>
                    <a href="${link}" style="color: #6366f1;">${link}</a>
                </p>

                <hr style="border: none; border-top: 1px solid #1e293b; margin: 32px 0;">
                <p style="color: #475569; font-size: 13px;">
                    Ce lien d'invitation est à usage unique. Si vous n'avez pas demandé cette invitation, ignorez cet email.
                </p>
            </div>
        `
    };

    await sgMail.send(msg);
}

async function sendAuditResults(toEmail, userName, auditId, scores) {
    const link = `${APP_URL}/user/results`;

    if (!process.env.SENDGRID_API_KEY) {
        console.log(`[EMAIL DEV] Audit results to ${toEmail}: score ${scores.overall}%`);
        return;
    }

    const msg = {
        to: toEmail,
        from: process.env.SENDGRID_FROM || 'noreply@ai-maturity.com',
        subject: `Vos résultats d'évaluation IA — Score : ${scores.overall}%`,
        html: `
            <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f1a; color: #e2e8f0; padding: 40px; border-radius: 16px;">
                <h1 style="color: #6366f1;">Vos résultats sont disponibles</h1>
                <p>Bonjour ${userName},</p>
                <p>Votre évaluation IA est terminée. Score global : <strong style="color: #22c55e; font-size: 24px;">${scores.overall}%</strong> (${scores.levelLabel})</p>
                <a href="${link}" style="display: inline-block; margin: 24px 0; padding: 14px 28px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; text-decoration: none; border-radius: 10px; font-weight: 600;">
                    Voir mes résultats détaillés
                </a>
            </div>
        `
    };

    await sgMail.send(msg);
}

module.exports = { sendInvitation, sendAuditResults };
