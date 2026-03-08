const https = require('https');
const url = require('url');

/**
 * Azure OpenAI endpoint format:
 * https://{AZURE_OPENAI_ENDPOINT}/openai/deployments/{AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version={AZURE_OPENAI_API_VERSION}
 */
function buildAzureUrl() {
    const endpoint = (process.env.AZURE_OPENAI_ENDPOINT || '').replace(/\/$/, '');
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o';
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-02-01';
    return `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
}

function buildPrompt(scores, profile, userName) {
    const dimensionsText = Object.entries(scores.dimensions)
        .map(([dim, score]) => `- ${dim}: ${score}%`)
        .join('\n');

    return `Tu es un expert en transformation digitale et en IA. Analyse les résultats suivants d'une évaluation de maturité IA et fournis une synthèse personnalisée et actionnable.

Profil évalué: ${profile.name} ${profile.icon || ''}
Participant: ${userName || 'Anonyme'}
Score global: ${scores.overall}% (${scores.levelLabel} ${scores.levelEmoji || ''})

Scores par dimension:
${dimensionsText}

Recommandations générées:
${scores.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Fournis une analyse personnalisée en 3-4 paragraphes en français qui :
1. Identifie les points forts du profil (dimensions au-dessus de 60%)
2. Pointe les axes d'amélioration prioritaires (dimensions en dessous de 40%)
3. Propose 2-3 actions concrètes adaptées au rôle "${profile.name}" pour progresser dans les 30 prochains jours
4. Conclut avec un message motivant et personnalisé

Réponds directement avec l'analyse (sans titre, sans markdown), en un texte fluide et professionnel.`;
}

function httpsPost(targetUrl, headers, body) {
    return new Promise((resolve, reject) => {
        const parsed = url.parse(targetUrl);
        const options = {
            hostname: parsed.hostname,
            path: parsed.path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
                ...headers
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => resolve({ status: res.statusCode, body: data }));
        });

        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

async function analyzeAudit(auditId, scores, profile, userName) {
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;

    if (!apiKey || !endpoint) {
        console.log('[AI] Azure OpenAI not configured (AZURE_OPENAI_API_KEY / AZURE_OPENAI_ENDPOINT missing) — skipping analysis');
        return null;
    }

    const prompt = buildPrompt(scores, profile, userName);
    const body = JSON.stringify({
        messages: [
            {
                role: 'system',
                content: 'Tu es un expert senior en transformation IA et développement des compétences. Tu rédiges des analyses claires, bienveillantes et actionnables en français.'
            },
            {
                role: 'user',
                content: prompt
            }
        ],
        max_tokens: 1024,
        temperature: 0.7
    });

    try {
        const targetUrl = buildAzureUrl();
        console.log(`[AI] Calling Azure OpenAI: ${process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o'} @ ${process.env.AZURE_OPENAI_ENDPOINT}`);

        const response = await httpsPost(targetUrl, { 'api-key': apiKey }, body);

        if (response.status !== 200) {
            console.error(`[AI] Azure OpenAI error ${response.status}:`, response.body.substring(0, 300));
            return null;
        }

        const json = JSON.parse(response.body);
        const text = json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;

        if (!text) {
            console.error('[AI] Unexpected response shape:', JSON.stringify(json).substring(0, 200));
            return null;
        }

        console.log(`[AI] Analysis generated (${text.length} chars)`);
        return text.trim();
    } catch (err) {
        console.error('[AI] Azure OpenAI request failed:', err.message);
        return null;
    }
}

module.exports = { analyzeAudit };
