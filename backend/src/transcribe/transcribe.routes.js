const express = require('express');
const multer = require('multer');
const https = require('https');
const { requireAuth } = require('../auth/auth.middleware');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

function callAzure(path, apiVersion, apiKey, endpoint, bodyBuf, contentType) {
    const url = new URL(`${endpoint}/openai${path}?api-version=${apiVersion}`);
    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: 'POST',
            headers: {
                'api-key': apiKey,
                'Content-Type': contentType,
                'Content-Length': bodyBuf.length
            }
        }, (res) => {
            let data = '';
            res.on('data', c => { data += c; });
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { reject(new Error('Réponse Azure invalide: ' + data.slice(0, 200))); }
            });
        });
        req.on('error', reject);
        req.write(bodyBuf);
        req.end();
    });
}

// POST /api/transcribe
// Essaie Whisper d'abord, sinon fallback gpt-4o-mini avec audio base64
router.post('/', requireAuth, upload.single('audio'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Fichier audio manquant' });

    const endpoint  = (process.env.AZURE_OPENAI_ENDPOINT || '').replace(/\/$/, '');
    const apiKey    = process.env.AZURE_OPENAI_API_KEY;
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview';
    const whisperDep = process.env.AZURE_WHISPER_DEPLOYMENT || 'whisper';
    const gptDep     = process.env.AZURE_OPENAI_DEPLOYMENT  || 'gpt-4o-mini';

    if (!endpoint || !apiKey) return res.status(503).json({ error: 'Azure OpenAI non configuré' });

    // ── Tentative 1 : Whisper ────────────────────────────────────────
    try {
        const boundary = `----Whisper${Date.now()}`;
        const mime = req.file.mimetype || 'audio/webm';
        const body = Buffer.concat([
            Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="audio.webm"\r\nContent-Type: ${mime}\r\n\r\n`),
            req.file.buffer,
            Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\nfr\r\n`),
            Buffer.from(`--${boundary}--\r\n`)
        ]);

        const json = await callAzure(
            `/deployments/${whisperDep}/audio/transcriptions`,
            apiVersion, apiKey, endpoint, body,
            `multipart/form-data; boundary=${boundary}`
        );

        if (json.text) return res.json({ text: json.text });
        if (json.error?.code === 'DeploymentNotFound' || json.error?.code === '404') {
            throw new Error('no_whisper');
        }
        if (json.error) return res.status(502).json({ error: json.error.message });
    } catch (err) {
        if (err.message !== 'no_whisper') {
            console.warn('[Transcribe] Whisper unavailable, falling back to gpt-4o-mini');
        }
    }

    // ── Tentative 2 : gpt-4o-mini avec audio base64 ──────────────────
    try {
        const audioB64 = req.file.buffer.toString('base64');
        const mime = req.file.mimetype || 'audio/webm';

        const payload = JSON.stringify({
            model: gptDep,
            messages: [{
                role: 'user',
                content: [
                    {
                        type: 'text',
                        text: 'Transcris exactement ce que dit cette personne en français. Retourne uniquement la transcription, sans commentaire.'
                    },
                    {
                        type: 'input_audio',
                        input_audio: { data: audioB64, format: mime.includes('ogg') ? 'ogg' : 'wav' }
                    }
                ]
            }],
            max_tokens: 500
        });

        const json = await callAzure(
            `/deployments/${gptDep}/chat/completions`,
            apiVersion, apiKey, endpoint,
            Buffer.from(payload), 'application/json'
        );

        if (json.choices?.[0]?.message?.content) {
            return res.json({ text: json.choices[0].message.content.trim() });
        }
        throw new Error(json.error?.message || 'Réponse vide');
    } catch (err) {
        console.error('[Transcribe] gpt-4o-mini fallback failed:', err.message);
    }

    // ── Aucune solution disponible ───────────────────────────────────
    res.status(503).json({
        error: 'Aucun modèle de transcription disponible. Déployez "whisper" dans votre resource Azure OpenAI.'
    });
});

module.exports = router;
