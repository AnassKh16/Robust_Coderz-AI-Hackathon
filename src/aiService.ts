const env = (import.meta as any)?.env ?? {};
const GEMINI_API_KEY = env.VITE_GEMINI_API_KEY ?? env.GEMINI_API_KEY;
const XAI_API_KEY = env.VITE_XAI_API_KEY ?? env.VITE_GROK_API_KEY ?? env.XAI_API_KEY ?? env.GROK_API_KEY;
const XAI_MODEL = env.VITE_XAI_MODEL ?? env.VITE_GROK_MODEL ?? "grok-4-0709";
const GROQ_API_KEY = env.VITE_GROQ_API_KEY ?? env.GROQ_API_KEY;
const GROQ_MODEL = env.VITE_GROQ_MODEL ?? env.GROQ_MODEL ?? "llama-3.1-8b-instant";

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
const XAI_URL = "https://api.x.ai/v1/chat/completions";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const MIN_INTERVAL_GEMINI_MS = 21_000; // ~3 RPM safe mode
const MIN_INTERVAL_XAI_MS = 2_000;
const MIN_INTERVAL_GROQ_MS = 0; // No delay for Groq
const REQUEST_TIMEOUT_MS = 12_000;
let lastCallAt = 0;
let queue: Promise<any> = Promise.resolve();

// --- localStorage cache layer (best-effort) ---
const ORBIT_CACHE_PREFIX = "orbit_cache_";

type OrbitCacheEntry = {
  response: string;
  timestamp: number;
};

function djb2Hash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  // force unsigned 32-bit
  return (hash >>> 0).toString(16);
}

function safeStringifyInput(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    try {
      return String(value);
    } catch {
      return "[unstringifiable]";
    }
  }
}

function makeCacheKey(fnName: string, input: unknown): { key: string; inputHash: string } {
  const raw = `${fnName}:${safeStringifyInput(input)}`;
  const inputHash = djb2Hash(raw);
  return { key: `${ORBIT_CACHE_PREFIX}${inputHash}`, inputHash };
}

function readCache(key: string): OrbitCacheEntry | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const entry = parsed as OrbitCacheEntry;
    if (typeof entry.response !== "string") return null;
    if (typeof entry.timestamp !== "number") return null;
    return entry;
  } catch {
    return null;
  }
}

function writeCache(key: string, entry: OrbitCacheEntry) {
  try {
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // ignore (private mode / blocked storage)
  }
}

async function withOrbitCache(
  fnName: string,
  input: unknown,
  ttlMs: number,
  compute: () => Promise<string>
): Promise<string> {
  const { key } = makeCacheKey(fnName, input);
  const now = Date.now();
  const cached = readCache(key);
  if (cached && typeof cached.timestamp === "number" && now - cached.timestamp < ttlMs) {
    return cached.response;
  }
  const response = await compute();
  writeCache(key, { response, timestamp: Date.now() });
  return response;
}

export function clearOrbitCache() {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(ORBIT_CACHE_PREFIX)) keys.push(k);
    }
    keys.forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch {
        // ignore per key
      }
    });
  } catch {
    // ignore
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function schedule<T>(fn: () => Promise<T>): Promise<T> {
  queue = queue
    .catch(() => undefined)
    .then(async () => {
      const now = Date.now();
      const interval = GROQ_API_KEY
        ? MIN_INTERVAL_GROQ_MS
        : XAI_API_KEY
          ? MIN_INTERVAL_XAI_MS
          : MIN_INTERVAL_GEMINI_MS;
      const wait = Math.max(0, lastCallAt + interval - now);
      if (wait) await sleep(wait);
      lastCallAt = Date.now();
      return fn();
    });
  return queue;
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (e: any) {
    if (e?.name === "AbortError") {
      throw new Error(`Orbit request timed out after ${REQUEST_TIMEOUT_MS / 1000}s. Check your internet connection.`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

async function callGemini(promptText: string): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error("Missing Gemini API key. Add VITE_GEMINI_API_KEY to your .env file.");
  const response = await fetchWithTimeout(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: promptText }] }]
    })
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    const err = new Error(`Gemini request failed (${response.status}): ${errorText}`);
    (err as any).status = response.status;
    throw err;
  }
  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Gemini returned an empty response.");
  }
  return text;
}

async function callXAI(promptText: string): Promise<string> {
  if (!XAI_API_KEY) throw new Error("Missing xAI API key. Add VITE_XAI_API_KEY to your .env file.");
  const response = await fetchWithTimeout(XAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${XAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: XAI_MODEL,
      messages: [
        { role: "system", content: "You are Orbit, an AI copilot for startup founders. Be concise and actionable." },
        { role: "user", content: promptText },
      ],
      max_completion_tokens: 220,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    const err = new Error(`xAI request failed (${response.status}): ${errorText}`);
    (err as any).status = response.status;
    throw err;
  }
  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("xAI returned an empty response.");
  }
  return text;
}

async function callGroq(promptText: string): Promise<string> {
  if (!GROQ_API_KEY) throw new Error("Missing Groq API key. Add VITE_GROQ_API_KEY to your .env file.");
  const response = await fetchWithTimeout(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: "You are Orbit, an AI copilot for startup founders. Be concise and actionable." },
        { role: "user", content: promptText },
      ],
      max_tokens: 220,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    const err = new Error(`Groq request failed (${response.status}): ${errorText}`);
    (err as any).status = response.status;
    throw err;
  }
  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Groq returned an empty response.");
  }
  return text;
}

async function callGroqStream(promptText: string, onChunk: (text: string) => void): Promise<string> {
  if (!GROQ_API_KEY) throw new Error("Missing Groq API key. Add VITE_GROQ_API_KEY to your .env file.");

  const response = await fetchWithTimeout(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      stream: true,
      messages: [
        { role: "system", content: "You are Orbit, an AI copilot for startup founders. Be concise and actionable." },
        { role: "user", content: promptText },
      ],
      max_tokens: 220,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    const err = new Error(`Groq request failed (${response.status}): ${errorText}`);
    (err as any).status = response.status;
    throw err;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    // If streaming isn't available, fall back to non-streaming.
    return await callGroq(promptText);
  }

  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let full = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE frames are separated by \n\n. Each line typically starts with `data: `
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const lines = part.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.replace(/^data:\s*/, "");
        if (!payload) continue;
        if (payload === "[DONE]") continue;

        try {
          const json = JSON.parse(payload);
          const delta = json?.choices?.[0]?.delta?.content;
          if (typeof delta === "string" && delta.length) {
            full += delta;
            onChunk(delta);
          }
        } catch {
          // ignore malformed frames
        }
      }
    }
  }

  if (!full.trim()) {
    throw new Error("Groq returned an empty response.");
  }
  return full;
}

async function callLLM(promptText: string): Promise<string> {
  // Provider order: Groq -> xAI -> Gemini
  const attempt = async () => {
    if (GROQ_API_KEY) return await callGroq(promptText);
    if (XAI_API_KEY) return await callXAI(promptText);
    return await callGemini(promptText);
  };

  // For Groq, avoid queue serialization to keep chat snappy.
  if (GROQ_API_KEY) {
    try {
      return await attempt();
    } catch (e: any) {
      if (e?.status === 429) {
        await sleep(600);
        return await attempt();
      }
      throw e;
    }
  }

  return await schedule(async () => {
    try {
      return await attempt();
    } catch (e: any) {
      // Auto-retry once on 429
      if (e?.status === 429) {
        const retryInterval = XAI_API_KEY ? MIN_INTERVAL_XAI_MS : MIN_INTERVAL_GEMINI_MS;
        await sleep(retryInterval);
        return await attempt();
      }
      throw e;
    }
  });
}

// 1. Daily Briefing
export async function getDailyBriefing(userData: object): Promise<string> {
  const prompt = `You are Orbit. Given this founder data: ${JSON.stringify(userData)}, generate a 5 bullet morning briefing. Each bullet is one line, actionable, starts with an emoji. No intro or outro.`;
  return await withOrbitCache(
    "getDailyBriefing",
    userData,
    24 * 60 * 60 * 1000,
    async () => await callLLM(prompt)
  );
}

// 2. Draft Follow-up Email
export async function draftFollowUp(contact: { name: string; role: string; notes: string; daysSince: number }): Promise<string> {
  const prompt = `You are Orbit. Write a follow-up email for: Name: ${contact.name}, Role: ${contact.role}, Last conversation: ${contact.notes}, Days since contact: ${contact.daysSince}. Max 5 lines, include subject line, no filler phrases, end with a soft call to action.`;
  return await callLLM(prompt);
}

// 3. Stack Monitor Alerts
export async function getStackAlerts(stack: string[], newsList: string[]): Promise<string> {
  const prompt = `You are a technical advisor. The startup uses: ${stack.join(", ")}. From this news: ${newsList.join(" | ")} only return alerts relevant to their stack. For each: alert title, why it matters, what to do. One line each.`;
  return await withOrbitCache(
    "getStackAlerts",
    { stack, newsList },
    6 * 60 * 60 * 1000,
    async () => await callLLM(prompt)
  );
}

// 4. Chat
export async function chatWithAI(userQuestion: string, founderData: object): Promise<string> {
  const prompt = `You are Orbit. Founder data: ${JSON.stringify(founderData)}. Answer using only this data, max 3-4 lines: "${userQuestion}"`;
  return await callLLM(prompt);
}

export async function chatWithAIStream(
  userQuestion: string,
  founderData: object,
  onChunk: (text: string) => void
): Promise<string> {
  const prompt = `You are Orbit. Founder data: ${JSON.stringify(founderData)}. Answer using only this data, max 3-4 lines: "${userQuestion}"`;

  // Stream only when Groq is the active provider; otherwise fall back to normal.
  if (GROQ_API_KEY) {
    try {
      return await callGroqStream(prompt, onChunk);
    } catch (e: any) {
      // If streaming fails, fall back to non-streaming (same provider order logic).
      return await callLLM(prompt);
    }
  }
  return await callLLM(prompt);
}

// 5. Pre-call Briefing
export async function getPreCallBriefing(contact: { name: string; role: string; notes: string; promises: string; days: number }): Promise<string> {
  const prompt = `You are Orbit preparing a founder for a call. Contact: ${contact.name}, Role: ${contact.role}, Last conversation: ${contact.notes}, Promises made: ${contact.promises}, Days since contact: ${contact.days}. Write a pre-call briefing: 1) Who they are 2) What was discussed 3) What was promised 4) What to bring up. Max 6 lines total.`;
  return await callLLM(prompt);
}

// 6. Deadline Warning
export async function getDeadlineWarning(task: string, daysRemaining: number): Promise<string> {
  const prompt = `You are Orbit. Deadline: ${task}, due in ${daysRemaining} days. Write 2 lines: first line what's at stake, second line one action they can take RIGHT NOW. Urgent but calm tone.`;
  return await withOrbitCache(
    "getDeadlineWarning",
    { task, daysRemaining },
    60 * 60 * 1000,
    async () => await callLLM(prompt)
  );
}