const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');
const dataDir = path.join(__dirname, '..', 'data');

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// ── Profiles ───────────────────────────────────────────────────

const PROFILES = [
    {
        id: 'developpeur',
        name: 'Développeur',
        description: 'Évaluez votre niveau de maturité dans l\'utilisation de l\'IA pour le développement logiciel',
        icon: '💻',
        color: '#14b8a6',
        dimensions: ['Outils IA', 'Génération de code', 'Debugging', 'Bonnes pratiques']
    },
    {
        id: 'business-analyst',
        name: 'Business Analyst',
        description: 'Évaluez votre maîtrise de l\'IA pour l\'analyse métier et la rédaction de spécifications',
        icon: '📊',
        color: '#8b5cf6',
        dimensions: ['Analyse de données', 'Rédaction', 'Automatisation', 'Veille']
    },
    {
        id: 'manager',
        name: 'Manager',
        description: 'Évaluez la maturité de votre équipe et votre stratégie IA',
        icon: '👥',
        color: '#ec4899',
        dimensions: ['Stratégie', 'Accompagnement', 'Gouvernance', 'ROI']
    },
    {
        id: 'fonctionnel',
        name: 'Fonctionnel',
        description: 'Évaluez votre utilisation de l\'IA dans les processus métier et les spécifications fonctionnelles',
        icon: '⚙️',
        color: '#6366f1',
        dimensions: ['Processus', 'Documentation', 'Tests', 'Adoption']
    },
    {
        id: 'expert-ia',
        name: 'Expert IA',
        description: 'Évaluez votre expertise avancée en IA, prompt engineering et intégration',
        icon: '🤖',
        color: '#f59e0b',
        dimensions: ['Prompt Engineering', 'Fine-tuning', 'Architecture', 'Éthique']
    }
];

// ── Pre-filled Questions ───────────────────────────────────────

const GENERAL_QUESTIONS = [
    {
        id: 'gen-1',
        text: 'Utilisez-vous des outils d\'IA (ChatGPT, Claude, Gemini, Copilot…) dans votre travail quotidien ?',
        type: 'single',
        options: ['Jamais', 'Rarement (quelques fois par mois)', 'Régulièrement (plusieurs fois par semaine)', 'Quotidiennement', 'Plusieurs fois par jour'],
        section: 'general',
        dimension: 'Utilisation',
        weight: 2
    },
    {
        id: 'gen-2',
        text: 'Quels outils d\'IA connaissez-vous et/ou utilisez-vous ?',
        type: 'multiple',
        options: ['ChatGPT (OpenAI)', 'Claude (Anthropic)', 'Gemini (Google)', 'GitHub Copilot', 'Microsoft Copilot', 'Midjourney / DALL-E', 'Perplexity', 'Autres'],
        section: 'general',
        dimension: 'Connaissance',
        weight: 1
    },
    {
        id: 'gen-3',
        text: 'Comment évaluez-vous votre niveau de connaissance en IA générative ?',
        type: 'scale',
        options: [],
        section: 'general',
        dimension: 'Connaissance',
        weight: 2
    },
    {
        id: 'gen-4',
        text: 'Avez-vous suivi une formation ou un apprentissage sur l\'IA ?',
        type: 'single',
        options: ['Aucune formation', 'Auto-formation (vidéos, articles)', 'Formation interne entreprise', 'Formation certifiante', 'Formation universitaire ou spécialisée'],
        section: 'general',
        dimension: 'Formation',
        weight: 1
    },
    {
        id: 'gen-5',
        text: 'Votre entreprise a-t-elle défini une politique ou des guidelines sur l\'utilisation de l\'IA ?',
        type: 'single',
        options: ['Non, aucune politique', 'En cours de réflexion', 'Oui, des guidelines informelles', 'Oui, une politique formelle', 'Oui, avec formation et accompagnement'],
        section: 'general',
        dimension: 'Gouvernance',
        weight: 1
    },
    {
        id: 'gen-6',
        text: 'Êtes-vous sensibilisé(e) aux risques liés à l\'utilisation de l\'IA (confidentialité, biais, hallucinations) ?',
        type: 'single',
        options: ['Pas du tout', 'Un peu', 'Moyennement', 'Bien sensibilisé(e)', 'Très bien sensibilisé(e), je forme les autres'],
        section: 'general',
        dimension: 'Éthique',
        weight: 1
    },
    {
        id: 'gen-7',
        text: 'L\'IA vous a-t-elle permis de gagner du temps dans votre travail ?',
        type: 'single',
        options: ['Non, pas du tout', 'Un peu (moins de 10%)', 'Modérément (10-25%)', 'Significativement (25-50%)', 'Très significativement (plus de 50%)'],
        section: 'general',
        dimension: 'Impact',
        weight: 2
    },
    {
        id: 'gen-8',
        text: 'Partagez-vous vos pratiques et découvertes IA avec vos collègues ?',
        type: 'single',
        options: ['Jamais', 'Rarement', 'Parfois, de manière informelle', 'Régulièrement', 'Oui, j\'anime des sessions de partage'],
        section: 'general',
        dimension: 'Partage',
        weight: 1
    }
];

const PROFILE_QUESTIONS = {
    'developpeur': [
        {
            id: 'dev-1',
            text: 'Utilisez-vous un assistant de code IA (Copilot, Cursor, Codeium, Tabnine…) ?',
            type: 'single',
            options: ['Non, jamais', 'J\'ai essayé mais je n\'utilise pas régulièrement', 'Oui, pour de l\'autocomplétion basique', 'Oui, pour générer des blocs de code complets', 'Oui, c\'est intégré dans tout mon workflow'],
            dimension: 'Outils IA',
            weight: 2
        },
        {
            id: 'dev-2',
            text: 'Quel pourcentage de votre code est assisté ou généré par l\'IA ?',
            type: 'single',
            options: ['0% — Aucun', 'Moins de 10%', '10-30%', '30-60%', 'Plus de 60%'],
            dimension: 'Génération de code',
            weight: 2
        },
        {
            id: 'dev-3',
            text: 'Utilisez-vous l\'IA pour le debugging ou la revue de code ?',
            type: 'single',
            options: ['Jamais', 'Rarement', 'Parfois pour comprendre des erreurs', 'Régulièrement pour debug et review', 'Systématiquement, c\'est dans mon process'],
            dimension: 'Debugging',
            weight: 2
        },
        {
            id: 'dev-4',
            text: 'Utilisez-vous l\'IA pour rédiger de la documentation ou des tests unitaires ?',
            type: 'single',
            options: ['Jamais', 'Rarement', 'Parfois', 'Souvent', 'Systématiquement'],
            dimension: 'Bonnes pratiques',
            weight: 1
        },
        {
            id: 'dev-5',
            text: 'Évaluez votre capacité à rédiger des prompts techniques efficaces (prompt engineering)',
            type: 'scale',
            options: [],
            dimension: 'Outils IA',
            weight: 2
        },
        {
            id: 'dev-6',
            text: 'Intégrez-vous des APIs d\'IA (OpenAI, Claude API…) dans vos projets ?',
            type: 'single',
            options: ['Non, jamais', 'J\'ai exploré la documentation', 'J\'ai fait des prototypes', 'Oui, en production sur certains projets', 'Oui, c\'est une partie centrale de mon architecture'],
            dimension: 'Génération de code',
            weight: 2
        }
    ],
    'business-analyst': [
        {
            id: 'ba-1',
            text: 'Utilisez-vous l\'IA pour rédiger ou reformuler des spécifications fonctionnelles ?',
            type: 'single',
            options: ['Jamais', 'Rarement', 'Parfois', 'Souvent', 'Systématiquement'],
            dimension: 'Rédaction',
            weight: 2
        },
        {
            id: 'ba-2',
            text: 'Utilisez-vous l\'IA pour analyser des données ou créer des rapports ?',
            type: 'single',
            options: ['Jamais', 'Rarement', 'Parfois', 'Souvent', 'Systématiquement'],
            dimension: 'Analyse de données',
            weight: 2
        },
        {
            id: 'ba-3',
            text: 'L\'IA vous aide-t-elle à identifier des exigences ou des cas d\'usage manquants ?',
            type: 'single',
            options: ['Jamais', 'Rarement', 'Parfois', 'Souvent', 'Systématiquement'],
            dimension: 'Analyse de données',
            weight: 2
        },
        {
            id: 'ba-4',
            text: 'Utilisez-vous l\'IA pour la veille métier ou technologique ?',
            type: 'single',
            options: ['Jamais', 'Rarement', 'Parfois', 'Souvent', 'Systématiquement'],
            dimension: 'Veille',
            weight: 1
        },
        {
            id: 'ba-5',
            text: 'Avez-vous automatisé certaines tâches répétitives grâce à l\'IA ?',
            type: 'single',
            options: ['Non, aucune', 'J\'y réfléchis', 'Oui, 1-2 tâches', 'Oui, plusieurs tâches', 'Oui, j\'ai transformé mes processus'],
            dimension: 'Automatisation',
            weight: 2
        },
        {
            id: 'ba-6',
            text: 'Évaluez votre capacité à formuler des prompts adaptés à l\'analyse métier',
            type: 'scale',
            options: [],
            dimension: 'Rédaction',
            weight: 2
        }
    ],
    'manager': [
        {
            id: 'mg-1',
            text: 'Encouragez-vous activement l\'utilisation de l\'IA au sein de votre équipe ?',
            type: 'single',
            options: ['Non', 'Pas encore mais c\'est prévu', 'Oui, de manière informelle', 'Oui, avec des recommandations', 'Oui, avec un plan d\'accompagnement structuré'],
            dimension: 'Accompagnement',
            weight: 2
        },
        {
            id: 'mg-2',
            text: 'Avez-vous défini une stratégie ou une feuille de route IA pour votre équipe ?',
            type: 'single',
            options: ['Non, pas de stratégie', 'En réflexion', 'Oui, informelle', 'Oui, formalisée', 'Oui, avec KPIs et suivi régulier'],
            dimension: 'Stratégie',
            weight: 2
        },
        {
            id: 'mg-3',
            text: 'Avez-vous mis en place des règles de gouvernance pour l\'usage de l\'IA ?',
            type: 'single',
            options: ['Non', 'En cours de réflexion', 'Oui, des guidelines basiques', 'Oui, une politique complète', 'Oui, avec audit et conformité'],
            dimension: 'Gouvernance',
            weight: 2
        },
        {
            id: 'mg-4',
            text: 'Mesurez-vous l\'impact ou le ROI de l\'utilisation de l\'IA dans votre équipe ?',
            type: 'single',
            options: ['Non, pas du tout', 'Non, mais j\'aimerais', 'Oui, de manière informelle', 'Oui, avec des métriques', 'Oui, avec des tableaux de bord dédiés'],
            dimension: 'ROI',
            weight: 2
        },
        {
            id: 'mg-5',
            text: 'Avez-vous identifié des cas d\'usage IA à forte valeur pour votre département ?',
            type: 'single',
            options: ['Non', 'En exploration', 'Oui, quelques idées', 'Oui, avec des POC réalisés', 'Oui, avec des projets en production'],
            dimension: 'Stratégie',
            weight: 2
        },
        {
            id: 'mg-6',
            text: 'Quel budget consacrez-vous aux outils et formations IA pour votre équipe ?',
            type: 'single',
            options: ['Aucun budget', 'Budget ponctuel / cas par cas', 'Budget formation dédié', 'Budget outils + formation', 'Budget stratégique avec plan pluriannuel'],
            dimension: 'ROI',
            weight: 1
        }
    ],
    'fonctionnel': [
        {
            id: 'fn-1',
            text: 'Utilisez-vous l\'IA pour modéliser ou optimiser des processus métier ?',
            type: 'single',
            options: ['Jamais', 'Rarement', 'Parfois', 'Souvent', 'Systématiquement'],
            dimension: 'Processus',
            weight: 2
        },
        {
            id: 'fn-2',
            text: 'L\'IA vous aide-t-elle à rédiger des documents fonctionnels (cahier des charges, user stories…) ?',
            type: 'single',
            options: ['Jamais', 'Rarement', 'Parfois', 'Souvent', 'Systématiquement'],
            dimension: 'Documentation',
            weight: 2
        },
        {
            id: 'fn-3',
            text: 'Utilisez-vous l\'IA pour générer ou valider des scénarios de test ?',
            type: 'single',
            options: ['Jamais', 'Rarement', 'Parfois', 'Souvent', 'Systématiquement'],
            dimension: 'Tests',
            weight: 2
        },
        {
            id: 'fn-4',
            text: 'Quel est le niveau d\'adoption de l\'IA dans votre équipe fonctionnelle ?',
            type: 'single',
            options: ['Aucune adoption', 'Quelques curieux', 'Adoption partielle', 'Majorité de l\'équipe', 'Adoption complète et intégrée'],
            dimension: 'Adoption',
            weight: 2
        },
        {
            id: 'fn-5',
            text: 'Utilisez-vous l\'IA pour la traduction, la reformulation ou la synthèse de documents ?',
            type: 'single',
            options: ['Jamais', 'Rarement', 'Parfois', 'Souvent', 'Systématiquement'],
            dimension: 'Documentation',
            weight: 1
        },
        {
            id: 'fn-6',
            text: 'Évaluez votre capacité à exploiter l\'IA pour améliorer les processus fonctionnels',
            type: 'scale',
            options: [],
            dimension: 'Processus',
            weight: 2
        }
    ],
    'expert-ia': [
        {
            id: 'ei-1',
            text: 'Évaluez votre niveau en prompt engineering (techniques avancées : few-shot, chain-of-thought, system prompts…)',
            type: 'scale',
            options: [],
            dimension: 'Prompt Engineering',
            weight: 2
        },
        {
            id: 'ei-2',
            text: 'Avez-vous de l\'expérience avec le fine-tuning ou le RAG (Retrieval Augmented Generation) ?',
            type: 'single',
            options: ['Non, aucune', 'Connaissance théorique', 'Expérimentation personnelle', 'Mise en œuvre professionnelle', 'Expert, je forme et j\'accompagne'],
            dimension: 'Fine-tuning',
            weight: 2
        },
        {
            id: 'ei-3',
            text: 'Avez-vous conçu des architectures intégrant des LLMs (agents, pipelines, orchestration) ?',
            type: 'single',
            options: ['Non', 'En apprentissage', 'Oui, des prototypes', 'Oui, en production', 'Oui, des systèmes multi-agents complexes'],
            dimension: 'Architecture',
            weight: 2
        },
        {
            id: 'ei-4',
            text: 'Maîtrisez-vous les aspects éthiques et réglementaires de l\'IA (AI Act, RGPD, biais) ?',
            type: 'single',
            options: ['Pas du tout', 'Connaissance basique', 'Bonne compréhension', 'Expertise', 'Je contribue à la politique IA de l\'entreprise'],
            dimension: 'Éthique',
            weight: 2
        },
        {
            id: 'ei-5',
            text: 'Suivez-vous activement les avancées en IA (papers, conférences, nouveaux modèles) ?',
            type: 'single',
            options: ['Rarement', 'De temps en temps', 'Régulièrement', 'Activement', 'Je publie ou contribue à la recherche'],
            dimension: 'Prompt Engineering',
            weight: 1
        },
        {
            id: 'ei-6',
            text: 'Évaluez votre capacité à benchmarker et comparer différents modèles/fournisseurs d\'IA',
            type: 'scale',
            options: [],
            dimension: 'Architecture',
            weight: 2
        }
    ]
};

// ── Database Class ─────────────────────────────────────────────

class Database {
    constructor() {
        this.data = this._load();
    }

    _load() {
        if (fs.existsSync(DB_PATH)) {
            const raw = fs.readFileSync(DB_PATH, 'utf8');
            const data = JSON.parse(raw);
            // Ensure profiles are always up-to-date
            data.profiles = PROFILES;
            data.generalQuestions = GENERAL_QUESTIONS;
            data.profileQuestions = PROFILE_QUESTIONS;
            return data;
        }
        const initial = {
            profiles: PROFILES,
            generalQuestions: GENERAL_QUESTIONS,
            profileQuestions: PROFILE_QUESTIONS,
            audits: []
        };
        this._save(initial);
        return initial;
    }

    _save(data) {
        if (data) this.data = data;
        // Only persist audits (profiles/questions are hardcoded)
        const toSave = { audits: this.data.audits };
        fs.writeFileSync(DB_PATH, JSON.stringify(toSave, null, 2), 'utf8');
    }

    // ── Profiles ───────────────────────────────────────────────

    getProfiles() {
        return this.data.profiles;
    }

    getProfileById(id) {
        return this.data.profiles.find(p => p.id === id) || null;
    }

    // ── Questions ──────────────────────────────────────────────

    getQuestionsForProfile(profileId) {
        const general = this.data.generalQuestions.map(q => ({ ...q, section: 'general' }));
        const specific = (this.data.profileQuestions[profileId] || []).map(q => ({ ...q, section: 'specific' }));
        return { general, specific };
    }

    // ── Audits ─────────────────────────────────────────────────

    getAudits() {
        return this.data.audits
            .map(a => {
                const profile = this.getProfileById(a.profileId);
                return {
                    ...a,
                    profileName: profile ? profile.name : '',
                    profileIcon: profile ? profile.icon : '',
                    profileColor: profile ? profile.color : ''
                };
            })
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    getAuditById(id) {
        const audit = this.data.audits.find(a => a.id === id);
        if (!audit) return null;
        const profile = this.getProfileById(audit.profileId);
        return {
            ...audit,
            profileName: profile ? profile.name : '',
            profileIcon: profile ? profile.icon : '',
            profileColor: profile ? profile.color : '',
            profileDimensions: profile ? profile.dimensions : []
        };
    }

    createAudit({ profileId, respondentName, respondentEmail, answers }) {
        const profile = this.getProfileById(profileId);
        if (!profile) return null;

        const { general, specific } = this.getQuestionsForProfile(profileId);
        const allQuestions = [...general, ...specific];

        // Calculate scores
        const scores = this._calculateScores(allQuestions, answers, profile);

        const audit = {
            id: uuidv4(),
            profileId,
            respondentName: respondentName || 'Anonyme',
            respondentEmail: respondentEmail || '',
            answers,
            scores,
            created_at: new Date().toISOString()
        };

        this.data.audits.push(audit);
        this._save();

        return this.getAuditById(audit.id);
    }

    _calculateScores(questions, answers, profile) {
        let totalWeightedScore = 0;
        let totalWeight = 0;
        const dimensionScores = {};

        for (const q of questions) {
            const answer = answers[q.id];
            if (answer === undefined || answer === null) continue;

            let questionScore = 0;

            if (q.type === 'scale') {
                // Scale 1-10, normalize to 0-100
                questionScore = ((parseInt(answer) || 1) - 1) / 9 * 100;
            } else if (q.type === 'single') {
                // Index-based scoring: first option = 0%, last option = 100%
                const idx = q.options.indexOf(answer);
                if (idx >= 0 && q.options.length > 1) {
                    questionScore = (idx / (q.options.length - 1)) * 100;
                }
            } else if (q.type === 'multiple') {
                // More selections (from a knowledge list) = higher score
                const selected = Array.isArray(answer) ? answer : [];
                if (q.options.length > 0) {
                    questionScore = (selected.length / q.options.length) * 100;
                }
            } else if (q.type === 'boolean') {
                questionScore = answer === true || answer === 'oui' ? 100 : 0;
            }

            const weight = q.weight || 1;
            totalWeightedScore += questionScore * weight;
            totalWeight += weight;

            // Dimension tracking
            const dim = q.dimension || 'Général';
            if (!dimensionScores[dim]) {
                dimensionScores[dim] = { total: 0, weight: 0 };
            }
            dimensionScores[dim].total += questionScore * weight;
            dimensionScores[dim].weight += weight;
        }

        const overallScore = totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0;

        // Calculate per-dimension percentages
        const dimensions = {};
        for (const [dim, data] of Object.entries(dimensionScores)) {
            dimensions[dim] = data.weight > 0 ? Math.round(data.total / data.weight) : 0;
        }

        // Determine maturity level
        let level, levelLabel, levelColor, levelEmoji;
        if (overallScore <= 25) {
            level = 'discovery'; levelLabel = 'Découverte'; levelColor = '#ef4444'; levelEmoji = '🔴';
        } else if (overallScore <= 50) {
            level = 'exploration'; levelLabel = 'Exploration'; levelColor = '#f97316'; levelEmoji = '🟠';
        } else if (overallScore <= 75) {
            level = 'adoption'; levelLabel = 'Adoption'; levelColor = '#eab308'; levelEmoji = '🟡';
        } else {
            level = 'mastery'; levelLabel = 'Maîtrise'; levelColor = '#22c55e'; levelEmoji = '🟢';
        }

        // Generate recommendations
        const recommendations = this._generateRecommendations(overallScore, dimensions, profile);

        return {
            overall: overallScore,
            level,
            levelLabel,
            levelColor,
            levelEmoji,
            dimensions,
            recommendations
        };
    }

    _generateRecommendations(score, dimensions, profile) {
        const recs = [];

        if (score <= 25) {
            recs.push('Commencez par explorer les outils d\'IA les plus populaires (ChatGPT, Claude, Gemini)');
            recs.push('Suivez une formation d\'introduction à l\'IA générative');
            recs.push('Identifiez 2-3 tâches quotidiennes où l\'IA pourrait vous aider');
        } else if (score <= 50) {
            recs.push('Approfondissez votre maîtrise du prompt engineering');
            recs.push('Intégrez l\'IA dans votre workflow quotidien de manière régulière');
            recs.push('Partagez vos bonnes pratiques avec vos collègues');
        } else if (score <= 75) {
            recs.push('Explorez des techniques avancées (chain-of-thought, few-shot learning)');
            recs.push('Contribuez à la définition de la stratégie IA de votre entreprise');
            recs.push('Mesurez et documentez les gains de productivité obtenus');
        } else {
            recs.push('Devenez ambassadeur IA au sein de votre organisation');
            recs.push('Explorez les possibilités d\'automatisation avancée et d\'intégration API');
            recs.push('Contribuez à la veille et à l\'innovation IA dans votre domaine');
        }

        // Dimension-specific recommendations
        const weakDimensions = Object.entries(dimensions)
            .filter(([_, score]) => score < 40)
            .sort((a, b) => a[1] - b[1]);

        for (const [dim, dimScore] of weakDimensions.slice(0, 2)) {
            recs.push(`Concentrez vos efforts sur la dimension "${dim}" (score actuel : ${dimScore}%)`);
        }

        return recs;
    }

    deleteAudit(id) {
        const idx = this.data.audits.findIndex(a => a.id === id);
        if (idx === -1) return false;
        this.data.audits.splice(idx, 1);
        this._save();
        return true;
    }
}

module.exports = new Database();
