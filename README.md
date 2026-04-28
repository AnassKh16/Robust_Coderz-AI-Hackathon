# 🪐 Orbit — AI Co-Pilot for Startup Founders

> *Your mission control for everything that matters.*

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Online-brightgreen)](https://orbit-frontend-386700800834.asia-south1.run.app)
[![Built with Firebase](https://img.shields.io/badge/Built%20with-Firebase-orange)](https://firebase.google.com)
[![Powered by Gemini](https://img.shields.io/badge/Powered%20by-Gemini%20AI-blue)](https://ai.google.dev)
[![Deployed on Cloud Run](https://img.shields.io/badge/Deployed%20on-Cloud%20Run-4285F4)](https://cloud.google.com/run)

---

## 🚀 Live Demo

**[https://orbit-frontend-386700800834.asia-south1.run.app](https://orbit-frontend-386700800834.asia-south1.run.app)**

---

## 🌌 The Problem

Early-stage founders spend **60% of their time on operational overhead** instead of building and selling:

- 📧 Leads go cold because follow-ups are forgotten
- 🔧 AI tool pricing changes overnight breaking unit economics
- 🧠 Decisions made Tuesday evaporate by Friday
- ⏰ 2.1 hours lost daily to context switching across 6-8 tools

---

## ✨ What Orbit Does

Orbit is an **AI-native co-pilot** that handles the grunt work so founders focus on what only they can do — build, sell, and talk to users.

---

## 🤖 Google AI Stack — How We Use It

This is the core of our submission. Every feature in Orbit is powered by Google AI tools.

---

### 1. 🧠 Google Gemini API (gemini-2.0-flash)

Gemini is the AI brain behind all four features of Orbit.

#### Daily Briefing Generation
```
Model: gemini-2.0-flash
Input: Founder's contacts, deadlines, stack alerts from Firestore
Output: Prioritized 5-point morning briefing
Why Gemini: Fast inference, understands context across 
            multiple data types simultaneously
```

#### Follow-up Email Drafting
```
Model: gemini-2.0-flash
Input: Contact name, role, last conversation notes, days since contact
Output: Personalized follow-up email draft (under 5 lines)
Why Gemini: Natural language generation that matches 
            founder's tone and relationship context
```

#### Stack Alert Analysis
```
Model: gemini-2.0-flash
Input: Founder's tech stack + latest AI/tool news
Output: Filtered alerts relevant ONLY to their stack + action recommendation
Why Gemini: Reasoning capability to filter noise and 
            surface only what matters to this specific founder
```

#### AI Chat (Ask Orbit)
```
Model: gemini-2.0-flash
Input: Founder's question + their full data context
Output: Direct answer from their own data
Why Gemini: Grounded responses — answers from founder's 
            data, not generic internet knowledge
```

**Code Example — How We Call Gemini:**
```javascript
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `You are Orbit, an AI assistant for startup founders.
                 Here is the founder's data: ${JSON.stringify(founderData)}
                 Task: Generate a morning briefing with top 5 priorities.
                 Be direct and specific. No fluff.`
        }]
      }]
    })
  }
)
```

---

### 2. 🔥 Firebase (Google Product)

Firebase powers our entire backend infrastructure.

#### Firebase Firestore
```
Usage: Real-time NoSQL database
Stores:
  - contacts (40 investors, customers, leads)
  - stackAlerts (AI tool monitoring data)
  - decisions (deadlines and commitments)
  - users (founder profiles)

Why Firestore: Real-time sync means both founders 
               see updates instantly — no refresh needed
```

#### Firebase Authentication
```
Usage: User login and security
Methods enabled:
  - Google Sign-In (OAuth 2.0)
  - Email/Password

Why Firebase Auth: Seamless Google login fits 
                   the Google AI ecosystem perfectly
```

---

### 3. ☁️ Google Cloud Run

```
Usage: Container deployment for frontend
Region: asia-south1 (Mumbai — closest to Pakistan)
Config: --allow-unauthenticated (public demo access)
Port: 8080

Live URL: https://orbit-frontend-386700800834.asia-south1.run.app

Why Cloud Run: Serverless, scales to zero when not in use,
               perfect for hackathon — costs nearly $0
```

---

### 4. 🏗️ Google Cloud Build + Artifact Registry

```
Usage: Automated Docker build pipeline
Flow:
  1. gcloud run deploy triggered
  2. Cloud Build picks up source code
  3. Builds Docker container automatically
  4. Stores image in Artifact Registry
  5. Deploys to Cloud Run
  6. Returns live URL

Why: Zero manual Docker management — 
     one command does everything
```

---

### 5. 🤖 Google AI Studio

```
Usage: Prompt engineering and testing
How we used it:
  - Tested all 4 Gemini prompts here first
  - Iterated on prompt quality before coding
  - Verified response format and length
  - Fine-tuned instructions for founder context

Why AI Studio: Fastest way to test prompts 
               before integrating into app
```

---

## 🗺️ Google AI Architecture

```
┌─────────────────────────────────────────────────┐
│                  ORBIT APP                       │
│                                                  │
│  React Frontend (Google Cloud Run)               │
│         │                                        │
│         ▼                                        │
│  ┌─────────────┐    ┌─────────────────────────┐  │
│  │  Firebase   │    │     Gemini AI API       │  │
│  │  Firestore  │───▶│   gemini-2.0-flash      │  │
│  │  (Database) │    │                         │  │
│  └─────────────┘    │  • Daily Briefing       │  │
│         │           │  • Follow-up Drafts     │  │
│  ┌─────────────┐    │  • Stack Analysis       │  │
│  │  Firebase   │    │  • Chat Responses       │  │
│  │    Auth     │    └─────────────────────────┘  │
│  │ (Google     │              │                   │
│  │  Login)     │              ▼                   │
│  └─────────────┘    ┌─────────────────────────┐  │
│                     │   Google AI Studio      │  │
│                     │   (Prompt Testing)      │  │
│                     └─────────────────────────┘  │
└─────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│           GOOGLE CLOUD INFRASTRUCTURE            │
│                                                  │
│  Cloud Build → Artifact Registry → Cloud Run     │
│                                                  │
│  Region: asia-south1 (Mumbai)                    │
└─────────────────────────────────────────────────┘
```

---

## 🔑 Features × Google AI Mapping

| Feature | Google AI Used |
|---|---|
| 📋 Daily Briefing | Gemini API + Firestore |
| 📡 Follow-up Manager | Gemini API + Firestore |
| 🛰️ Stack Monitor | Gemini API + Firestore |
| 💬 Ask Orbit Chat | Gemini API + Firestore |
| 🔐 Login | Firebase Auth (Google OAuth) |
| ☁️ Hosting | Cloud Run + Cloud Build |

---

## 🛠️ Full Tech Stack

| Layer | Technology |
|---|---|
| AI Model | Google Gemini 2.0 Flash |
| Prompt Testing | Google AI Studio |
| Database | Firebase Firestore |
| Authentication | Firebase Auth |
| Frontend | React + Vite |
| Deployment | Google Cloud Run |
| Build Pipeline | Google Cloud Build |
| Image Registry | Google Artifact Registry |
| Styling | Tailwind CSS |
| Region | asia-south1 (Mumbai) |

---

## ⚡ Run Locally

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/orbit-ai-hackathon.git
cd orbit-ai-hackathon

# Install dependencies
npm install

# Add your Firebase config in src/firebase.js
# Add your Gemini API key in src/aiService.js

# Start development server
npm run dev
```

---

## 🌱 Seed Database

```bash
cd orbit-backend
node seedData.js
# Adds 40 contacts, 8 stack alerts, 8 decisions automatically
```

---

## 🚀 Deploy

```bash
gcloud run deploy orbit-frontend \
  --source . \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated \
  --port 8080
```

---

## 👥 Team

Built at **Build with AI Hackathon 2026**
Organized by **GDG on Campus, FAST NUCES CFD**

| Role | Responsibility |
|---|---|
| Hamza Azaal | Frontend & UI Design (React + Tailwind) |
| Shawal Hussain | AI Logic & Gemini Prompt Engineering |
| Anass Khan | Firebase, Cloud Run & Deployment |

---

## 📦 Third Party Tools Disclosure

| Tool | Purpose |
|---|---|
| Google Gemini API | Core AI engine for all features |
| Google AI Studio | Prompt testing and iteration |
| Firebase Firestore | Real-time database |
| Firebase Auth | User authentication |
| Google Cloud Run | App deployment |
| Google Cloud Build | Automated build pipeline |
| Artifact Registry | Docker image storage |
| React | Frontend framework |
| Vite | Build tool |
| Tailwind CSS | Styling |

---

## 📊 Hackathon Submission

**Problem:** Operational and cognitive overhead for early-stage founding teams

**Who it's for:** Early-stage startup founders (1-5 person teams)

**How AI works:** Google Gemini API is essential to every feature — without it the app cannot generate briefings, draft emails, analyze stack changes, or answer chat questions. AI is not a wrapper here, it is the product.

**Cloud deployment:** ✅ Live on Google Cloud Run

**Problem faced:** Ideally the AI works just its slow netwoking overhead is the problem due to which it takes too much time too respond. But we learned a lot form this hackathon!!!

---

*Built in 24 hours at Build with AI Hackathon 2026 🚀*
*GDG on Campus, FAST NUCES CFD*
