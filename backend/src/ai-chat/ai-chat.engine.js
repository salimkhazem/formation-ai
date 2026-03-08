const https = require('https');
const url = require('url');
const pool = require('../db/pool');

const PROFILES = {
    'developpeur':      { name: 'Développeur',      icon: '💻', color: '#14b8a6' },
    'business-analyst': { name: 'Business Analyst', icon: '📊', color: '#8b5cf6' },
    'manager':          { name: 'Manager',           icon: '👥', color: '#ec4899' },
    'fonctionnel':      { name: 'Fonctionnel',       icon: '⚙️', color: '#6366f1' },
    'expert-ia':        { name: 'Expert IA',         icon: '🤖', color: '#f59e0b' }
};

const AXES = {
    utilisation:    { label: 'Utilisation',        icon: '🛠️', color: '#14b8a6' },
    prompting:      { label: 'Prompting',           icon: '✍️', color: '#6366f1' },
    ethique:        { label: 'Éthique & Sécurité',  icon: '⚖️', color: '#ec4899' },
    formation:      { label: 'Formation',           icon: '🎓', color: '#8b5cf6' },
    automatisation: { label: 'Automatisation',      icon: '⚙️', color: '#f59e0b' },
    gouvernance:    { label: 'Gouvernance',         icon: '🏛️', color: '#3b82f6' },
    impact:         { label: 'Impact & ROI',        icon: '📈', color: '#22c55e' }
};

const MODULES = {
    utilisation:    { name: 'Découverte des outils IA',          duration: '2h', level: 'Débutant'      },
    prompting:      { name: 'Prompt Engineering fondamentaux',   duration: '4h', level: 'Intermédiaire' },
    ethique:        { name: 'IA Responsable & Éthique',          duration: '3h', level: 'Tous niveaux'  },
    formation:      { name: 'Formation IA Générative accélérée', duration: '6h', level: 'Débutant'      },
    automatisation: { name: 'Automatisation des tâches par IA',  duration: '5h', level: 'Intermédiaire' },
    gouvernance:    { name: 'Gouvernance IA en entreprise',      duration: '3h', level: 'Manager'       },
    impact:         { name: "Mesurer et piloter le ROI de l'IA", duration: '2h', level: 'Manager'       }
};

function buildSystemPrompt(profileId) {
    const profile = PROFILES[profileId] || { name: 'Professionnel', icon: '👤' };
    return `Tu es un expert en transformation IA qui conduit des entretiens d'évaluation de maturité professionnelle. Tu es bienveillant, précis et adaptes ton langage au profil de ton interlocuteur.

Profil du candidat : ${profile.name} ${profile.icon}

MISSION : Mène un entretien naturel et conversationnel pour évaluer le niveau de maturité IA de ce(tte) ${profile.name} sur ces 7 dimensions :
• utilisation — Fréquence et diversité des outils IA utilisés au quotidien
• prompting — Maîtrise de la formulation des requêtes et du prompt engineering
• ethique — Sensibilisation aux risques (confidentialité, biais, hallucinations, RGPD)
• formation — Niveau de formation et d'apprentissage continu sur l'IA
• automatisation — Capacité à automatiser des tâches métier avec l'IA
• gouvernance — Connaissance et respect de la politique IA de l'entreprise
• impact — Gains concrets et mesurés grâce à l'IA dans son travail

RÈGLES IMPÉRATIVES :
1. Commence IMMÉDIATEMENT par une question concrète sur l'utilisation des outils IA (sans introduction)
2. Pose UNE SEULE question à la fois, courte et précise
3. Adapte le vocabulaire au profil ${profile.name} (ex: parle de code pour un dev, de specs pour un BA, de ROI pour un manager)
4. Reformule et approfondis selon les réponses (si avancé → creuse, si débutant → reste accessible)
5. Sois encourageant et professionnel, jamais condescendant
6. Ne mentionne JAMAIS les 7 dimensions explicitement par leur nom technique
7. Couvre TOUTES les 7 dimensions en 12 à 16 échanges maximum
8. Après avoir tout couvert, fais un récapitulatif positif de 2-3 phrases

CONCLUSION OBLIGATOIRE : Termine impérativement par cette balise exacte suivie des scores JSON :
##SCORES##
{"utilisation":X,"prompting":X,"ethique":X,"formation":X,"automatisation":X,"gouvernance":X,"impact":X}

Où X est un entier entre 0 et 100, basé sur l'analyse approfondie des réponses. Sois précis et nuancé dans ton évaluation.`;
}

function callAzureOpenAI(messages) {
    const endpoint = (process.env.AZURE_OPENAI_ENDPOINT || '').replace(/\/$/, '');
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini';
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview';
    const apiKey = process.env.AZURE_OPENAI_API_KEY;

    const targetUrl = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
    const body = JSON.stringify({ messages, max_tokens: 600, temperature: 0.7 });

    return new Promise((resolve, reject) => {
        const parsed = url.parse(targetUrl);
        const req = https.request({
            hostname: parsed.hostname,
            path: parsed.path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
                'api-key': apiKey
            }
        }, (res) => {
            let data = '';
            res.on('data', c => { data += c; });
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.error) return reject(new Error(json.error.message));
                    const text = json.choices?.[0]?.message?.content;
                    resolve(text || '');
                } catch (e) { reject(e); }
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

function parseScores(text) {
    const marker = '##SCORES##';
    const idx = text.indexOf(marker);
    if (idx === -1) return null;

    const jsonPart = text.slice(idx + marker.length).trim();
    const match = jsonPart.match(/\{[\s\S]*\}/);
    if (!match) return null;

    try {
        const raw = JSON.parse(match[0]);
        // Clamp scores 0-100 and enrich with metadata
        const axisScores = {};
        for (const [axis, meta] of Object.entries(AXES)) {
            const score = Math.max(0, Math.min(100, parseInt(raw[axis]) || 0));
            axisScores[axis] = { score, label: meta.label, icon: meta.icon, color: meta.color, hasData: true };
        }

        const values = Object.values(axisScores).map(a => a.score);
        const overall = Math.round(values.reduce((s, v) => s + v, 0) / values.length);

        const suggestedModules = Object.entries(axisScores)
            .filter(([, a]) => a.score < 50)
            .sort((a, b) => a[1].score - b[1].score)
            .map(([axis, a]) => ({ axis, axisLabel: a.label, axisIcon: a.icon, score: a.score, module: MODULES[axis] }));

        const levelLabel = overall <= 25 ? 'Découverte' : overall <= 50 ? 'Exploration' : overall <= 75 ? 'Adoption' : 'Maîtrise';
        const levelEmoji = overall <= 25 ? '🔴' : overall <= 50 ? '🟠' : overall <= 75 ? '🟡' : '🟢';
        const levelColor = overall <= 25 ? '#ef4444' : overall <= 50 ? '#f97316' : overall <= 75 ? '#eab308' : '#22c55e';

        // Strip the ##SCORES## block from displayed text
        const displayText = text.slice(0, idx).trim();

        return { overall, axisScores, suggestedModules, levelLabel, levelEmoji, levelColor, displayText };
    } catch (e) {
        return null;
    }
}

// ── Public API ────────────────────────────────────────────────────────

async function startSession(userId, profileId) {
    if (!PROFILES[profileId]) throw new Error(`Profil inconnu: ${profileId}`);
    if (!process.env.AZURE_OPENAI_API_KEY) throw new Error('Azure OpenAI non configuré');

    // Cancel previous in-progress sessions
    await pool.query(
        `UPDATE ai_chat_sessions SET status = 'completed' WHERE user_id = $1 AND profile_id = $2 AND status = 'in_progress'`,
        [userId, profileId]
    );

    const systemPrompt = buildSystemPrompt(profileId);
    const systemMessage = { role: 'system', content: systemPrompt };

    // Get first AI message
    const firstReply = await callAzureOpenAI([systemMessage]);

    const messages = [
        systemMessage,
        { role: 'assistant', content: firstReply }
    ];

    const { rows } = await pool.query(
        `INSERT INTO ai_chat_sessions (user_id, profile_id, messages, status)
         VALUES ($1, $2, $3::jsonb, 'in_progress') RETURNING id`,
        [userId, profileId, JSON.stringify(messages)]
    );

    return {
        sessionId: rows[0].id,
        profile: { id: profileId, ...PROFILES[profileId] },
        message: firstReply,
        completed: false
    };
}

async function sendMessage(sessionId, userId, userText) {
    const { rows } = await pool.query(
        `SELECT * FROM ai_chat_sessions WHERE id = $1 AND status = 'in_progress'`,
        [sessionId]
    );
    if (!rows[0]) throw new Error('Session introuvable ou déjà terminée');
    const session = rows[0];
    if (session.user_id !== userId) throw new Error('Accès refusé');

    const messages = Array.isArray(session.messages) ? session.messages : JSON.parse(session.messages);
    messages.push({ role: 'user', content: userText });

    const aiReply = await callAzureOpenAI(messages);
    messages.push({ role: 'assistant', content: aiReply });

    // Detect completion
    const parsed = parseScores(aiReply);

    if (parsed) {
        const scores = {
            overall: parsed.overall,
            axisScores: parsed.axisScores,
            suggestedModules: parsed.suggestedModules,
            levelLabel: parsed.levelLabel,
            levelEmoji: parsed.levelEmoji,
            levelColor: parsed.levelColor
        };

        // Save audit
        const { rows: auditRows } = await pool.query(
            `INSERT INTO audits (user_id, company_id, profile_id, answers, scores, ai_analysis)
             VALUES ($1, (SELECT company_id FROM users WHERE id = $1), $2, '{}', $3::jsonb, $4) RETURNING id`,
            [userId, session.profile_id, JSON.stringify(scores), parsed.displayText || aiReply]
        );

        await pool.query(
            `UPDATE ai_chat_sessions SET messages = $1::jsonb, status = 'completed', scores = $2::jsonb WHERE id = $3`,
            [JSON.stringify(messages), JSON.stringify(scores), sessionId]
        );

        return {
            message: parsed.displayText || 'Évaluation terminée !',
            completed: true,
            auditId: auditRows[0].id,
            scores,
            profile: PROFILES[session.profile_id]
        };
    }

    await pool.query(
        `UPDATE ai_chat_sessions SET messages = $1::jsonb WHERE id = $2`,
        [JSON.stringify(messages), sessionId]
    );

    return { message: aiReply, completed: false };
}

module.exports = { startSession, sendMessage, PROFILES };
