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

Early-stage founders like Paul and Sam spend **60% of their time on operational overhead** instead of building and selling:

- 📧 Leads go cold because follow-ups are forgotten
- 🔧 AI tool pricing changes overnight breaking unit economics  
- 🧠 Decisions made Tuesday evaporate by Friday
- ⏰ 2.1 hours lost daily to context switching across 6-8 tools

---

## ✨ What Orbit Does

Orbit is an **AI-native co-pilot** that handles the grunt work so founders can focus on what only they can do — build, sell, and talk to users.

### 🔑 Core Features

#### 1. 📋 AI Daily Briefing
Every session starts with a smart briefing card powered by Gemini AI:
- Overdue follow-ups ranked by urgency
- Upcoming deadlines and accelerator applications
- Stack alerts relevant to your tech
- One clear list of what to do today

#### 2. 📡 Smart Follow-up Manager
Never let a lead, investor, or customer go cold:
- Tracks days since last contact
- Color-coded urgency (🔴 overdue / 🟡 warning / 🟢 recent)
- AI drafts personalized follow-up messages instantly
- One click to copy and send

#### 3. 🛰️ AI Stack Monitor
Your personal technical intelligence layer:
- Monitors your specific tech stack 24/7
- Flags price changes, deprecations, new releases
- Filters noise — only shows what affects YOUR stack
- Gives one actionable recommendation per alert

#### 4. 💬 Ask Orbit (AI Chat)
Talk to your data in plain English:
- "What's overdue today?"
- "Draft a follow-up for Ahmed"
- "Any stack alerts this week?"
- Answers from YOUR data, not generic internet

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Database | Firebase Firestore |
| Authentication | Firebase Auth (Google + Email) |
| AI Engine | Google Gemini API |
| Deployment | Google Cloud Run |
| Region | asia-south1 (Mumbai) |
| Styling | Tailwind CSS |

---

## 🏗️ Project Structure

```
Orbit/
├── src/
│   ├── components/
│   │   ├── Dashboard.jsx       # Daily briefing
│   │   ├── FollowUps.jsx       # Contact manager
│   │   ├── StackMonitor.jsx    # Tech stack alerts
│   │   └── Chat.jsx            # AI chat interface
│   ├── firebase.js             # Firebase config
│   ├── aiService.js            # Gemini AI functions
│   └── App.jsx                 # Main app + routing
├── Dockerfile                  # Cloud Run deployment
├── .dockerignore
└── package.json
```

---

## ⚡ Run Locally

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/orbit-ai-hackathon.git
cd orbit-ai-hackathon

# Install dependencies
npm install

# Add your Firebase config in src/firebase.js

# Start development server
npm run dev
```

---

## 🌱 Seed Database

```bash
# Add demo data to Firestore
cd orbit-backend
node seedData.js
```

---

## 🚀 Deploy to Cloud Run

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
| Hamza Afzaal | Frontend & UI Design |
| Shawal Hussain | AI Logic & Gemini Prompts |
| Anass Khan | Backend, Firebase & Deployment |

---

## 🔧 Third Party Tools & APIs

- Google Gemini API — AI responses and briefings
- Firebase Firestore — Real-time database
- Firebase Authentication — User login
- Google Cloud Run — Container deployment
- Google Cloud Build — CI/CD pipeline
- Artifact Registry — Docker image storage
- Vite — Frontend build tool
- React — UI framework
- Tailwind CSS — Styling

---

## 📊 Hackathon Submission

**Problem addressed:** Operational and cognitive overhead for early-stage founding teams
**Problem faced:** Ideally the AI works just its slow netwoking overhead is the problem due to which it takes too much time too respond. But we learned a lot form this hackathon!!!

**AI component:** Google Gemini API powers all four core features — daily briefings, follow-up drafting, stack alert analysis, and natural language chat — making AI essential to every user interaction, not just a wrapper.

**Target user:** Early-stage startup founders (1-5 person teams) managing leads, investors, customers, and technical infrastructure simultaneously

---

*Built in 24 hours at Build with AI Hackathon 2026 🚀*
