import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// Config (tout vient du .env, aucun secret dans le code)
// ---------------------------------------------------------------------------
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'; // vérifie le nom exact dans la doc Gemini
const DEMO_MODE = process.env.DEMO_MODE === 'true';
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
// Anti-SSRF : seuls ces hôtes peuvent être téléchargés par le serveur
const ALLOWED_IMAGE_HOSTS = (process.env.ALLOWED_IMAGE_HOSTS || 'images.unsplash.com')
  .split(',')
  .map((h) => h.trim())
  .filter(Boolean);

class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

// Convertit une data-URL, une URL autorisée ou du base64 brut en { mimeType, data }
async function resolveImage(input: string, fallbackMime: string) {
  let mimeType = fallbackMime;
  let data: string;

  const dataUrl = input.match(/^data:([\w/+.-]+);base64,(.+)$/s);
  if (dataUrl) {
    mimeType = dataUrl[1];
    data = dataUrl[2];
  } else if (/^https?:\/\//i.test(input)) {
    let url: URL;
    try {
      url = new URL(input);
    } catch {
      throw new HttpError(400, 'IMAGE_INVALID', 'Invalid image URL');
    }
    if (url.protocol !== 'https:' || !ALLOWED_IMAGE_HOSTS.includes(url.hostname)) {
      throw new HttpError(400, 'IMAGE_HOST_NOT_ALLOWED', 'Image URL host is not allowed');
    }
    const r = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!r.ok) throw new HttpError(400, 'IMAGE_FETCH_FAILED', `Could not download image (${r.status})`);
    mimeType = (r.headers.get('content-type') || fallbackMime).split(';')[0].trim();
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > MAX_IMAGE_BYTES) throw new HttpError(413, 'IMAGE_TOO_LARGE', 'Image too large');
    data = buf.toString('base64');
  } else {
    data = input.replace(/\s/g, ''); // base64 brut
  }

  if (!ALLOWED_MIME.includes(mimeType)) {
    throw new HttpError(400, 'UNSUPPORTED_FORMAT', `Unsupported image type: ${mimeType}`);
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(data)) {
    throw new HttpError(400, 'IMAGE_INVALID', 'Image is not valid base64');
  }
  if (Buffer.byteLength(data, 'base64') > MAX_IMAGE_BYTES) {
    throw new HttpError(413, 'IMAGE_TOO_LARGE', 'Image too large');
  }
  return { mimeType, data };
}

// Diagnostic de démonstration : renvoyé UNIQUEMENT si DEMO_MODE=true
const DEMO_DIAGNOSIS = {
  commonName: 'Monstera Deliciosa',
  latinTaxonomy: 'Monstera deliciosa Liebm.',
  family: 'Araceae',
  condition: 'Septoria Leaf Spot (Septoria sp.) & Moisture Stress',
  severity: 'critical',
  confidence: 96.4,
  pathologyType: 'Fungal Pathogen',
  summary:
    'Concentric necrotic lesions with chlorotic halos localized along primary leaf veins, symptomatic of early-stage Septoria fungal infection compounded by root saturation.',
  symptoms: [
    'Circular dark brown to black lesions with distinct yellow chlorotic rings',
    'Slight tissue necrosis on distal leaf margins',
    'Localized loss of chlorophyll in interveinal zones',
  ],
  telemetry: {
    sunlight: { current: 1850, optimalMin: 2500, optimalMax: 4000, unit: 'Lux', status: 'low' },
    moisture: { current: 78, optimalMin: 45, optimalMax: 60, unit: '%', status: 'critical' },
    temperature: { current: 21.5, optimalMin: 20, optimalMax: 28, unit: '°C', status: 'optimal' },
  },
  treatmentProtocol: [
    {
      step: 1,
      title: 'Immediate Specimen Isolation',
      action: 'Quarantine specimen from adjacent foliage to halt fungal spore transmission.',
      timeframe: 'Immediate (0-2h)',
    },
    {
      step: 2,
      title: 'Surgical Debridement & Antifungal Wash',
      action: 'Excise lesions with sterilized shears (70% isopropyl). Apply organic copper fungicide or neem emulsion.',
      timeframe: 'Day 1',
    },
    {
      step: 3,
      title: 'Root Aeration & Moisture Modulation',
      action: 'Withhold irrigation until the root ball dries. Improve air circulation and indirect light.',
      timeframe: 'Days 2-14',
    },
  ],
  prevention: 'Never mist foliage in low-airflow conditions. Bottom-water to prevent standing moisture on leaves.',
};

const rangeSchema = {
  type: Type.OBJECT,
  properties: {
    current: { type: Type.NUMBER },
    optimalMin: { type: Type.NUMBER },
    optimalMax: { type: Type.NUMBER },
    unit: { type: Type.STRING },
    status: { type: Type.STRING },
  },
  required: ['current', 'optimalMin', 'optimalMax', 'unit', 'status'],
};

const DIAGNOSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    commonName: { type: Type.STRING },
    latinTaxonomy: { type: Type.STRING },
    family: { type: Type.STRING },
    condition: { type: Type.STRING },
    severity: { type: Type.STRING, enum: ['low', 'medium', 'critical'] },
    confidence: { type: Type.NUMBER },
    pathologyType: { type: Type.STRING },
    summary: { type: Type.STRING },
    symptoms: { type: Type.ARRAY, items: { type: Type.STRING } },
    telemetry: {
      type: Type.OBJECT,
      properties: { sunlight: rangeSchema, moisture: rangeSchema, temperature: rangeSchema },
      required: ['sunlight', 'moisture', 'temperature'],
    },
    treatmentProtocol: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          step: { type: Type.NUMBER },
          title: { type: Type.STRING },
          action: { type: Type.STRING },
          timeframe: { type: Type.STRING },
        },
        required: ['step', 'title', 'action', 'timeframe'],
      },
    },
    prevention: { type: Type.STRING },
  },
  required: [
    'commonName',
    'latinTaxonomy',
    'family',
    'condition',
    'severity',
    'confidence',
    'pathologyType',
    'summary',
    'symptoms',
    'telemetry',
    'treatmentProtocol',
    'prevention',
  ],
};

function sendError(res: express.Response, error: any, label: string) {
  const known = error instanceof HttpError;
  const status = known ? error.status : 502;
  const code = known ? error.code : 'UPSTREAM_ERROR';
  // On logge l'erreur réelle côté serveur, jamais l'image ni la clé
  console.error(`${label}:`, code, error?.message || error);
  return res.status(status).json({
    success: false,
    error: { code, message: known ? error.message : 'Request failed, please try again' },
  });
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '20mb' }));

  // Gemini : la clé vient UNIQUEMENT de l'environnement
  let ai: GoogleGenAI | null = null;
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });
  } else {
    console.warn('GEMINI_API_KEY is not set: /api/diagnose and /api/botanical-chat will return 503.');
  }

  // -------------------------------------------------------------------------
  // Diagnostic à partir d'une photo
  // -------------------------------------------------------------------------
  app.post('/api/diagnose', async (req, res) => {
    try {
      const { imageBase64, mimeType = 'image/jpeg', plantName, symptoms } = req.body ?? {};

      if (!ai) {
        if (DEMO_MODE) {
          return res.json({ success: true, source: 'demo', demo: true, diagnosis: DEMO_DIAGNOSIS });
        }
        throw new HttpError(503, 'LLM_NOT_CONFIGURED', 'GEMINI_API_KEY is not configured');
      }

      if (!imageBase64 || typeof imageBase64 !== 'string') {
        throw new HttpError(400, 'IMAGE_REQUIRED', 'imageBase64 is required');
      }
      const image = await resolveImage(imageBase64, mimeType);

      const prompt = `You are Botanical Precision's chief plant pathologist and botanist.
Analyze this plant specimen photo and symptoms.
Plant context: ${plantName ? `Reported plant: ${plantName}.` : ''}
Symptoms reported: ${symptoms || 'Visual inspection'}.

Rules:
- Base your diagnosis only on what is visible in the photo and the reported symptoms.
- If the image does not show a plant, or is too blurry, dark or distant, say so in "summary",
  use a low confidence (below 20) and do not invent a disease.
- If the plant looks healthy, use pathologyType "Optimal Vitality" and severity "low".
- "confidence" is a number from 0 to 100 reflecting your real certainty. Lower it when the
  symptoms are ambiguous.
- "telemetry" values cannot be measured from a photo: give ESTIMATES of the recommended
  care ranges for this species and the likely current state.

Provide the diagnosis in JSON format matching the schema:
- commonName, latinTaxonomy (binomial), family
- condition: specific pathology, pest, or nutrient imbalance name
- severity: one of ["low", "medium", "critical"]
- confidence: number between 0 and 100
- pathologyType: one of ["Fungal Pathogen", "Bacterial Infection", "Pest Infestation", "Physiological / Abiotic", "Nutritional Deficiency", "Optimal Vitality"]
- summary: clinical 2-sentence summary
- symptoms: array of 3 specific observable symptoms
- telemetry: sunlight (Lux), moisture (%), temperature (°C), each with current, optimalMin, optimalMax, unit, status
- treatmentProtocol: array of 3 ordered steps { step, title, action, timeframe }
- prevention: 1-2 practical preventative care guidelines.`;

      const response = await ai.models.generateContent({
        model: MODEL,
        contents: {
          parts: [{ inlineData: { mimeType: image.mimeType, data: image.data } }, { text: prompt }],
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: DIAGNOSIS_SCHEMA,
        },
      });

      if (!response.text) throw new HttpError(502, 'LLM_EMPTY_RESPONSE', 'Empty response from model');
      let diagnosis;
      try {
        diagnosis = JSON.parse(response.text);
      } catch {
        throw new HttpError(502, 'LLM_INVALID_RESPONSE', 'Model returned invalid JSON');
      }

      return res.json({ success: true, source: 'gemini_vision_engine', diagnosis });
    } catch (error: any) {
      return sendError(res, error, 'Diagnosis error');
    }
  });

  // -------------------------------------------------------------------------
  // Chat de consultation
  // -------------------------------------------------------------------------
  app.post('/api/botanical-chat', async (req, res) => {
    try {
      const { message, specimenContext } = req.body ?? {};

      if (!message || typeof message !== 'string' || message.length > 2000) {
        throw new HttpError(400, 'MESSAGE_INVALID', 'A message (max 2000 characters) is required');
      }
      if (!ai) {
        throw new HttpError(503, 'LLM_NOT_CONFIGURED', 'GEMINI_API_KEY is not configured');
      }

      const systemPrompt = `You are Dr. Silva, Senior Botanical Pathologist at Botanical Precision.
You converse with plant collectors, horticulturists, and greenhouse managers.
You provide precise, actionable, scientific yet warm advice for indoor and exotic plants.
Current specimen context: ${specimenContext ? JSON.stringify(specimenContext) : 'None provided'}.
Keep responses focused, under 150 words, citing botanical rationale and precise organic treatments.
If you are unsure, say so and recommend consulting a local expert.`;

      const response = await ai.models.generateContent({
        model: MODEL,
        contents: `${systemPrompt}\n\nUser Question: ${message}`,
      });

      if (!response.text) throw new HttpError(502, 'LLM_EMPTY_RESPONSE', 'Empty response from model');
      return res.json({ success: true, reply: response.text });
    } catch (error: any) {
      return sendError(res, error, 'Botanical chat error');
    }
  });

  // En dev : middleware Vite ; en production : fichiers statiques
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Botanical Precision server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});