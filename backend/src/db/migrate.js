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

// ── Questionnaire Débutants IA ────────────────────────────────────────
const DEBUTANT_QUESTIONS = [
    // Compétences de base
    {
        id: 'deb-1', profile_id: 'debutant-ia', section: 'competences',
        text: "À quelle fréquence utilisez-vous des outils IA (ChatGPT, Copilot, Gemini…) dans votre travail ?",
        type: 'single', dimension: 'utilisation', weight: 2, order_index: 1,
        options: ["Jamais", "Moins d'une fois par mois", "1 à 3 fois par semaine", "Tous les jours"]
    },
    {
        id: 'deb-2', profile_id: 'debutant-ia', section: 'competences',
        text: "Savez-vous expliquer ce qu'est un modèle de langage (LLM) ?",
        type: 'single', dimension: 'formation', weight: 1, order_index: 2,
        options: ["Non, je ne sais pas", "Vaguement — j'en ai entendu parler", "Oui, je peux en donner une définition simple", "Oui, je comprends son fonctionnement technique"]
    },
    {
        id: 'deb-3', profile_id: 'debutant-ia', section: 'competences',
        text: "Avez-vous suivi une formation sur l'IA générative (cours, tutoriel, atelier…) ?",
        type: 'single', dimension: 'formation', weight: 2, order_index: 3,
        options: ["Non, aucune", "J'ai regardé quelques vidéos", "Oui, une formation courte (< 4h)", "Oui, une formation structurée ou certifiante"]
    },
    {
        id: 'deb-4', profile_id: 'debutant-ia', section: 'competences',
        text: "Savez-vous ce qu'est un prompt ?",
        type: 'single', dimension: 'prompting', weight: 1, order_index: 4,
        options: ["Non", "J'ai entendu ce mot sans savoir ce que c'est", "Oui, c'est une instruction donnée à un outil IA", "Oui, et je sais comment le structurer efficacement"]
    },
    {
        id: 'deb-5', profile_id: 'debutant-ia', section: 'competences',
        text: "Avez-vous déjà utilisé l'IA pour produire du contenu dans votre travail (texte, email, résumé…) ?",
        type: 'single', dimension: 'utilisation', weight: 2, order_index: 5,
        options: ["Non, jamais", "J'ai essayé une ou deux fois", "Oui, régulièrement", "Oui, c'est intégré à ma routine de travail"]
    },
    // Posture
    {
        id: 'deb-6', profile_id: 'debutant-ia', section: 'posture',
        text: "Quelle est votre attitude face à l'IA générative dans votre métier ?",
        type: 'single', dimension: 'formation', weight: 2, order_index: 6,
        options: ["Je résiste — je préfère travailler sans IA", "Je suis curieux(se) mais hésitant(e)", "J'essaie activement de l'intégrer", "Je suis convaincu(e) et je la recommande autour de moi"]
    },
    {
        id: 'deb-7', profile_id: 'debutant-ia', section: 'posture',
        text: "Avez-vous partagé vos expériences avec l'IA avec vos collègues ?",
        type: 'single', dimension: 'gouvernance', weight: 1, order_index: 7,
        options: ["Non, jamais", "De manière informelle", "Oui, lors de réunions ou échanges d'équipe", "Oui, j'anime des sessions de partage régulières"]
    },
    {
        id: 'deb-8', profile_id: 'debutant-ia', section: 'posture',
        text: "Comment réagissez-vous quand un outil IA produit une réponse incorrecte ou inexacte ?",
        type: 'single', dimension: 'ethique', weight: 2, order_index: 8,
        options: ["Je fais confiance à la réponse", "Je l'utilise avec quelques doutes", "Je vérifie systématiquement les informations importantes", "Je sais identifier les hallucinations et je les signale"]
    },
    // Éthique
    {
        id: 'deb-9', profile_id: 'debutant-ia', section: 'ethique',
        text: "Êtes-vous sensibilisé(e) aux risques liés à la confidentialité des données lors de l'utilisation de l'IA ?",
        type: 'single', dimension: 'ethique', weight: 2, order_index: 9,
        options: ["Non, pas du tout", "Vaguement", "Oui, je fais attention aux données que je partage", "Oui, j'applique des règles strictes et je sensibilise mes collègues"]
    },
    {
        id: 'deb-10', profile_id: 'debutant-ia', section: 'ethique',
        text: "Savez-vous ce qu'est un biais algorithmique ?",
        type: 'single', dimension: 'ethique', weight: 1, order_index: 10,
        options: ["Non", "J'en ai entendu parler sans comprendre", "Oui, je peux l'expliquer", "Oui, et je sais comment les détecter et les limiter"]
    },
    {
        id: 'deb-11', profile_id: 'debutant-ia', section: 'ethique',
        text: "Votre entreprise a-t-elle une politique sur l'usage éthique de l'IA ?",
        type: 'single', dimension: 'gouvernance', weight: 2, order_index: 11,
        options: ["Non, aucune", "En cours de définition", "Oui, des guidelines informelles", "Oui, une charte formelle avec accompagnement"]
    },
    // Usages
    {
        id: 'deb-12', profile_id: 'debutant-ia', section: 'usages',
        text: "Utilisez-vous l'IA pour synthétiser ou résumer des documents ?",
        type: 'single', dimension: 'automatisation', weight: 2, order_index: 12,
        options: ["Non, jamais", "Rarement", "Souvent", "Systématiquement"]
    },
    {
        id: 'deb-13', profile_id: 'debutant-ia', section: 'usages',
        text: "Utilisez-vous l'IA pour rédiger ou améliorer des emails et rapports ?",
        type: 'single', dimension: 'automatisation', weight: 2, order_index: 13,
        options: ["Non, jamais", "Rarement", "Souvent", "C'est ma méthode principale"]
    },
    {
        id: 'deb-14', profile_id: 'debutant-ia', section: 'usages',
        text: "L'IA vous a-t-elle permis de gagner du temps sur des tâches répétitives ?",
        type: 'single', dimension: 'impact', weight: 2, order_index: 14,
        options: ["Non, aucun gain", "Un peu (< 10%)", "Significativement (10-30%)", "Énormément (> 30%)"]
    },
    {
        id: 'deb-15', profile_id: 'debutant-ia', section: 'usages',
        text: "Utilisez-vous l'IA pour préparer des présentations ou supports visuels ?",
        type: 'single', dimension: 'utilisation', weight: 1, order_index: 15,
        options: ["Non, jamais", "Rarement", "Souvent", "Systématiquement"]
    },
    // Qualité & maturité des données
    {
        id: 'deb-16', profile_id: 'debutant-ia', section: 'donnees',
        text: "Comprenez-vous l'importance de la qualité des données fournies à l'IA ?",
        type: 'single', dimension: 'gouvernance', weight: 2, order_index: 16,
        options: ["Non, je n'y pense pas", "Vaguement", "Oui, je comprends que de mauvaises données donnent de mauvais résultats", "Oui, et j'applique des pratiques de nettoyage et validation"]
    },
    {
        id: 'deb-17', profile_id: 'debutant-ia', section: 'donnees',
        text: "Savez-vous identifier les données sensibles ou confidentielles à ne pas partager avec un outil IA ?",
        type: 'single', dimension: 'ethique', weight: 2, order_index: 17,
        options: ["Non", "Je fais confiance à mon intuition", "Oui, j'applique des règles de base", "Oui, je suis des procédures formelles de classification des données"]
    },
    {
        id: 'deb-18', profile_id: 'debutant-ia', section: 'donnees',
        text: "Avez-vous conscience que les résultats d'un outil IA dépendent de la qualité de votre prompt ?",
        type: 'single', dimension: 'prompting', weight: 2, order_index: 18,
        options: ["Non, je pensais que l'IA comprend toujours ce qu'on veut", "Un peu — je l'ai expérimenté", "Oui, et j'essaie de formuler des prompts clairs", "Oui, et j'itère systématiquement pour améliorer mes résultats"]
    }
];

const PROFILE_QUESTIONS = [
    // ── Développeur ───────────────────────────────────────────────────
    {
        id: 'dev-1', profile_id: 'developpeur', section: 'competences',
        text: "Utilisez-vous un assistant de code IA (Copilot, Cursor, Codeium, Tabnine…) ?",
        type: 'single', dimension: 'utilisation', weight: 2, order_index: 1,
        options: ["Non, jamais", "Parfois pour l'autocomplétion basique", "Régulièrement pour générer des blocs de code", "Systématiquement, intégré à tout mon workflow"]
    },
    {
        id: 'dev-2', profile_id: 'developpeur', section: 'competences',
        text: "Quelle part de votre code est assistée ou générée par l'IA ?",
        type: 'single', dimension: 'automatisation', weight: 2, order_index: 2,
        options: ["Aucune", "Moins de 20%", "Entre 20% et 50%", "Plus de 50%"]
    },
    {
        id: 'dev-3', profile_id: 'developpeur', section: 'competences',
        text: "Utilisez-vous l'IA pour le debugging, la revue de code ou la détection de vulnérabilités ?",
        type: 'single', dimension: 'automatisation', weight: 2, order_index: 3,
        options: ["Non, jamais", "Parfois pour comprendre des erreurs", "Régulièrement pour debug et review", "Systématiquement — c'est dans mon process de qualité"]
    },
    {
        id: 'dev-4', profile_id: 'developpeur', section: 'prompting',
        text: "Comment rédigez-vous vos prompts techniques ?",
        type: 'single', dimension: 'prompting', weight: 2, order_index: 4,
        options: ["Je décris vaguement ce que je veux", "Je donne le contexte et le langage", "Je fournis du code existant + contraintes claires", "J'utilise des techniques avancées (few-shot, system prompt, chain-of-thought)"]
    },
    {
        id: 'dev-5', profile_id: 'developpeur', section: 'usages',
        text: "Utilisez-vous l'IA pour rédiger de la documentation ou des tests unitaires ?",
        type: 'single', dimension: 'impact', weight: 2, order_index: 5,
        options: ["Non, jamais", "Rarement", "Souvent", "Systématiquement"]
    },
    {
        id: 'dev-6', profile_id: 'developpeur', section: 'usages',
        text: "Avez-vous intégré des APIs d'IA dans vos projets (OpenAI, Azure OpenAI, Mistral…) ?",
        type: 'single', dimension: 'automatisation', weight: 2, order_index: 6,
        options: ["Non, jamais", "J'ai exploré la documentation", "Oui, en prototypage", "Oui, en production"]
    },
    {
        id: 'dev-7', profile_id: 'developpeur', section: 'usages',
        text: "Utilisez-vous l'IA dans votre pipeline CI/CD (génération de scripts, tests automatisés, analyse de logs) ?",
        type: 'single', dimension: 'automatisation', weight: 2, order_index: 7,
        options: ["Non", "J'explore les possibilités", "Oui, sur quelques étapes", "Oui, l'IA est intégrée dans tout mon pipeline"]
    },
    {
        id: 'dev-8', profile_id: 'developpeur', section: 'ethique',
        text: "Prenez-vous en compte les risques de sécurité liés au code généré par l'IA ?",
        type: 'single', dimension: 'ethique', weight: 2, order_index: 8,
        options: ["Non, je fais confiance au code généré", "Rarement — je relis vite", "Oui, je passe en revue les parties sensibles", "Oui, j'ai des tests de sécurité automatisés dédiés"]
    },
    {
        id: 'dev-9', profile_id: 'developpeur', section: 'impact',
        text: "L'IA a-t-elle amélioré la vitesse ou la qualité de vos livraisons ?",
        type: 'single', dimension: 'impact', weight: 2, order_index: 9,
        options: ["Non, aucun impact mesurable", "Légère amélioration", "Gain significatif (> 20%)", "Transformation de ma productivité (> 40%)"]
    },
    {
        id: 'dev-10', profile_id: 'developpeur', section: 'gouvernance',
        text: "Votre équipe a-t-elle des règles sur l'usage de l'IA dans le code (propriété intellectuelle, licences, secrets) ?",
        type: 'single', dimension: 'gouvernance', weight: 2, order_index: 10,
        options: ["Non, aucune règle", "On en discute informellement", "Oui, des guidelines d'équipe", "Oui, une politique formelle avec revues de conformité"]
    },

    // ── Business Analyst ─────────────────────────────────────────────
    {
        id: 'ba-1', profile_id: 'business-analyst', section: 'competences',
        text: "Utilisez-vous l'IA pour rédiger ou reformuler des spécifications fonctionnelles ?",
        type: 'single', dimension: 'automatisation', weight: 2, order_index: 1,
        options: ["Non, jamais", "Rarement", "Souvent", "Systématiquement"]
    },
    {
        id: 'ba-2', profile_id: 'business-analyst', section: 'competences',
        text: "Comment l'IA vous aide-t-elle dans l'analyse de données métier ?",
        type: 'single', dimension: 'impact', weight: 2, order_index: 2,
        options: ["Je ne l'utilise pas pour ça", "Pour des analyses simples", "Pour créer des rapports et synthèses", "Pour identifier des insights complexes que je n'aurais pas vus"]
    },
    {
        id: 'ba-3', profile_id: 'business-analyst', section: 'prompting',
        text: "Comment formulez-vous vos demandes d'analyse à l'IA ?",
        type: 'single', dimension: 'prompting', weight: 2, order_index: 3,
        options: ["Des questions génériques", "Avec le contexte métier", "Avec contexte + données + format de sortie attendu", "Je maîtrise les prompts d'analyse structurée et itérative"]
    },
    {
        id: 'ba-4', profile_id: 'business-analyst', section: 'usages',
        text: "Utilisez-vous l'IA pour votre veille métier ou technologique ?",
        type: 'single', dimension: 'utilisation', weight: 1, order_index: 4,
        options: ["Non", "Rarement", "Régulièrement", "C'est mon principal outil de veille"]
    },
    {
        id: 'ba-5', profile_id: 'business-analyst', section: 'usages',
        text: "Avez-vous automatisé des tâches répétitives (reporting, consolidation de données) grâce à l'IA ?",
        type: 'single', dimension: 'automatisation', weight: 2, order_index: 5,
        options: ["Non, aucune", "J'y réfléchis", "Oui, 1 à 2 tâches", "Oui, j'ai transformé plusieurs processus"]
    },
    {
        id: 'ba-6', profile_id: 'business-analyst', section: 'impact',
        text: "L'IA vous aide-t-elle à identifier des exigences ou cas d'usage manquants ?",
        type: 'single', dimension: 'impact', weight: 2, order_index: 6,
        options: ["Non jamais", "Rarement", "Souvent", "C'est l'un de mes usages principaux"]
    },

    // ── Manager ───────────────────────────────────────────────────────
    {
        id: 'mg-1', profile_id: 'manager', section: 'gouvernance',
        text: "Comment encouragez-vous l'adoption de l'IA dans votre équipe ?",
        type: 'single', dimension: 'gouvernance', weight: 2, order_index: 1,
        options: ["Je ne le fais pas encore", "Je mentionne les outils informellement", "Je partage des ressources et bonnes pratiques", "J'ai un plan d'accompagnement structuré"]
    },
    {
        id: 'mg-2', profile_id: 'manager', section: 'gouvernance',
        text: "Avez-vous défini une stratégie IA pour votre équipe ?",
        type: 'single', dimension: 'gouvernance', weight: 2, order_index: 2,
        options: ["Non, pas encore", "C'est en réflexion", "Oui, une stratégie informelle", "Oui, avec feuille de route, KPIs et suivi"]
    },
    {
        id: 'mg-3', profile_id: 'manager', section: 'impact',
        text: "Mesurez-vous l'impact de l'IA sur la productivité de votre équipe ?",
        type: 'single', dimension: 'impact', weight: 2, order_index: 3,
        options: ["Non, pas du tout", "De façon informelle", "Oui, avec des métriques simples", "Oui, avec un tableau de bord dédié"]
    },
    {
        id: 'mg-4', profile_id: 'manager', section: 'impact',
        text: "Avez-vous identifié des cas d'usage IA à forte valeur pour votre département ?",
        type: 'single', dimension: 'impact', weight: 2, order_index: 4,
        options: ["Non", "Quelques idées", "Oui, avec des POC réalisés", "Oui, avec des projets en production"]
    },
    {
        id: 'mg-5', profile_id: 'manager', section: 'ethique',
        text: "Avez-vous mis en place des règles d'usage éthique de l'IA dans votre équipe ?",
        type: 'single', dimension: 'ethique', weight: 2, order_index: 5,
        options: ["Non, aucune règle", "En cours de réflexion", "Des guidelines basiques", "Une politique complète avec audit de conformité"]
    },
    {
        id: 'mg-6', profile_id: 'manager', section: 'gouvernance',
        text: "Quel budget consacrez-vous aux outils et formations IA ?",
        type: 'single', dimension: 'gouvernance', weight: 1, order_index: 6,
        options: ["Aucun budget", "Budget ponctuel selon les demandes", "Budget formation dédié", "Budget stratégique pluriannuel outils + formation"]
    },
    {
        id: 'mg-7', profile_id: 'manager', section: 'process',
        text: "Vos processus métier intègrent-ils des étapes exploitant l'IA ?",
        type: 'single', dimension: 'automatisation', weight: 2, order_index: 7,
        options: ["Non, nos processus sont inchangés", "Quelques initiatives isolées", "Oui, plusieurs processus ont été adaptés", "Oui, l'IA est intégrée dans notre cartographie des processus"]
    },
    {
        id: 'mg-8', profile_id: 'manager', section: 'process',
        text: "Mesurez-vous le niveau de maturité IA de votre équipe de façon régulière ?",
        type: 'single', dimension: 'gouvernance', weight: 2, order_index: 8,
        options: ["Non, jamais", "Informellement lors des entretiens", "Oui, via des questionnaires ou bilans", "Oui, avec un référentiel de compétences dédié"]
    },
    {
        id: 'mg-9', profile_id: 'manager', section: 'execution',
        text: "Avez-vous lancé des projets pilotes d'automatisation par IA dans votre département ?",
        type: 'single', dimension: 'automatisation', weight: 2, order_index: 9,
        options: ["Non", "C'est en cours de réflexion", "Oui, un pilote réalisé", "Oui, plusieurs pilotes dont certains en production"]
    },
    {
        id: 'mg-10', profile_id: 'manager', section: 'strategie',
        text: "L'IA figure-t-elle dans la vision ou le plan stratégique de votre organisation ?",
        type: 'single', dimension: 'impact', weight: 2, order_index: 10,
        options: ["Non, ce n'est pas encore une priorité", "Mentionnée mais sans plan d'action", "Oui, avec des objectifs clairs à court terme", "Oui, avec une roadmap pluriannuelle et des KPIs"]
    },

    // ── Fonctionnel ───────────────────────────────────────────────────
    {
        id: 'fn-1', profile_id: 'fonctionnel', section: 'competences',
        text: "Utilisez-vous l'IA pour modéliser ou optimiser des processus métier ?",
        type: 'single', dimension: 'automatisation', weight: 2, order_index: 1,
        options: ["Non, jamais", "Rarement", "Souvent", "Systématiquement"]
    },
    {
        id: 'fn-2', profile_id: 'fonctionnel', section: 'competences',
        text: "L'IA vous aide-t-elle à rédiger des documents fonctionnels (cahier des charges, user stories, processus…) ?",
        type: 'single', dimension: 'automatisation', weight: 2, order_index: 2,
        options: ["Non, jamais", "Rarement", "Souvent", "C'est ma méthode principale"]
    },
    {
        id: 'fn-3', profile_id: 'fonctionnel', section: 'usages',
        text: "Utilisez-vous l'IA pour générer ou valider des scénarios de test fonctionnels ?",
        type: 'single', dimension: 'impact', weight: 2, order_index: 3,
        options: ["Non, jamais", "Rarement", "Souvent", "Systématiquement"]
    },
    {
        id: 'fn-4', profile_id: 'fonctionnel', section: 'gouvernance',
        text: "Quel est le niveau d'adoption de l'IA dans votre équipe fonctionnelle ?",
        type: 'single', dimension: 'gouvernance', weight: 2, order_index: 4,
        options: ["Aucune adoption", "Quelques curieux isolés", "Adoption partielle (30-60%)", "Adoption complète et intégrée"]
    },
    {
        id: 'fn-5', profile_id: 'fonctionnel', section: 'prompting',
        text: "Comment formulez-vous vos demandes fonctionnelles à l'IA ?",
        type: 'single', dimension: 'prompting', weight: 2, order_index: 5,
        options: ["Des questions vagues", "Avec le contexte métier", "Avec contexte + rôle + format de sortie attendu", "Je maîtrise les prompts structurés pour l'analyse fonctionnelle"]
    },
    {
        id: 'fn-6', profile_id: 'fonctionnel', section: 'usages',
        text: "Utilisez-vous l'IA pour la traduction, reformulation ou synthèse de documents ?",
        type: 'single', dimension: 'utilisation', weight: 1, order_index: 6,
        options: ["Non, jamais", "Rarement", "Souvent", "Systématiquement"]
    },
    {
        id: 'fn-7', profile_id: 'fonctionnel', section: 'usages',
        text: "L'IA vous aide-t-elle dans la gestion de la conformité ou de la qualité des livrables ?",
        type: 'single', dimension: 'gouvernance', weight: 2, order_index: 7,
        options: ["Non, pas du tout", "De façon ponctuelle", "Oui, pour des vérifications régulières", "Oui, l'IA est intégrée dans notre process qualité"]
    },
    {
        id: 'fn-8', profile_id: 'fonctionnel', section: 'impact',
        text: "L'IA vous a-t-elle aidé à identifier des gains d'efficacité dans vos processus ?",
        type: 'single', dimension: 'impact', weight: 2, order_index: 8,
        options: ["Non", "De façon anecdotique", "Oui, avec des gains mesurables", "Oui, transformation significative de nos processus"]
    },

    // ── Expert IA ─────────────────────────────────────────────────────
    {
        id: 'ei-1', profile_id: 'expert-ia', section: 'competences',
        text: "Quel est votre niveau en prompt engineering avancé ?",
        type: 'single', dimension: 'prompting', weight: 2, order_index: 1,
        options: ["Je rédige des prompts simples", "J'utilise le contexte et les exemples", "Je maîtrise few-shot, chain-of-thought, system prompts", "J'optimise, benchmark et enseigne le prompt engineering"]
    },
    {
        id: 'ei-2', profile_id: 'expert-ia', section: 'competences',
        text: "Avez-vous de l'expérience avec le fine-tuning ou la RAG (Retrieval-Augmented Generation) ?",
        type: 'single', dimension: 'automatisation', weight: 2, order_index: 2,
        options: ["Non, aucune", "Connaissance théorique uniquement", "Expérimentation personnelle", "Mise en œuvre en production, j'accompagne d'autres équipes"]
    },
    {
        id: 'ei-3', profile_id: 'expert-ia', section: 'competences',
        text: "Avez-vous conçu des architectures intégrant des LLMs (agents, pipelines multi-étapes, RAG) ?",
        type: 'single', dimension: 'automatisation', weight: 2, order_index: 3,
        options: ["Non", "J'apprends sur le sujet", "Oui, des prototypes", "Oui, en production — y compris des systèmes multi-agents"]
    },
    {
        id: 'ei-4', profile_id: 'expert-ia', section: 'ethique',
        text: "Maîtrisez-vous les aspects éthiques et réglementaires de l'IA (AI Act, RGPD, biais, explicabilité) ?",
        type: 'single', dimension: 'ethique', weight: 2, order_index: 4,
        options: ["Connaissance basique", "Bonne compréhension générale", "Expertise opérationnelle", "Je contribue à la politique IA de l'organisation"]
    },
    {
        id: 'ei-5', profile_id: 'expert-ia', section: 'formation',
        text: "Comment suivez-vous les avancées en IA ?",
        type: 'single', dimension: 'formation', weight: 1, order_index: 5,
        options: ["Je lis les actualités grand public", "Je suis des newsletters et podcasts spécialisés", "Je lis des papiers de recherche et teste les nouveaux modèles", "Je publie, interviens en conférence ou contribue à la recherche"]
    },
    {
        id: 'ei-6', profile_id: 'expert-ia', section: 'impact',
        text: "Êtes-vous capable de benchmarker et comparer différents modèles d'IA pour un cas d'usage donné ?",
        type: 'single', dimension: 'impact', weight: 2, order_index: 6,
        options: ["Non", "Je lis les benchmarks existants", "Je réalise mes propres benchmarks", "Je définis les critères d'évaluation pour mon organisation"]
    },
    {
        id: 'ei-7', profile_id: 'expert-ia', section: 'gouvernance',
        text: "Mettez-vous en place des pratiques MLOps (versioning de modèles, monitoring, déploiement continu) ?",
        type: 'single', dimension: 'gouvernance', weight: 2, order_index: 7,
        options: ["Non, pas encore", "En cours de mise en place", "Oui, sur certains projets", "Oui, standardisé pour tous nos modèles en production"]
    },
    {
        id: 'ei-8', profile_id: 'expert-ia', section: 'impact',
        text: "Mesurez-vous le ROI ou l'impact business des modèles IA que vous déployez ?",
        type: 'single', dimension: 'impact', weight: 2, order_index: 8,
        options: ["Non, c'est difficile à mesurer", "De façon qualitative", "Oui, avec des métriques simples", "Oui, avec des KPIs business et techniques précis"]
    },
    {
        id: 'ei-9', profile_id: 'expert-ia', section: 'gouvernance',
        text: "Intervenez-vous dans la définition de la gouvernance IA de votre organisation (data quality, model cards, audit) ?",
        type: 'single', dimension: 'gouvernance', weight: 2, order_index: 9,
        options: ["Non", "Ponctuellement sur demande", "Oui, sur des projets spécifiques", "Oui, je co-pilote la gouvernance IA de l'organisation"]
    }
];

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('Running database migration...');
        const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
        await client.query(schema);
        console.log('Schema created.');

        // Ensure manager role is in the constraint (idempotent for existing DBs)
        await client.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`);
        await client.query(`ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'manager', 'user'))`);
        console.log('Role constraint updated.');

        const allQuestions = [...GENERAL_QUESTIONS, ...DEBUTANT_QUESTIONS, ...PROFILE_QUESTIONS];
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
