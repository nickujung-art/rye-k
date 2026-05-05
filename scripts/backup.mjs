#!/usr/bin/env node
/**
 * RYE-K Firebase Firestore Backup Script
 * Usage: node scripts/backup.mjs
 *
 * READ-ONLY. No writes to Firestore.
 * Outputs: rye-k-backup-{timestamp}.json in project root.
 */

import { writeFileSync } from "fs";

const API_KEY = "AIzaSyDViGzxa0o1tqqX6fGr46Sfiews-ieGmks";
const PROJECT_ID = "rye-k-center";

// ─── Firestore typed-value parser ──────────────────────────────────────────

function parseValue(val) {
  if (val === undefined || val === null) return null;
  if ("nullValue" in val) return null;
  if ("booleanValue" in val) return val.booleanValue;
  if ("integerValue" in val) return Number(val.integerValue);
  if ("doubleValue" in val) return val.doubleValue;
  if ("stringValue" in val) return val.stringValue;
  if ("bytesValue" in val) return val.bytesValue;
  if ("timestampValue" in val) return val.timestampValue;
  if ("referenceValue" in val) return val.referenceValue;
  if ("geoPointValue" in val) return val.geoPointValue;
  if ("arrayValue" in val) {
    const values = val.arrayValue.values ?? [];
    return values.map(parseValue);
  }
  if ("mapValue" in val) {
    const fields = val.mapValue.fields ?? {};
    const out = {};
    for (const [k, v] of Object.entries(fields)) {
      out[k] = parseValue(v);
    }
    return out;
  }
  return val;
}

function parseDocument(doc) {
  const fields = doc.fields ?? {};
  const out = { _name: doc.name, _createTime: doc.createTime, _updateTime: doc.updateTime };
  for (const [k, v] of Object.entries(fields)) {
    out[k] = parseValue(v);
  }
  return out;
}

// ─── Firebase Auth (anonymous) ─────────────────────────────────────────────

async function getAnonToken() {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ returnSecureToken: true }),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Auth failed (${res.status}): ${err}`);
  }
  const data = await res.json();
  return data.idToken;
}

// ─── Firestore list documents ───────────────────────────────────────────────

async function listDocuments(token, collectionPath) {
  const base = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
  const docs = [];
  let pageToken = null;

  do {
    const url = new URL(`${base}/${collectionPath}`);
    url.searchParams.set("pageSize", "300");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Firestore list failed (${res.status}): ${err}`);
    }

    const data = await res.json();
    if (data.documents) {
      docs.push(...data.documents);
    }
    pageToken = data.nextPageToken ?? null;
  } while (pageToken);

  return docs;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== RYE-K Firebase Backup ===");
  console.log(`Project: ${PROJECT_ID}`);
  console.log("Mode: READ-ONLY\n");

  console.log("1. Getting auth token...");
  const token = await getAnonToken();
  console.log("   OK\n");

  console.log("2. Reading appData collection...");
  const rawDocs = await listDocuments(token, "appData");
  console.log(`   Found ${rawDocs.length} document(s)\n`);

  const backup = {
    _meta: {
      project: PROJECT_ID,
      backupTime: new Date().toISOString(),
      docCount: rawDocs.length,
    },
    documents: {},
  };

  const counts = {};

  for (const raw of rawDocs) {
    const parsed = parseDocument(raw);
    // Document ID is the last segment of the name path
    const docId = raw.name.split("/").at(-1);
    backup.documents[docId] = parsed;

    // Count arrays inside each document for summary
    for (const [k, v] of Object.entries(parsed)) {
      if (k.startsWith("_")) continue;
      if (Array.isArray(v)) {
        counts[`${docId}.${k}`] = v.length;
      }
    }
  }

  console.log("3. Summary:");
  for (const [key, count] of Object.entries(counts).sort()) {
    console.log(`   ${key}: ${count} records`);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `rye-k-backup-${timestamp}.json`;
  writeFileSync(filename, JSON.stringify(backup, null, 2), "utf-8");

  console.log(`\n✓ Backup saved: ${filename}`);
  console.log(`  Total documents: ${rawDocs.length}`);
}

main().catch((err) => {
  console.error("\nBackup failed:", err.message);
  process.exit(1);
});
