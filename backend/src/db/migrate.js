require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('./pool');
const bcrypt = require('bcryptjs');

// ── 7 Axes communs à tous les profils ────────────────────────────────
// utilisation | prompting | ethique | formation | automatisation | gouvernance | impact

const GENERAL_QUESTIONS = [
    {
        id: 'gen-1', profile_id: null, section: 'general',
        text: "À quelle fréquence utilisez-vous des outils IA (ChatGPT, Copilot, Claude…) dans votre travail ?",
        type: 'single', dimension: 'utilisation', weight: 2, order_index: 1,
        options: ["Jamais ou très rarement", "Quelques fois par mois", "Plusieurs fois par semaine", "Tous les jours, c'est incontournable"]
    },
    {
        id: 'gen-2', profile_id: null, section: 'general',
        text: "Combien d'outils IA différents utilisez-vous régulièrement ?",
        type: 'single', dimension: 'utilisation', weight: 1, order_index: 2,
        options: ["Aucun", "1 seul outil", "2 à 3 outils", "4 outils ou plus"]
    },
    {
        id: 'gen-3', profile_id: null, section: 'general',
        text: "Comment avez-vous acquis vos connaissances sur l'IA ?",
        type: 'single', dimension: 'formation', weight: 2, order_index: 3,
        options: ["Je n'ai pas encore appris", "En explorant seul(e)", "Via des tutoriels et articles en ligne", "Via des formations structurées ou certifiantes"]
    },
    {
        id: 'gen-4', profile_id: null, section: 'general',
        text: "Quel est votre niveau en IA générative ?",
        type: 'single', dimension: 'formation', weight: 2, order_index: 4,
        options: ["Débutant — je découvre à peine", "Intermédiaire — j'utilise sans vraiment approfondir", "Avancé — je maîtrise les subtilités", "Expert — je forme et accompagne les autres"]
    },
    {
        id: 'gen-5', profile_id: null, section: 'general',
        text: "Votre entreprise a-t-elle une politique sur l'usage de l'IA ?",
        type: 'single', dimension: 'gouvernance', weight: 2, order_index: 5,
        options: ["Non, aucune règle établie", "On en parle mais rien de formalisé", "Oui, des guidelines informelles", "Oui, une politique claire avec accompagnement"]
    },
    {
        id: 'gen-6', profile_id: null, section: 'general',
        text: "Êtes-vous sensibilisé(e) aux risques liés à l'IA (confidentialité, biais, hallucinations) ?",
        type: 'single', dimension: 'ethique', weight: 2, order_index: 6,
        options: ["Pas du tout sensibilisé(e)", "Je connais les grands risques", "Je suis formé(e) et vigilant(e)", "Je sensibilise activement mes collègues"]
    },
    {
        id: 'gen-7', profile_id: null, section: 'general',
        text: "L'IA vous a-t-elle permis de gagner du temps de façon mesurable ?",
        type: 'single', dimension: 'impact', weight: 2, order_index: 7,
        options: ["Non, aucun gain perceptible", "Un peu (moins de 10%)", "Significativement (10 à 30%)", "Énormément (plus de 30%)"]
    },
    {
        id: 'gen-8', profile_id: null, section: 'general',
        text: "Comment formulez-vous vos demandes aux outils IA ?",
        type: 'single', dimension: 'prompting', weight: 2, order_index: 8,
        options: ["Je tape des questions simples", "Je donne quelques détails de contexte", "Je structure mes prompts avec rôle, contexte et contraintes", "Je maîtrise les techniques avancées (few-shot, chain-of-thought…)"]
    }
];

const PROFILE_QUESTIONS = [
    // ── Développeur ───────────────────────────────────────────────────
    {
        id: 'dev-1', profile_id: 'developpeur', section: 'specific',
        text: "Utilisez-vous un assistant de code IA (Copilot, Cursor, Codeium…) ?",
        type: 'single', dimension: 'utilisation', weight: 2, order_index: 1,
        options: ["Non, jamais", "Parfois pour l'autocomplétion basique", "Régulièrement pour générer des blocs de code", "Systématiquement, intégré à tout mon workflow"]
    },
    {
        id: 'dev-2', profile_id: 'developpeur', section: 'specific',
        text: "Quelle part de votre code est assistée ou générée par l'IA ?",
        type: 'single', dimension: 'automatisation', weight: 2, order_index: 2,
        options: ["Aucune", "Moins de 20%", "Entre 20% et 50%", "Plus de 50%"]
    },
    {
        id: 'dev-3', profile_id: 'developpeur', section: 'specific',
        text: "Utilisez-vous l'IA pour le debugging ou la revue de code ?",
        type: 'single', dimension: 'automatisation', weight: 2, order_index: 3,
        options: ["Non, jamais", "Parfois pour comprendre des erreurs", "Régulièrement pour debug et review", "Systématiquement, c'est dans mon process"]
    },
    {
        id: 'dev-4', profile_id: 'developpeur', section: 'specific',
        text: "Comment rédigez-vous vos prompts techniques ?",
        type: 'single', dimension: 'prompting', weight: 2, order_index: 4,
        options: ["Je décris vaguement ce que je veux", "Je donne le contexte et le langage", "Je fournis du code existant + contraintes claires", "J'utilise des techniques avancées (few-shot, system prompt, chain-of-thought)"]
    },
    {
        id: 'dev-5', profile_id: 'developpeur', section: 'specific',
        text: "Utilisez-vous l'IA pour rédiger de la documentation ou des tests unitaires ?",
        type: 'single', dimension: 'impact', weight: 1, order_index: 5,
        options: ["Non, jamais", "Rarement", "Souvent", "Systématiquement"]
    },
    {
        id: 'dev-6', profile_id: 'developpeur', section: 'specific',
        text: "Avez-vous intégré des APIs d'IA dans vos projets (OpenAI, Azure OpenAI…) ?",
        type: 'single', dimension: 'automatisation', weight: 2, order_index: 6,
        options: ["Non, jamais", "J'ai exploré la documentation", "Oui, en prototypage", "Oui, en production"]
    },

    // ── Business Analyst ─────────────────────────────────────────────
    {
        id: 'ba-1', profile_id: 'business-analyst', section: 'specific',
        text: "Utilisez-vous l'IA pour rédiger ou reformuler des spécifications fonctionnelles ?",
        type: 'single', dimension: 'automatisation', weight: 2, order_index: 1,
        options: ["Non, jamais", "Rarement", "Souvent", "Systématiquement"]
    },
    {
        id: 'ba-2', profile_id: 'business-analyst', section: 'specific',
        text: "Comment l'IA vous aide-t-elle dans l'analyse de données ?",
        type: 'single', dimension: 'impact', weight: 2, order_index: 2,
        options: ["Je ne l'utilise pas pour ça", "Pour des analyses simples", "Pour créer des rapports et synthèses", "Pour identifier des insights complexes que je n'aurais pas vus"]
    },
    {
        id: 'ba-3', profile_id: 'business-analyst', section: 'specific',
        text: "Comment formulez-vous vos demandes d'analyse à l'IA ?",
        type: 'single', dimension: 'prompting', weight: 2, order_index: 3,
        options: ["Des questions génériques", "Avec le contexte métier", "Avec contexte + données + format de sortie attendu", "Je maîtrise les prompts d'analyse structurée et itérative"]
    },
    {
        id: 'ba-4', profile_id: 'business-analyst', section: 'specific',
        text: "Utilisez-vous l'IA pour votre veille métier ou technologique ?",
        type: 'single', dimension: 'utilisation', weight: 1, order_index: 4,
        options: ["Non", "Rarement", "Régulièrement", "C'est mon principal outil de veille"]
    },
    {
        id: 'ba-5', profile_id: 'business-analyst', section: 'specific',
        text: "Avez-vous automatisé des tâches répétitives grâce à l'IA ?",
        type: 'single', dimension: 'automatisation', weight: 2, order_index: 5,
        options: ["Non, aucune", "J'y réfléchis", "Oui, 1 à 2 tâches", "Oui, j'ai transformé plusieurs processus"]
    },
    {
        id: 'ba-6', profile_id: 'business-analyst', section: 'specific',
        text: "L'IA vous aide-t-elle à identifier des exigences ou cas d'usage manquants ?",
        type: 'single', dimension: 'impact', weight: 2, order_index: 6,
        options: ["Non jamais", "Rarement", "Souvent", "C'est l'un de mes usages principaux"]
    },

    // ── Manager ───────────────────────────────────────────────────────
    {
        id: 'mg-1', profile_id: 'manager', section: 'specific',
        text: "Comment encouragez-vous l'adoption de l'IA dans votre équipe ?",
        type: 'single', dimension: 'gouvernance', weight: 2, order_index: 1,
        options: ["Je ne le fais pas encore", "Je mentionne les outils informellement", "Je partage des ressources et bonnes pratiques", "J'ai un plan d'accompagnement structuré"]
    },
    {
        id: 'mg-2', profile_id: 'manager', section: 'specific',
        text: "Avez-vous défini une stratégie IA pour votre équipe ?",
        type: 'single', dimension: 'gouvernance', weight: 2, order_index: 2,
        options: ["Non, pas encore", "C'est en réflexion", "Oui, une stratégie informelle", "Oui, avec feuille de route, KPIs et suivi"]
    },
    {
        id: 'mg-3', profile_id: 'manager', section: 'specific',
        text: "Mesurez-vous l'impact de l'IA sur la productivité de votre équipe ?",
        type: 'single', dimension: 'impact', weight: 2, order_index: 3,
        options: ["Non, pas du tout", "De façon informelle", "Oui, avec des métriques simples", "Oui, avec un tableau de bord dédié"]
    },
    {
        id: 'mg-4', profile_id: 'manager', section: 'specific',
        text: "Avez-vous identifié des cas d'usage IA à forte valeur pour votre département ?",
        type: 'single', dimension: 'impact', weight: 2, order_index: 4,
        options: ["Non", "Quelques idées", "Oui, avec des POC réalisés", "Oui, avec des projets en production"]
    },
    {
        id: 'mg-5', profile_id: 'manager', section: 'specific',
        text: "Avez-vous mis en place des règles d'usage de l'IA dans votre équipe ?",
        type: 'single', dimension: 'ethique', weight: 2, order_index: 5,
        options: ["Non, aucune règle", "En cours de réflexion", "Des guidelines basiques", "Une politique complète avec audit de conformité"]
    },
    {
        id: 'mg-6', profile_id: 'manager', section: 'specific',
        text: "Quel budget consacrez-vous aux outils et formations IA ?",
        type: 'single', dimension: 'gouvernance', weight: 1, order_index: 6,
        options: ["Aucun budget", "Budget ponctuel selon les demandes", "Budget formation dédié", "Budget stratégique pluriannuel outils + formation"]
    },

    // ── Fonctionnel ───────────────────────────────────────────────────
    {
        id: 'fn-1', profile_id: 'fonctionnel', section: 'specific',
        text: "Utilisez-vous l'IA pour modéliser ou optimiser des processus métier ?",
        type: 'single', dimension: 'automatisation', weight: 2, order_index: 1,
        options: ["Non, jamais", "Rarement", "Souvent", "Systématiquement"]
    },
    {
        id: 'fn-2', profile_id: 'fonctionnel', section: 'specific',
        text: "L'IA vous aide-t-elle à rédiger des documents fonctionnels (cahier des charges, user stories…) ?",
        type: 'single', dimension: 'automatisation', weight: 2, order_index: 2,
        options: ["Non, jamais", "Rarement", "Souvent", "C'est ma méthode principale"]
    },
    {
        id: 'fn-3', profile_id: 'fonctionnel', section: 'specific',
        text: "Utilisez-vous l'IA pour générer ou valider des scénarios de test ?",
        type: 'single', dimension: 'impact', weight: 2, order_index: 3,
        options: ["Non, jamais", "Rarement", "Souvent", "Systématiquement"]
    },
    {
        id: 'fn-4', profile_id: 'fonctionnel', section: 'specific',
        text: "Quel est le niveau d'adoption de l'IA dans votre équipe fonctionnelle ?",
        type: 'single', dimension: 'gouvernance', weight: 2, order_index: 4,
        options: ["Aucune adoption", "Quelques curieux isolés", "Adoption partielle (30-60%)", "Adoption complète et intégrée"]
    },
    {
        id: 'fn-5', profile_id: 'fonctionnel', section: 'specific',
        text: "Comment formulez-vous vos demandes fonctionnelles à l'IA ?",
        type: 'single', dimension: 'prompting', weight: 2, order_index: 5,
        options: ["Des questions vagues", "Avec le contexte métier", "Avec contexte + rôle + format de sortie attendu", "Je maîtrise les prompts structurés pour l'analyse fonctionnelle"]
    },
    {
        id: 'fn-6', profile_id: 'fonctionnel', section: 'specific',
        text: "Utilisez-vous l'IA pour la traduction, reformulation ou synthèse de documents ?",
        type: 'single', dimension: 'utilisation', weight: 1, order_index: 6,
        options: ["Non, jamais", "Rarement", "Souvent", "Systématiquement"]
    },

    // ── Expert IA ─────────────────────────────────────────────────────
    {
        id: 'ei-1', profile_id: 'expert-ia', section: 'specific',
        text: "Quel est votre niveau en prompt engineering avancé ?",
        type: 'single', dimension: 'prompting', weight: 2, order_index: 1,
        options: ["Je rédige des prompts simples", "J'utilise le contexte et les exemples", "Je maîtrise few-shot, chain-of-thought, system prompts", "J'optimise, benchmark et enseigne le prompt engineering"]
    },
    {
        id: 'ei-2', profile_id: 'expert-ia', section: 'specific',
        text: "Avez-vous de l'expérience avec le fine-tuning ou le RAG ?",
        type: 'single', dimension: 'automatisation', weight: 2, order_index: 2,
        options: ["Non, aucune", "Connaissance théorique uniquement", "Expérimentation personnelle", "Mise en œuvre en production, j'accompagne d'autres équipes"]
    },
    {
        id: 'ei-3', profile_id: 'expert-ia', section: 'specific',
        text: "Avez-vous conçu des architectures intégrant des LLMs (agents, pipelines, RAG) ?",
        type: 'single', dimension: 'automatisation', weight: 2, order_index: 3,
        options: ["Non", "J'apprends sur le sujet", "Oui, des prototypes", "Oui, en production — y compris des systèmes multi-agents"]
    },
    {
        id: 'ei-4', profile_id: 'expert-ia', section: 'specific',
        text: "Maîtrisez-vous les aspects éthiques et réglementaires de l'IA (AI Act, RGPD, biais) ?",
        type: 'single', dimension: 'ethique', weight: 2, order_index: 4,
        options: ["Connaissance basique", "Bonne compréhension générale", "Expertise opérationnelle", "Je contribue à la politique IA de l'organisation"]
    },
    {
        id: 'ei-5', profile_id: 'expert-ia', section: 'specific',
        text: "Comment suivez-vous les avancées en IA ?",
        type: 'single', dimension: 'formation', weight: 1, order_index: 5,
        options: ["Je lis les actualités grand public", "Je suis des newsletters et podcasts spécialisés", "Je lis des papiers de recherche et teste les nouveaux modèles", "Je publie, interviens en conférence ou contribue à la recherche"]
    },
    {
        id: 'ei-6', profile_id: 'expert-ia', section: 'specific',
        text: "Êtes-vous capable de benchmarker et comparer différents modèles d'IA ?",
        type: 'single', dimension: 'impact', weight: 2, order_index: 6,
        options: ["Non", "Je lis les benchmarks existants", "Je réalise mes propres benchmarks", "Je définis les critères d'évaluation pour mon organisation"]
    }
];

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('Running database migration...');
        const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
        await client.query(schema);
        console.log('Schema created.');

        const allQuestions = [...GENERAL_QUESTIONS, ...PROFILE_QUESTIONS];
        for (const q of allQuestions) {
            await client.query(
                `INSERT INTO questions (id, profile_id, text, type, options, dimension, weight, order_index, section)
                 VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9)
                 ON CONFLICT (id) DO UPDATE SET
                   text = EXCLUDED.text,
                   options = EXCLUDED.options,
                   dimension = EXCLUDED.dimension,
                   weight = EXCLUDED.weight,
                   order_index = EXCLUDED.order_index`,
                [q.id, q.profile_id, q.text, q.type, JSON.stringify(q.options), q.dimension, q.weight, q.order_index, q.section]
            );
        }
        console.log(`Seeded ${allQuestions.length} questions (7 axes).`);

        const { rows: companies } = await client.query('SELECT id FROM companies LIMIT 1');
        if (companies.length === 0) {
            const { rows } = await client.query(
                `INSERT INTO companies (name, email) VALUES ($1, $2) RETURNING id`,
                ['Demo Company', 'admin@demo.com']
            );
            const companyId = rows[0].id;
            const passwordHash = await bcrypt.hash('admin123', 10);
            await client.query(
                `INSERT INTO users (company_id, email, name, role, password_hash, status)
                 VALUES ($1, $2, $3, 'admin', $4, 'active')`,
                [companyId, 'admin@demo.com', 'Admin Demo', passwordHash]
            );
            console.log('Seeded demo admin: admin@demo.com / admin123');
        }

        console.log('Migration complete.');
    } catch (err) {
        console.error('Migration error:', err);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
