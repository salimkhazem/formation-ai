const pool = require('../db/pool');

// ── 7 Axes d'évaluation ──────────────────────────────────────────────
const AXES = {
    utilisation:    { label: 'Utilisation',       icon: '🛠️',  color: '#14b8a6' },
    prompting:      { label: 'Prompting',          icon: '✍️',  color: '#6366f1' },
    ethique:        { label: 'Éthique & Sécurité', icon: '⚖️',  color: '#ec4899' },
    formation:      { label: 'Formation',          icon: '🎓',  color: '#8b5cf6' },
    automatisation: { label: 'Automatisation',     icon: '⚙️',  color: '#f59e0b' },
    gouvernance:    { label: 'Gouvernance',        icon: '🏛️',  color: '#3b82f6' },
    impact:         { label: 'Impact & ROI',       icon: '📈',  color: '#22c55e' }
};

// ── Modules de formation suggérés par axe ────────────────────────────
const MODULES = {
    utilisation:    { name: 'Découverte des outils IA',         duration: '2h',   level: 'Débutant'       },
    prompting:      { name: 'Prompt Engineering fondamentaux',  duration: '4h',   level: 'Intermédiaire'  },
    ethique:        { name: 'IA Responsable & Éthique',         duration: '3h',   level: 'Tous niveaux'   },
    formation:      { name: 'Formation IA Générative accélérée',duration: '6h',   level: 'Débutant'       },
    automatisation: { name: 'Automatisation des tâches par IA', duration: '5h',   level: 'Intermédiaire'  },
    gouvernance:    { name: 'Gouvernance IA en entreprise',     duration: '3h',   level: 'Manager'        },
    impact:         { name: 'Mesurer et piloter le ROI de l\'IA',duration: '2h',  level: 'Manager'        }
};

// ── Profils disponibles ───────────────────────────────────────────────
const PROFILES = {
    'developpeur':      { name: 'Développeur',      icon: '💻', color: '#14b8a6' },
    'business-analyst': { name: 'Business Analyst', icon: '📊', color: '#8b5cf6' },
    'manager':          { name: 'Manager',           icon: '👥', color: '#ec4899' },
    'fonctionnel':      { name: 'Fonctionnel',       icon: '⚙️', color: '#6366f1' },
    'expert-ia':        { name: 'Expert IA',         icon: '🤖', color: '#f59e0b' }
};

async function getQuestionsForProfile(profileId) {
    const { rows: general } = await pool.query(
        `SELECT * FROM questions WHERE profile_id IS NULL ORDER BY order_index ASC`
    );
    const { rows: specific } = await pool.query(
        `SELECT * FROM questions WHERE profile_id = $1 ORDER BY order_index ASC`,
        [profileId]
    );
    return [...general, ...specific];
}

async function startSession(userId, profileId) {
    if (!PROFILES[profileId]) throw new Error(`Profil inconnu: ${profileId}`);

    await pool.query(
        `UPDATE audit_sessions SET status = 'completed'
         WHERE user_id = $1 AND profile_id = $2 AND status = 'in_progress'`,
        [userId, profileId]
    );

    const { rows } = await pool.query(
        `INSERT INTO audit_sessions (user_id, profile_id, current_question_index, answers, status)
         VALUES ($1, $2, 0, '{}', 'in_progress') RETURNING *`,
        [userId, profileId]
    );
    const session = rows[0];
    const questions = await getQuestionsForProfile(profileId);
    if (!questions.length) throw new Error('Aucune question disponible');

    return {
        sessionId: session.id,
        profile: { id: profileId, ...PROFILES[profileId] },
        question: formatQuestion(questions[0], 0, questions.length),
        totalQuestions: questions.length
    };
}

async function submitAnswer(sessionId, answer) {
    const { rows } = await pool.query(
        `SELECT * FROM audit_sessions WHERE id = $1 AND status = 'in_progress'`,
        [sessionId]
    );
    if (!rows[0]) throw new Error('Session introuvable ou déjà terminée');
    const session = rows[0];

    const questions = await getQuestionsForProfile(session.profile_id);
    const currentIndex = session.current_question_index;
    if (currentIndex >= questions.length) throw new Error('Toutes les questions ont été répondues');

    const currentQuestion = questions[currentIndex];
    const updatedAnswers = { ...session.answers, [currentQuestion.id]: answer };
    const nextIndex = currentIndex + 1;
    const isCompleted = nextIndex >= questions.length;

    await pool.query(
        `UPDATE audit_sessions
         SET answers = $1::jsonb, current_question_index = $2, status = $3
         WHERE id = $4`,
        [JSON.stringify(updatedAnswers), nextIndex, isCompleted ? 'completed' : 'in_progress', sessionId]
    );

    if (isCompleted) return { completed: true, sessionId };

    const nextQuestion = formatQuestion(questions[nextIndex], nextIndex, questions.length);
    return {
        completed: false,
        question: nextQuestion,
        progress: Math.round((nextIndex / questions.length) * 100),
        answeredCount: nextIndex,
        totalQuestions: questions.length
    };
}

async function completeSession(sessionId, userId, companyId) {
    const { rows } = await pool.query(
        `SELECT * FROM audit_sessions WHERE id = $1`,
        [sessionId]
    );
    if (!rows[0]) throw new Error('Session introuvable');
    const session = rows[0];
    if (session.user_id !== userId) throw new Error('Accès refusé');

    const questions = await getQuestionsForProfile(session.profile_id);
    const { overall, axisScores, recommendations, suggestedModules } = calculateScores(questions, session.answers);

    const scores = {
        overall,
        axisScores,
        recommendations,
        suggestedModules,
        levelLabel: getLevelLabel(overall),
        levelEmoji: getLevelEmoji(overall),
        levelColor: getLevelColor(overall)
    };

    const { rows: auditRows } = await pool.query(
        `INSERT INTO audits (user_id, company_id, profile_id, answers, scores)
         VALUES ($1, $2, $3, $4::jsonb, $5::jsonb) RETURNING *`,
        [userId, companyId, session.profile_id, JSON.stringify(session.answers), JSON.stringify(scores)]
    );

    await pool.query(`UPDATE audit_sessions SET status = 'completed' WHERE id = $1`, [sessionId]);

    return { auditId: auditRows[0].id, scores, profile: PROFILES[session.profile_id] };
}

// ── Score calculation ─────────────────────────────────────────────────

function calculateScores(questions, answers) {
    const axisData = {};

    for (const q of questions) {
        const answer = answers[q.id];
        if (answer === undefined || answer === null) continue;

        const options = Array.isArray(q.options)
            ? q.options
            : (typeof q.options === 'string' ? JSON.parse(q.options) : []);

        // All questions have 4 options → score index/3 * 100
        let questionScore = 0;
        const idx = options.indexOf(answer);
        if (idx >= 0 && options.length > 1) {
            questionScore = (idx / (options.length - 1)) * 100;
        }

        const axis = q.dimension || 'utilisation';
        if (!axisData[axis]) axisData[axis] = { total: 0, weight: 0 };
        axisData[axis].total += questionScore * (q.weight || 1);
        axisData[axis].weight += (q.weight || 1);
    }

    // Build per-axis scores with metadata
    const axisScores = {};
    let totalScore = 0;
    let totalCount = 0;

    for (const [axis, meta] of Object.entries(AXES)) {
        const data = axisData[axis];
        const score = data && data.weight > 0 ? Math.round(data.total / data.weight) : null;
        axisScores[axis] = {
            score,
            label: meta.label,
            icon: meta.icon,
            color: meta.color,
            hasData: score !== null
        };
        if (score !== null) {
            totalScore += score;
            totalCount++;
        }
    }

    const overall = totalCount > 0 ? Math.round(totalScore / totalCount) : 0;

    // Suggest modules for axes below 50%
    const suggestedModules = [];
    for (const [axis, data] of Object.entries(axisScores)) {
        if (data.hasData && data.score < 50) {
            suggestedModules.push({
                axis,
                axisLabel: data.label,
                axisIcon: data.icon,
                score: data.score,
                module: MODULES[axis]
            });
        }
    }
    suggestedModules.sort((a, b) => a.score - b.score);

    const recommendations = generateRecommendations(overall, axisScores);

    return { overall, axisScores, recommendations, suggestedModules };
}

function generateRecommendations(overall, axisScores) {
    const recs = [];
    if (overall <= 25) {
        recs.push("Commencez par intégrer un outil IA dans une tâche quotidienne pendant 1 semaine");
        recs.push("Suivez le module de découverte des outils IA (2h) pour acquérir les bases");
    } else if (overall <= 50) {
        recs.push("Structurez davantage vos prompts en ajoutant rôle, contexte et format attendu");
        recs.push("Identifiez 2 tâches récurrentes à automatiser avec l'IA ce mois-ci");
    } else if (overall <= 75) {
        recs.push("Explorez les techniques de prompting avancées (chain-of-thought, few-shot)");
        recs.push("Partagez vos bonnes pratiques en organisant une session démo avec votre équipe");
    } else {
        recs.push("Devenez référent IA : formalisez vos pratiques en guide interne");
        recs.push("Explorez les architectures avancées (RAG, agents, pipelines LLM)");
    }
    return recs;
}

function getLevelLabel(score) {
    if (score <= 25) return 'Découverte';
    if (score <= 50) return 'Exploration';
    if (score <= 75) return 'Adoption';
    return 'Maîtrise';
}

function getLevelEmoji(score) {
    if (score <= 25) return '🔴';
    if (score <= 50) return '🟠';
    if (score <= 75) return '🟡';
    return '🟢';
}

function getLevelColor(score) {
    if (score <= 25) return '#ef4444';
    if (score <= 50) return '#f97316';
    if (score <= 75) return '#eab308';
    return '#22c55e';
}

function formatQuestion(q, index, total) {
    const options = Array.isArray(q.options)
        ? q.options
        : (typeof q.options === 'string' ? JSON.parse(q.options) : []);
    return {
        id: q.id,
        text: q.text,
        type: 'single', // always single choice (4 options)
        options,
        dimension: q.dimension,
        section: q.section,
        index,
        total,
        progress: Math.round((index / total) * 100)
    };
}

async function getSession(sessionId) {
    const { rows } = await pool.query('SELECT * FROM audit_sessions WHERE id = $1', [sessionId]);
    if (!rows[0]) return null;
    const session = rows[0];
    const questions = await getQuestionsForProfile(session.profile_id);
    const currentQ = questions[session.current_question_index];
    return {
        ...session,
        totalQuestions: questions.length,
        currentQuestion: currentQ ? formatQuestion(currentQ, session.current_question_index, questions.length) : null,
        progress: Math.round((session.current_question_index / questions.length) * 100)
    };
}

module.exports = { startSession, submitAnswer, completeSession, getSession, PROFILES, AXES, MODULES };
