#!/usr/bin/env node
/**
 * deploy_pack.js -- Firebase Storage + Firestore deployer for Exia XP3 packs
 *
 * Usage (run from repo root):
 *   node scripts/deploy_pack.js \
 *     --xp3      <file>       Path to the packed .xp3 file
 *     --packId   <id>         Firestore document ID (e.g. "chapter1-bg")
 *     --name     <name>       Human-readable pack name
 *     --version  <ver>        Semantic version string (e.g. "1.0.0")
 *     --role     <role>       "free" | "premium"
 *     --md5      <hash>       Hex MD5 of the XP3 file (from pack_xp3.py output)
 *     --manifest <json>       Path to manifest JSON produced by pack_xp3.py
 *
 * Prerequisites:
 *   npm install firebase-admin --save-dev
 *   .firebase-service-account.json  (gitignored service account key)
 *   .env with VITE_FIREBASE_STORAGE_BUCKET set
 *
 * Firestore writes:
 *   /packs/{packId}                  FirestorePack document
 *   /packs/{packId}/assets/{assetId} one doc per asset (batched, max 500/batch)
 *
 * Storage writes:
 *   packs/{uuid}.xp3
 */

"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const admin = require("firebase-admin");

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const key = argv[i];
    if (key.startsWith("--")) {
      const name = key.slice(2);
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`Missing value for argument: ${key}`);
      }
      args[name] = value;
      i++;
    }
  }
  return args;
}

const REQUIRED_ARGS = ["xp3", "packId", "name", "version", "role", "md5", "manifest"];

function validateArgs(args) {
  const missing = REQUIRED_ARGS.filter((k) => !args[k]);
  if (missing.length > 0) {
    throw new Error(`Missing required arguments: ${missing.map((k) => `--${k}`).join(", ")}`);
  }
  if (!["free", "premium"].includes(args.role)) {
    throw new Error(`--role must be "free" or "premium", got: "${args.role}"`);
  }
}

// ---------------------------------------------------------------------------
// .env parser (no dotenv dependency)
// ---------------------------------------------------------------------------

function loadEnv(envPath) {
  const resolved = path.resolve(envPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`.env file not found at: ${resolved}`);
  }
  const env = {};
  for (const line of fs.readFileSync(resolved, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

// ---------------------------------------------------------------------------
// Firebase Admin init
// ---------------------------------------------------------------------------

function initFirebase(serviceAccountPath, storageBucket) {
  const saPath = path.resolve(serviceAccountPath);
  if (!fs.existsSync(saPath)) {
    throw new Error(
      `Service account JSON not found: ${saPath}\n` +
      "Download from Firebase Console → Project Settings → Service Accounts → Generate new private key."
    );
  }
  const serviceAccount = JSON.parse(fs.readFileSync(saPath, "utf8"));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket,
  });
}

// ---------------------------------------------------------------------------
// Storage upload
// ---------------------------------------------------------------------------

async function uploadXp3(xp3Path, destPath) {
  const bucket = admin.storage().bucket();
  console.log(`[deploy] Uploading ${xp3Path} → gs://${bucket.name}/${destPath}`);
  await bucket.upload(xp3Path, {
    destination: destPath,
    metadata: { contentType: "application/octet-stream" },
  });
  console.log("[deploy] Upload complete.");
}

// ---------------------------------------------------------------------------
// Firestore writes
// ---------------------------------------------------------------------------

const BATCH_LIMIT = 500;

async function registerFirestore(packId, packDoc, manifest) {
  const db = admin.firestore();

  await db.collection("packs").doc(packId).set(packDoc);
  console.log(`[deploy] Firestore: /packs/${packId} written`);

  const assetsRef = db.collection("packs").doc(packId).collection("assets");
  let written = 0;
  let batchNum = 0;

  for (let start = 0; start < manifest.length; start += BATCH_LIMIT) {
    const slice = manifest.slice(start, start + BATCH_LIMIT);
    const batch = db.batch();
    for (const entry of slice) {
      batch.set(assetsRef.doc(entry.id), {
        // Mirrors asset_commands.rs: "assets/{packId}/{entry.name}"
        extractedPath: `assets/${packId}/${entry.rel_path}`,
      });
    }
    await batch.commit();
    written += slice.length;
    batchNum++;
    console.log(`[deploy] Assets batch ${batchNum}: ${written}/${manifest.length}`);
  }
}

// ---------------------------------------------------------------------------
// UUID helper (works on Node 14 and later)
// ---------------------------------------------------------------------------

function generateUUID() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const buf = crypto.randomBytes(16);
  buf[6] = (buf[6] & 0x0f) | 0x40;
  buf[8] = (buf[8] & 0x3f) | 0x80;
  const hex = buf.toString("hex");
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv);
  validateArgs(args);
  const { xp3, packId, name: packName, version, role, md5, manifest: manifestPath } = args;

  // Load env
  const env = loadEnv(".env");
  const storageBucket = env["VITE_FIREBASE_STORAGE_BUCKET"];
  if (!storageBucket) {
    throw new Error(
      "VITE_FIREBASE_STORAGE_BUCKET is not set in .env.\n" +
      "Set it to your Firebase Storage bucket (e.g. your-project.appspot.com)."
    );
  }

  // Validate input files
  if (!fs.existsSync(xp3)) throw new Error(`XP3 file not found: ${xp3}`);
  if (!fs.existsSync(manifestPath)) throw new Error(`Manifest JSON not found: ${manifestPath}`);

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (!Array.isArray(manifest)) throw new Error("Manifest JSON must be an array.");

  // Verify MD5 before uploading
  console.log(`[deploy] Verifying MD5 of ${xp3}...`);
  const xp3Bytes = fs.readFileSync(xp3);
  const actualMd5 = crypto.createHash("md5").update(xp3Bytes).digest("hex");
  if (actualMd5.toLowerCase() !== md5.toLowerCase()) {
    throw new Error(
      `MD5 mismatch.\n  Expected: ${md5}\n  Actual:   ${actualMd5}\n` +
      `Recompute with: python3 -c "import hashlib; print(hashlib.md5(open('${xp3}','rb').read()).hexdigest())"`
    );
  }
  console.log(`[deploy] MD5 OK: ${actualMd5}`);

  // Init Firebase
  initFirebase(".firebase-service-account.json", storageBucket);

  // Upload to Storage
  const uuid = generateUUID();
  const storageRef = `packs/${uuid}.xp3`;
  await uploadXp3(xp3, storageRef);

  // Register in Firestore
  const packDoc = {
    storageRef,
    version,
    name: packName,
    requiredRole: role,
    md5: md5.toLowerCase(),
    releaseDate: admin.firestore.FieldValue.serverTimestamp(),
  };
  await registerFirestore(packId, packDoc, manifest);

  // Summary
  const sizeMb = (xp3Bytes.length / 1024 / 1024).toFixed(2);
  const preview = manifest.slice(0, 5).map(e => `  - ${e.id}  →  assets/${packId}/${e.rel_path}`).join("\n");

  console.log(`
${"=".repeat(60)}
  DEPLOYMENT COMPLETE
${"=".repeat(60)}
  Pack ID        : ${packId}
  Pack Name      : ${packName}
  Version        : ${version}
  Required Role  : ${role}
  MD5            : ${md5.toLowerCase()}
  XP3 Size       : ${sizeMb} MB
  Storage Path   : ${storageRef}
  Firestore Doc  : /packs/${packId}
  Assets Written : ${manifest.length} docs
${"=".repeat(60)}
  First ${Math.min(5, manifest.length)} assets:
${preview}${manifest.length > 5 ? `\n  ... and ${manifest.length - 5} more` : ""}
${"=".repeat(60)}
`);
}

main().catch((err) => {
  console.error("[deploy] ERROR:", err.message || err);
  process.exit(1);
});
