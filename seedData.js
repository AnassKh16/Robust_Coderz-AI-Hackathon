import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

let serviceAccount;
try {
  serviceAccount = require("./serviceAccount.json");
} catch {
  // Fallback when serviceAccount.json is kept in workspace root.
  serviceAccount = require("../serviceAccount.json");
}

// Initialize with admin credentials
initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

async function seed() {
  const firstNames = [
    "Ayesha",
    "Ali",
    "Noor",
    "Omar",
    "Sara",
    "Zain",
    "Hina",
    "Ahmed",
    "Fatima",
    "Bilal",
  ];
  const lastNames = [
    "Malik",
    "Raza",
    "Khan",
    "Siddiqui",
    "Farooq",
    "Hussain",
    "Qureshi",
    "Chaudhry",
    "Butt",
    "Sheikh",
  ];
  const organizations = [
    "Orbit Systems",
    "Nova Retail",
    "Scale AI",
    "Zen Logistics",
    "Horizon Ventures",
    "SeedSpark Capital",
  ];
  const roles = ["Investor", "Customer", "Lead"];

  const contacts = Array.from({ length: 40 }).map((_, i) => {
    const name = `${firstNames[i % firstNames.length]} ${lastNames[(i + 3) % lastNames.length]}`;
    const role = roles[i % roles.length];
    const org = organizations[i % organizations.length];
    const daysSince = (i % 9) + 1;
    const status = daysSince >= 6 ? "overdue" : daysSince <= 2 ? "recent" : "pending";
    const notes =
      role === "Investor"
        ? `Requested updated metrics and roadmap. Next step: send investor update. (${org})`
        : role === "Customer"
          ? `Discussed onboarding and rollout blockers. Next step: share implementation timeline. (${org})`
          : `Qualified after demo and needs technical follow-up. Next step: schedule product deep dive. (${org})`;

    return { name, role, status, daysSince, notes };
  });

  const stackAlerts = [
    { tool: "Firebase", severity: "high", type: "security", message: "Firestore rules are too permissive for write operations.", action: "Restrict writes to authenticated founder role only." },
    { tool: "Authentication", severity: "high", type: "security", message: "Google sign-in domain restriction is not fully configured.", action: "Whitelist only production/auth domains." },
    { tool: "Groq API", severity: "medium", type: "latency", message: "Intermittent high latency in peak hours.", action: "Fallback to smaller model for chat." },
    { tool: "xAI API", severity: "medium", type: "quota", message: "Spike in token usage detected this week.", action: "Set hard cap and alert threshold for usage." },
    { tool: "Gemini API", severity: "high", type: "quota", message: "429 rate limits observed during dashboard refresh.", action: "Add stricter client pacing and retry backoff." },
    { tool: "Vite", severity: "low", type: "upgrade", message: "New patch available for dev server stability.", action: "Upgrade in next sprint." },
    { tool: "Node.js", severity: "medium", type: "runtime", message: "Current deployment runtime nearing EOL.", action: "Plan runtime upgrade." },
    { tool: "CI/CD", severity: "high", type: "pipeline", message: "Production deploy job lacks rollback verification step.", action: "Add post-deploy smoke tests and rollback trigger." },
    { tool: "Cloud Storage", severity: "medium", type: "cost", message: "Storage growth exceeds forecast by 18%.", action: "Enable lifecycle rules for stale assets." },
    { tool: "Monitoring", severity: "high", type: "observability", message: "No alert configured for API error-rate threshold.", action: "Set alert at 5% 5xx over 5 minutes." },
    { tool: "Database Indexes", severity: "low", type: "performance", message: "One dashboard query is not using composite index.", action: "Create suggested index from Firestore console." },
    { tool: "Backups", severity: "high", type: "reliability", message: "Daily backup verification job failed twice this week.", action: "Fix backup credentials and re-run verification." },
  ];

  const decisions = [
    { text: "Switch default chat model to lower-latency variant", deadline: "2026-05-02", daysRemaining: 4, tag: "ai" },
    { text: "Finalize investor update email and send", deadline: "2026-05-01", daysRemaining: 3, tag: "fundraising" },
    { text: "Publish onboarding checklist for pilot customers", deadline: "2026-05-03", daysRemaining: 5, tag: "product" },
    { text: "Audit Firestore rules and lock down admin paths", deadline: "2026-04-30", daysRemaining: 2, tag: "security" },
    { text: "Add API error-rate alerting and on-call escalation policy", deadline: "2026-05-04", daysRemaining: 6, tag: "ops" },
    { text: "Ship fallback model toggle in settings", deadline: "2026-04-29", daysRemaining: 1, tag: "ai" },
    { text: "Complete rollback drill for production deployment", deadline: "2026-05-05", daysRemaining: 7, tag: "reliability" },
    { text: "Run token usage audit for Groq and xAI providers", deadline: "2026-05-01", daysRemaining: 3, tag: "cost" },
    { text: "Prepare investor Q&A sheet with current runway assumptions", deadline: "2026-05-02", daysRemaining: 4, tag: "fundraising" },
    { text: "Create migration plan for upcoming Node runtime upgrade", deadline: "2026-05-06", daysRemaining: 8, tag: "platform" },
    { text: "Enable backup verification dashboard for leadership", deadline: "2026-05-03", daysRemaining: 5, tag: "data" },
    { text: "Close critical security findings from this sprint", deadline: "2026-04-30", daysRemaining: 2, tag: "security" },
  ];

  const batch = db.batch();

  const contactsCol = db.collection("contacts");
  contacts.forEach((item) => batch.set(contactsCol.doc(), item));

  const stackAlertsCol = db.collection("stackAlerts");
  stackAlerts.forEach((item) => batch.set(stackAlertsCol.doc(), item));

  const decisionsCol = db.collection("decisions");
  decisions.forEach((item) => batch.set(decisionsCol.doc(), item));

  await batch.commit();

  console.log("Seed complete:");
  console.log(`- contacts: ${contacts.length}`);
  console.log(`- stackAlerts: ${stackAlerts.length}`);
  console.log(`- decisions: ${decisions.length}`);
}

seed().catch((err) => {
  console.error("Seed failed:", err?.message || err);
  process.exit(1);
});
