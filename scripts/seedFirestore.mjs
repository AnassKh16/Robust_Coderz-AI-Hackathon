import "dotenv/config";
import admin from "firebase-admin";

function isoDateDaysAgo(days) {
  const d = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

function pick(arr, i) {
  return arr[i % arr.length];
}

async function main() {
  console.log("🚀 Starting Orbit database seed...");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Uses GOOGLE_APPLICATION_CREDENTIALS if set, otherwise tries default credentials.
  // This is the standard, secure way to seed Firestore from Node.
  if (!admin.apps.length) {
    const projectId =
      process.env.FIREBASE_PROJECT_ID ||
      process.env.GCLOUD_PROJECT ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      "orbit-ai-hackathon";

    const serviceAccountPath =
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;

    admin.initializeApp({
      credential: serviceAccountPath
        ? admin.credential.cert(serviceAccountPath)
        : admin.credential.applicationDefault(),
      projectId,
    });
  }

  const db = admin.firestore();
  const nowISO = new Date().toISOString().slice(0, 10);

  // --- Contacts (40) ---
  const firstNames = [
    "Elan",
    "Priya",
    "Ahmed",
    "Sara",
    "Ali",
    "Ayesha",
    "Omar",
    "Noor",
    "Zain",
    "Hina",
  ];
  const lastNames = [
    "Brightwood",
    "Nandakumar",
    "Khan",
    "Ali",
    "Raza",
    "Siddiqui",
    "Malik",
    "Hussain",
    "Farooq",
    "Chaudhry",
  ];
  const investorFirms = [
    "Horizon Ventures",
    "SeedSpark Capital",
    "NorthBridge Partners",
    "Atlas Growth",
    "BluePeak Ventures",
  ];
  const customerOrgs = [
    "Scale AI",
    "Acme Corp",
    "Nova Retail",
    "Zen Logistics",
    "Orbit Systems",
  ];

  const contacts = Array.from({ length: 40 }).map((_, idx) => {
    const name = `${pick(firstNames, idx)} ${pick(lastNames, idx + 3)}`;
    const role = idx % 3 === 0 ? "Investor" : idx % 3 === 1 ? "Customer" : "Lead";
    const daysSince = (idx % 9) + 1;
    const lastContact = isoDateDaysAgo(daysSince);
    const status = daysSince >= 5 ? "overdue" : daysSince <= 2 ? "recent" : "pending";
    const org =
      role === "Investor"
        ? pick(investorFirms, idx)
        : role === "Customer"
          ? pick(customerOrgs, idx)
          : pick(customerOrgs, idx + 2);
    const notes =
      role === "Investor"
        ? `Asked for updated MRR figures. Next: send metrics + deck update. (${org})`
        : role === "Customer"
          ? `Waiting for onboarding sequence. Next: share rollout plan. (${org})`
          : `Interested after demo call. Next: schedule technical follow-up. (${org})`;
    return { name, role, lastContact, notes, status, daysSince };
  });

  console.log("👥 Adding 40 contacts...");
  const contactsCol = db.collection("contacts");
  {
    const batch = db.batch();
    contacts.forEach((c) => {
      batch.set(contactsCol.doc(), c);
    });
    await batch.commit();
  }
  console.log(`  ✅ ${contacts.length} contacts`);

  // --- Stack Alerts (8) ---
  console.log("🛰️ Adding stack alerts...");
  const alerts = [
    {
      tool: "Gemini Flash",
      type: "price_change",
      message: "Price dropped 30%",
      severity: "high",
      action: "Switch billing plan to save money",
      date: nowISO,
    },
    {
      tool: "Firebase",
      type: "version_update",
      message: "New SDK version released v11.0",
      severity: "medium",
      action: "Test compatibility before upgrading",
      date: isoDateDaysAgo(1),
    },
    {
      tool: "Cloud Run",
      type: "no_change",
      message: "No updates this week",
      severity: "low",
      action: "No action needed",
      date: nowISO,
    },
    {
      tool: "PostgreSQL",
      type: "performance_warning",
      message: "Read replica lag increased by 220ms",
      severity: "medium",
      action: "Inspect slow queries and replica health",
      date: nowISO,
    },
    {
      tool: "Auth",
      type: "security",
      message: "Multiple failed login bursts detected",
      severity: "high",
      action: "Enable rate-limiting and review IPs",
      date: nowISO,
    },
    {
      tool: "Vite",
      type: "build",
      message: "Bundle size exceeded 500kb threshold",
      severity: "low",
      action: "Consider code-splitting for performance",
      date: nowISO,
    },
    {
      tool: "Firestore",
      type: "cost",
      message: "Read costs trending +18% WoW",
      severity: "medium",
      action: "Add indexes and reduce hot queries",
      date: nowISO,
    },
    {
      tool: "Email",
      type: "delivery",
      message: "Deliverability dipped by 2% this week",
      severity: "low",
      action: "Warm up domain and verify SPF/DKIM",
      date: nowISO,
    },
  ];

  const stackCol = db.collection("stackAlerts");
  {
    const batch = db.batch();
    alerts.forEach((a) => batch.set(stackCol.doc(), a));
    await batch.commit();
  }
  console.log(`  ✅ ${alerts.length} alerts`);

  // --- Decisions (8) ---
  console.log("🧠 Adding decisions...");
  const decisions = [
    {
      text: "YC Application submission",
      date: isoDateDaysAgo(8),
      madeBy: "Paul",
      tag: "accelerator",
      deadline: isoDateDaysAgo(-2),
      daysRemaining: 2,
    },
    {
      text: "Send MRR update to Ahmed Khan",
      date: isoDateDaysAgo(12),
      madeBy: "Paul",
      tag: "investor",
      deadline: isoDateDaysAgo(-1),
      daysRemaining: 1,
    },
    {
      text: "Promised Ali dashboard feature",
      date: isoDateDaysAgo(8),
      madeBy: "Paul",
      tag: "customer",
      deadline: "2026-06-01",
      daysRemaining: 35,
    },
    {
      text: "Finalize onboarding email sequence",
      date: isoDateDaysAgo(3),
      madeBy: "Paul",
      tag: "customer",
      deadline: isoDateDaysAgo(-5),
      daysRemaining: 5,
    },
    {
      text: "Schedule investor sync calls",
      date: isoDateDaysAgo(5),
      madeBy: "Paul",
      tag: "investor",
      deadline: isoDateDaysAgo(-7),
      daysRemaining: 7,
    },
    {
      text: "Lock v1 roadmap and publish internally",
      date: isoDateDaysAgo(2),
      madeBy: "Paul",
      tag: "product",
      deadline: isoDateDaysAgo(-10),
      daysRemaining: 10,
    },
    {
      text: "Enable CI checks for frontend",
      date: isoDateDaysAgo(1),
      madeBy: "Paul",
      tag: "engineering",
      deadline: isoDateDaysAgo(-3),
      daysRemaining: 3,
    },
    {
      text: "Review cloud spend optimization opportunities",
      date: isoDateDaysAgo(4),
      madeBy: "Paul",
      tag: "finance",
      deadline: isoDateDaysAgo(-14),
      daysRemaining: 14,
    },
  ];

  const decisionsCol = db.collection("decisions");
  {
    const batch = db.batch();
    decisions.forEach((d) => batch.set(decisionsCol.doc(), d));
    await batch.commit();
  }
  console.log(`  ✅ ${decisions.length} decisions`);

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🎉 Orbit database seeded successfully!");
  console.log(`   📊 ${contacts.length} contacts added`);
  console.log(`   🛰️  ${alerts.length} stack alerts added`);
  console.log(`   🧠 ${decisions.length} decisions added`);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err?.message ?? err);
  const msg = String(err?.message ?? "");
  if (
    msg.includes("Could not load the default credentials") ||
    msg.includes("Unable to detect a Project Id")
  ) {
    console.error("");
    console.error("To run this seeder you need a Firebase service account JSON.");
    console.error(
      "Set FIREBASE_SERVICE_ACCOUNT_PATH (or GOOGLE_APPLICATION_CREDENTIALS) to the JSON file path, then run `npm run seed`."
    );
    console.error("Example (PowerShell):");
    console.error(
      '$env:FIREBASE_SERVICE_ACCOUNT_PATH=\"C:\\\\path\\\\to\\\\serviceAccount.json\"; npm run seed'
    );
  }
  process.exit(1);
});

