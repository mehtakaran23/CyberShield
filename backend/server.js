import express from 'express';
import cors from 'cors';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

loadEnvFile(path.resolve(process.cwd(), '.env'));

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const PORT = Number(process.env.PORT || 8080);
const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID || '';
const FIREBASE_SERVICE_ACCOUNT =
  process.env.FIREBASE_SERVICE_ACCOUNT || './serviceAccount.json';
const VERTEX_SERVICE_ACCOUNT =
  process.env.VERTEX_SERVICE_ACCOUNT || process.env.GOOGLE_APPLICATION_CREDENTIALS || '';
const VERTEX_MODEL = process.env.VERTEX_MODEL || 'gemini-2.5-flash';
const GCP_LOCATION = process.env.GCP_LOCATION || 'global';
const VERTEX_MODEL_FALLBACKS = (process.env.VERTEX_MODEL_FALLBACKS || 'gemini-2.5-flash-lite')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const localScans = [];

let firestore = null;
let aiClient = null;
let storageMode = 'mock';
let analysisMode = 'local';

function loadEnvFile(envPath) {
  if (!existsSync(envPath)) {
    return;
  }

  const content = readFileSync(envPath, 'utf8');
  const lines = content.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');

    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

function getReadiness() {
  return {
    firebaseReady: Boolean(firestore),
    vertexReady: Boolean(aiClient),
    liveScanningReady: Boolean(firestore && aiClient),
  };
}

function getServiceAccountPath() {
  return path.isAbsolute(FIREBASE_SERVICE_ACCOUNT)
    ? FIREBASE_SERVICE_ACCOUNT
    : path.resolve(process.cwd(), FIREBASE_SERVICE_ACCOUNT);
}

function getVertexServiceAccountPath() {
  if (!VERTEX_SERVICE_ACCOUNT) {
    return '';
  }

  return path.isAbsolute(VERTEX_SERVICE_ACCOUNT)
    ? VERTEX_SERVICE_ACCOUNT
    : path.resolve(process.cwd(), VERTEX_SERVICE_ACCOUNT);
}

async function initFirestore() {
  const serviceAccountPath = getServiceAccountPath();

  if (!existsSync(serviceAccountPath)) {
    console.warn(`Firebase disabled: missing service account at ${serviceAccountPath}`);
    return;
  }

  try {
    const [{ initializeApp, cert }, { getFirestore }] = await Promise.all([
      import('firebase-admin/app'),
      import('firebase-admin/firestore'),
    ]);

    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
    initializeApp({ credential: cert(serviceAccount) });
    firestore = getFirestore();
    storageMode = 'firestore';
  } catch (error) {
    console.warn(`Firebase disabled: ${error.message}`);
  }
}

async function initVertex() {
  if (!GCP_PROJECT_ID) {
    console.warn('Vertex AI disabled: missing GCP_PROJECT_ID');
    return;
  }

  try {
    const vertexServiceAccountPath = getVertexServiceAccountPath();
    if (vertexServiceAccountPath) {
      if (!existsSync(vertexServiceAccountPath)) {
        console.warn(`Vertex AI disabled: missing service account at ${vertexServiceAccountPath}`);
        return;
      }

      process.env.GOOGLE_APPLICATION_CREDENTIALS = vertexServiceAccountPath;
    } else if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const firebasePath = getServiceAccountPath();
      if (existsSync(firebasePath)) {
        process.env.GOOGLE_APPLICATION_CREDENTIALS = firebasePath;
      }
    }

    aiClient = new GoogleGenAI({
      vertexai: true,
      project: GCP_PROJECT_ID,
      location: GCP_LOCATION,
      apiVersion: 'v1',
    });

    analysisMode = 'vertex';
  } catch (error) {
    console.warn(`Vertex AI disabled: ${error.message}`);
  }
}

function buildPrompt(url, content) {
  const safeUrl = (url || '').trim() || 'No URL provided';
  const safeContent = (content || '').trim();

  return `You are a cybersecurity expert specializing in Social Engineering and Phishing detection.
Analyze the given webpage text content and URL for phishing or scam patterns.
Look specifically for:
- FALSE URGENCY: "Your account will be deleted in 10 minutes"
- FEAR: Threats, warnings, account suspension
- AUTHORITY ABUSE: Fake bank, government, or tech support impersonation
- GREED: Lottery wins, fake prizes, too-good-to-be-true offers
- CREDENTIAL HARVESTING: Asking for OTP, password, card details on suspicious pages

Respond with ONLY valid JSON. No extra text, no markdown, no backticks.
Format:
{
  "riskLevel": "LOW" or "MEDIUM" or "HIGH",
  "score": <number 0-100>,
  "patterns": ["pattern1", "pattern2"],
  "reason": "One line explanation"
}

URL: ${safeUrl}

Page Text Content (first 2000 chars):
${safeContent.slice(0, 2000) || 'No page text provided.'}`;
}

function parseModelJson(rawText) {
  const cleanJson = rawText.replace(/```json|```/g, '').trim();
  return JSON.parse(cleanJson);
}

async function tryGenerateWithModel(modelName, url, content) {
  const response = await aiClient.models.generateContent({
    model: modelName,
    contents: buildPrompt(url, content),
  });

  if (!response.text) {
    throw new Error(`Model ${modelName} returned an empty response.`);
  }

  return parseModelJson(response.text);
}

function normalizeUrl(url = '') {
  return url.trim().toLowerCase();
}

function createFallbackAnalysis(url, content) {
  const normalizedUrl = normalizeUrl(url);
  const text = `${normalizedUrl}\n${content || ''}`.toLowerCase();
  const patterns = [];
  let score = 5;

  const checks = [
    {
      name: 'false urgency',
      regex: /urgent|immediately|within\s+\d+\s*(minutes?|hours?)|expires?\s+today|act now/,
      weight: 28,
    },
    {
      name: 'fear',
      regex: /suspend|disabled|locked|blocked|fraud alert|security alert|violation/,
      weight: 22,
    },
    {
      name: 'authority abuse',
      regex: /bank|government|microsoft support|apple support|tax department|customs/,
      weight: 18,
    },
    {
      name: 'greed',
      regex: /won|winner|lottery|prize|free gift|claim reward|bonus/,
      weight: 18,
    },
    {
      name: 'credential harvesting',
      regex: /otp|one[- ]time password|password|cvv|card number|login to continue|verify account/,
      weight: 28,
    },
  ];

  for (const check of checks) {
    if (check.regex.test(text)) {
      patterns.push(check.name);
      score += check.weight;
    }
  }

  if (/[0-9]{6,}/.test(text)) {
    score += 6;
  }

  if (
    normalizedUrl.includes('@') ||
    normalizedUrl.includes('login') ||
    normalizedUrl.includes('verify') ||
    normalizedUrl.includes('secure')
  ) {
    score += 10;
  }

  if (
    normalizedUrl.includes('.ru') ||
    normalizedUrl.includes('.tk') ||
    normalizedUrl.includes('.top') ||
    normalizedUrl.includes('.xyz')
  ) {
    score += 8;
  }

  score = Math.min(score, 99);

  let riskLevel = 'LOW';
  if (score >= 70) {
    riskLevel = 'HIGH';
  } else if (score >= 40) {
    riskLevel = 'MEDIUM';
  }

  const reason =
    patterns.length > 0
      ? `Detected ${patterns.join(', ')} indicators in the URL or page content.`
      : 'No major phishing patterns were detected in the supplied URL and content.';

  return { riskLevel, score, patterns, reason };
}

async function analyzeContent(url, content) {
  if (!aiClient) {
    return createFallbackAnalysis(url, content);
  }

  const candidateModels = [VERTEX_MODEL, ...VERTEX_MODEL_FALLBACKS];
  let lastError = null;

  for (const modelName of candidateModels) {
    try {
      return await tryGenerateWithModel(modelName, url, content);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('No Vertex model could complete the request.');
}

async function saveScan(scan) {
  if (firestore) {
    await firestore.collection('scans').add(scan);
    return;
  }

  localScans.unshift({
    id: `local-${Date.now()}`,
    ...scan,
    timestamp:
      scan.timestamp instanceof Date ? scan.timestamp.toISOString() : scan.timestamp,
  });
}

async function readScans() {
  if (firestore) {
    const snapshot = await firestore
      .collection('scans')
      .orderBy('timestamp', 'desc')
      .limit(100)
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      const timestamp = data.timestamp?.toDate?.()
        ? data.timestamp.toDate().toISOString()
        : data.timestamp;

      return { id: doc.id, ...data, timestamp };
    });
  }

  return localScans.slice(0, 100);
}

app.get('/', (req, res) => {
  res.json({
    status: 'CyberShield API is live',
    storageMode,
    analysisMode,
    ...getReadiness(),
  });
});

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    storageMode,
    analysisMode,
    ...getReadiness(),
    timestamp: new Date().toISOString(),
  });
});

app.get('/config-status', (req, res) => {
  res.json({
    storageMode,
    analysisMode,
    firebaseServiceAccountPath: getServiceAccountPath(),
    vertexServiceAccountPath: getVertexServiceAccountPath() || null,
    vertexModel: VERTEX_MODEL,
    vertexModelFallbacks: VERTEX_MODEL_FALLBACKS,
    gcpLocation: GCP_LOCATION,
    gcpProjectIdConfigured: Boolean(GCP_PROJECT_ID),
    ...getReadiness(),
  });
});

app.post('/analyze', async (req, res) => {
  const { url = '', content = '' } = req.body || {};
  const normalizedUrl = url.trim();
  const normalizedContent = content.trim();

  if (!normalizedUrl && !normalizedContent) {
    return res.status(400).json({ error: 'Either url or content is required' });
  }

  try {
    const analysis = await analyzeContent(normalizedUrl, normalizedContent);

    await saveScan({
      url: normalizedUrl || 'manual-text-input',
      riskLevel: analysis.riskLevel,
      score: analysis.score,
      patterns: analysis.patterns || [],
      reason: analysis.reason || '',
      timestamp: new Date().toISOString(),
    });

    return res.json(analysis);
  } catch (error) {
    console.error('Analysis error:', error.message);
    return res.status(500).json({ error: 'Analysis failed', details: error.message });
  }
});

app.get('/stats', async (req, res) => {
  try {
    const scans = await readScans();
    const stats = {
      total: scans.length,
      high: scans.filter((scan) => scan.riskLevel === 'HIGH').length,
      medium: scans.filter((scan) => scan.riskLevel === 'MEDIUM').length,
      low: scans.filter((scan) => scan.riskLevel === 'LOW').length,
      recentScans: scans.slice(0, 10),
    };

    return res.json(stats);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch stats', details: error.message });
  }
});

await Promise.all([initFirestore(), initVertex()]);

app.listen(PORT, () => {
  console.log(
    `CyberShield backend running on port ${PORT} (storage: ${storageMode}, analysis: ${analysisMode})`,
  );
});
