# Robust_Coderz-AI-Hackathon


## AI Setup

### aiService.ts
Contains all Gemini AI functions for FounderPilot:
- getDailyBriefing() — generates morning briefing for founders
- draftFollowUp() — writes follow-up emails for contacts
- getStackAlerts() — filters tech stack alerts relevant to the team
- chatWithAI() — answers founder questions from their own data
- getPreCallBriefing() — briefs founder before a meeting
- getDeadlineWarning() — alerts founder about urgent deadlines

### Environment Variables
Create a `.env` file in the root folder and add:
VITE_GEMINI_API_KEY=your_gemini_api_key_here

Get your API key from: aistudio.google.com/apikey
