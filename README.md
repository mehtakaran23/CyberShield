CyberShield AI
CyberShield AI is a real-time phishing and scam detection project with 3 parts:

extension/: Chrome extension that scans the active page and shows risk alerts.
backend/: Node.js API and Vertex AI that analyzes page content and stores scan results.
dashboard/: React dashboard that shows scan stats and recent detections.
The extension sends page URL/content to the backend (/analyze), and the dashboard reads live stats from backend endpoints like /stats and /health.

Project Structure
.
|- extension   # Chrome extension (Manifest v3)
|- backend     # Express API + AI analysis
|- dashboard   # React (Vite) analytics dashboard
|- render.yaml # Render deployment config
Prerequisites
Node.js 20+
Google Chrome (or Chromium browser with extension support)
AI-Powered Detection: Google Vertex AI & Gemini Flash
AlgoArchitects' phishing detection engine is powered by Google Vertex AI, using the Gemini 1.5 Flash model to perform real-time, intelligent analysis of web pages directly from the browser extension.

🔍 How the Scanning Works
When a user visits any webpage, the browser extension silently captures key page signals and sends them to the backend for AI analysis. Here's the full scan pipeline:

User visits a URL
       │
       ▼
Browser Extension (Content Script)
  ├── Captures: page URL, DOM structure hints,
  │             page title, form fields, external links,
  │             SSL status, domain age signals
       │
       ▼
Backend API (Node.js / Python)
  └── Constructs a structured prompt for Gemini
       │
       ▼
Vertex AI → Gemini 1.5 Flash Model
  └── Analyzes the site for phishing indicators
       │
       ▼
Returns: Phishing Score (0–100) + Reasoning
       │
       ▼
Firebase Firestore
  └── Stores result: URL, score, timestamp, flags
       │
       ▼
Dashboard (React / Web App)
  └── Displays all detected sites with scores
⚡ Why Gemini 1.5 Flash?
Gemini 1.5 Flash is Google's fastest, most cost-efficient multimodal model — ideal for a browser extension where low latency is critical. Unlike rule-based or ML classifiers that rely on static datasets, Gemini Flash uses contextual language understanding to reason about a page's intent.

Feature	Details
Model	gemini-1.5-flash via Vertex AI
Platform	Google Cloud Vertex AI (Generative AI Studio)
Input	Structured prompt with URL metadata + page content signals
Output	Phishing score (0–100) + risk flags + reasoning text
Latency	~300–700ms per scan (Flash optimized)
Auth	Google Cloud Service Account (IAM-controlled)
What Does Gemini Analyze?
The extension builds a structured prompt that includes the following page signals, which Gemini then reasons over holistically:

URL structure — suspicious TLDs, lookalike domains (e.g., paypa1.com), excessive subdomains, URL encoding tricks
Page title & meta tags — does the page claim to be a brand it can't be?
Form fields — presence of password/credit card/OTP input fields on untrusted domains
External link patterns — do outbound links redirect to unrelated or known-malicious domains?
SSL/TLS status — is the connection secure? Is the certificate self-signed or mismatched?
Domain reputation signals — newly registered domains, unusual country-code TLDs
Visual impersonation cues — page content imitating banks, Google, PayPal, government portals, etc.
Gemini synthesizes all these signals together — much like a human security analyst would — and returns a phishing risk score from 0 to 100:

Score Range	Risk Level	Action
0 – 20	✅ Safe	No alert shown
21 – 50	⚠️ Suspicious	Soft warning badge
51 – 79	🔶 High Risk	Warning popup triggered
80 – 100	🚨 Phishing	Blocked with full alert
🔥 Firebase: Storing Detected Sites
Every site scanned by the extension is logged to Google Firebase Firestore — a NoSQL, real-time cloud database. This allows the dashboard to aggregate and visualize all detections across users.

Firestore Document Structure
Each detected site is stored as a document under the detectedSites collection:

{
  "url": "https://paypa1-login.suspicious-domain.com",
  "phishingScore": 91,
  "riskLevel": "phishing",
  "scanTimestamp": "2026-04-22T10:34:00Z",
  "flags": [
    "lookalike_domain",
    "password_field_on_http",
    "brand_impersonation"
  ],
  "geminiFeedback": "This page impersonates PayPal's login page with a typosquatted domain and collects credentials over an insecure connection.",
  "userAgent": "Chrome/124 Extension v1.0",
  "reportedBy": "anonymous_user_id"
}
Why Firebase?
Real-time sync — Dashboard updates live as new sites are detected
Serverless & scalable — No infrastructure to manage; scales with usage
Firestore Security Rules — Write access is restricted to authenticated extension sessions; dashboard has read-only public access
Integration — Firebase SDK integrates natively with both the Chrome extension and the React dashboard
🖥️ Dashboard: Visualizing Phishing Data
The dashboard reads all documents from Firestore and renders them in a clean, sortable interface. Key views include:

Live feed of all recently detected phishing sites
Phishing Score heatmap — color-coded by risk level
Top flagged domains — most frequently reported URLs
Score distribution chart — breakdown of safe / suspicious / phishing across all scans
Gemini's reasoning — expandable per-site AI explanation for each detection
🔐 Security & Privacy
The extension does not send raw page HTML to the backend — only structured metadata signals, preserving user privacy
All Vertex AI API calls are authenticated via Google Cloud Service Account with minimal IAM permissions (Vertex AI User role only)
Firebase access is controlled via Firestore Security Rules — no unauthenticated writes are permitted
User identity is anonymized before storing in Firestore
Render Free Trial Note (Important)
This project may use Render free tier for backend hosting. Free services can go to sleep after inactivity.

First request can be slow (cold start).
If extension scan or health check looks stuck, wait around 30-90 seconds and try again.
Once awakened, next requests are usually fast.
So if the extension says backend is offline right away, please wait a bit and refresh the popup/scan once.

Run Locally (Recommended Order)
1) Load the Extension First
Open Chrome and go to chrome://extensions/.
Enable Developer mode.
Click Load unpacked.
Select the extension folder from this project.
Optional (if using local backend):

Open extension/config.js
Set:
var API_BASE_URL = 'http://localhost:8080';
If you keep the default Render URL, extension requests go to deployed backend.

2) Start Backend
cd backend
npm install
npm run dev
Backend runs on http://localhost:8080 by default.

Useful endpoints:

GET /health
POST /analyze
GET /stats
3) Start Dashboard
cd dashboard
npm install
npm run dev
Open the local Vite URL shown in terminal (usually http://localhost:5173).

If needed, set VITE_API_BASE_URL to your backend URL.

Quick Usage
Load extension in browser.
Open any website tab.
Click CyberShield extension icon.
Click Scan current tab.
Check risk level (LOW, MEDIUM, HIGH) and reason/patterns.
Open dashboard to monitor totals and recent scans.
🚀 Live Demo
Dashboard: Click here to open
⚙️ Backend API: View API
