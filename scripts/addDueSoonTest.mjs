import { createRequire } from "module";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const require = createRequire(import.meta.url);

let serviceAccount;
try {
  serviceAccount = require("../serviceAccount.json");
} catch {
  serviceAccount = require("../../serviceAccount.json");
}

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();
const now = new Date();
const dueAt = new Date(now.getTime() + 2 * 60 * 1000);

const doc = {
  text: "Quick deadline test (2 minutes)",
  tag: "test",
  dueAt: dueAt.toISOString(),
  date: now.toISOString().slice(0, 10),
  createdAt: now.toISOString(),
};

const ref = await db.collection("decisions").add(doc);

console.log("Added test decision:");
console.log(`- id: ${ref.id}`);
console.log(`- text: ${doc.text}`);
console.log(`- dueAt: ${doc.dueAt}`);
