const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

async function callGemini(promptText: string): Promise<string> {
  const response = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: promptText }] }]
    })
  });
  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

// 1. Daily Briefing
export async function getDailyBriefing(userData: object): Promise<string> {
  const prompt = `You are FounderPilot. Given this founder data: ${JSON.stringify(userData)}, generate a 5 bullet morning briefing. Each bullet is one line, actionable, starts with an emoji. No intro or outro.`;
  return await callGemini(prompt);
}

// 2. Draft Follow-up Email
export async function draftFollowUp(contact: {name: string, role: string, notes: string, daysSince: number}): Promise<string> {
  const prompt = `You are FounderPilot. Write a follow-up email for: Name: ${contact.name}, Role: ${contact.role}, Last conversation: ${contact.notes}, Days since contact: ${contact.daysSince}. Max 5 lines, include subject line, no filler phrases, end with a soft call to action.`;
  return await callGemini(prompt);
}

// 3. Stack Monitor Alerts
export async function getStackAlerts(stack: string[], newsList: string[]): Promise<string> {
  const prompt = `You are a technical advisor. The startup uses: ${stack.join(", ")}. From this news: ${newsList.join(" | ")} only return alerts relevant to their stack. For each: alert title, why it matters, what to do. One line each.`;
  return await callGemini(prompt);
}

// 4. Chat
export async function chatWithAI(userQuestion: string, founderData: object): Promise<string> {
  const prompt = `You are FounderPilot. Founder data: ${JSON.stringify(founderData)}. Answer using only this data, max 3-4 lines: "${userQuestion}"`;
  return await callGemini(prompt);
}

// 5. Pre-call Briefing
export async function getPreCallBriefing(contact: {name: string, role: string, notes: string, promises: string, days: number}): Promise<string> {
  const prompt = `You are FounderPilot preparing a founder for a call. Contact: ${contact.name}, Role: ${contact.role}, Last conversation: ${contact.notes}, Promises made: ${contact.promises}, Days since contact: ${contact.days}. Write a pre-call briefing: 1) Who they are 2) What was discussed 3) What was promised 4) What to bring up. Max 6 lines total.`;
  return await callGemini(prompt);
}

// 6. Deadline Warning
export async function getDeadlineWarning(task: string, daysRemaining: number): Promise<string> {
  const prompt = `You are FounderPilot. Deadline: ${task}, due in ${daysRemaining} days. Write 2 lines: first line what's at stake, second line one action they can take RIGHT NOW. Urgent but calm tone.`;
  return await callGemini(prompt);
}