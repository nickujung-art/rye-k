/**
 * Firestore 백업 복원 스크립트
 * 사용: node scripts/restore-firestore.js [backup-file.json] [--dry-run] [--keys key1,key2]
 *
 * 옵션:
 *   backup-file.json  복원할 백업 파일 경로 (미지정 시 최신 백업 자동 선택)
 *   --dry-run         실제 쓰기 없이 내용만 미리 보기
 *   --keys k1,k2      특정 컬렉션만 선택 복원 (쉼표 구분)
 *   --skip-keys k1,k2 특정 컬렉션 제외
 */

import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── 이메일 Auth 자격증명 파생 (firebase.js와 동일한 로직) ───────────────────────
const BACKUP_USER = process.env.RYEK_BACKUP_USER || "admin";
const BACKUP_EMAIL = `${BACKUP_USER}@ryek2.app`;
let _AUTH_SALT = process.env.VITE_AUTH_SALT || "";
if (!_AUTH_SALT) {
  try {
    const env = readFileSync(join(__dirname, "..", ".env.local"), "utf8");
    const m = env.match(/^VITE_AUTH_SALT=(.+)$/m);
    if (m) _AUTH_SALT = m[1].trim();
  } catch {}
}
const BACKUP_PASSWORD = _AUTH_SALT
  ? `ryek2!${BACKUP_USER}#${_AUTH_SALT}`
  : `ryek!${BACKUP_USER}#2024`;

const firebaseConfig = {
  apiKey: "AIzaSyDViGzxa0o1tqqX6fGr46Sfiews-ieGmks",
  authDomain: "rye-k-center.firebaseapp.com",
  projectId: "rye-k-center",
  storageBucket: "rye-k-center.firebasestorage.app",
  messagingSenderId: "610521638965",
  appId: "1:610521638965:web:656cbac5c2dbea2aa6697c",
};

// 절대 복원하면 안 되는 컬렉션 (운영 흐름 데이터)
const NEVER_RESTORE = ["rye-activity", "rye-pending"];

function parseArgs() {
  const args = process.argv.slice(2);
  let backupFile = null;
  let dryRun = false;
  let onlyKeys = null;
  let skipKeys = new Set(NEVER_RESTORE);

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--dry-run") {
      dryRun = true;
    } else if (args[i] === "--keys" && args[i + 1]) {
      onlyKeys = new Set(args[++i].split(",").map((k) => k.trim()));
    } else if (args[i] === "--skip-keys" && args[i + 1]) {
      args[++i].split(",").forEach((k) => skipKeys.add(k.trim()));
    } else if (!args[i].startsWith("--")) {
      backupFile = args[i];
    }
  }

  return { backupFile, dryRun, onlyKeys, skipKeys };
}

function findLatestBackup() {
  const backupsDir = join(__dirname, "..", "backups");
  const files = readdirSync(backupsDir)
    .filter((f) => f.startsWith("backup-") && f.endsWith(".json"))
    .sort()
    .reverse();
  if (!files.length) throw new Error("backups/ 폴더에 백업 파일이 없습니다.");
  return join(backupsDir, files[0]);
}

async function main() {
  const { backupFile, dryRun, onlyKeys, skipKeys } = parseArgs();

  const filePath = backupFile || findLatestBackup();
  console.log(`\n=== RYE-K Firestore 복원 ${dryRun ? "[DRY RUN]" : ""} ===`);
  console.log(`백업 파일: ${filePath}\n`);

  const backup = JSON.parse(readFileSync(filePath, "utf8"));
  console.log(`백업 시각: ${backup.timestamp}`);
  console.log(`프로젝트: ${backup.projectId}\n`);

  // 복원 대상 결정
  const allKeys = Object.keys(backup.appData || {});
  const targetKeys = allKeys.filter((k) => {
    if (skipKeys.has(k)) return false;
    if (onlyKeys && !onlyKeys.has(k)) return false;
    if (backup.appData[k] === null) return false;
    return true;
  });

  console.log("복원 대상:");
  targetKeys.forEach((k) => {
    const val = backup.appData[k]?.value;
    const summary = Array.isArray(val)
      ? `${val.length}개`
      : typeof val === "object" && val !== null
      ? "object"
      : String(val ?? "(없음)");
    console.log(`  ✓ ${k}: ${summary}`);
  });

  const skipped = allKeys.filter((k) => !targetKeys.includes(k));
  if (skipped.length) {
    console.log("\n제외 (건너뜀):");
    skipped.forEach((k) => console.log(`  - ${k}`));
  }

  if (dryRun) {
    console.log("\n[DRY RUN] 실제 복원은 수행하지 않았습니다.");
    console.log("복원하려면: node scripts/restore-firestore.js [파일] 에서 --dry-run 제거");
    process.exit(0);
  }

  console.log("\n계속하려면 5초 안에 Ctrl+C로 취소하세요...");
  await new Promise((r) => setTimeout(r, 5000));

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const auth = getAuth(app);

  console.log(`\nFirebase Auth 연결 중... (${BACKUP_EMAIL})`);
  await signInWithEmailAndPassword(auth, BACKUP_EMAIL, BACKUP_PASSWORD);
  console.log("✓ Auth 완료 (email)\n");

  let ok = 0, fail = 0;
  for (const key of targetKeys) {
    try {
      const data = backup.appData[key];
      await setDoc(doc(db, "appData", key), data);
      const val = data?.value;
      const summary = Array.isArray(val) ? `${val.length}개` : "object";
      console.log(`  ✓ ${key}: ${summary} 복원 완료`);
      ok++;
    } catch (err) {
      console.error(`  ✗ ${key}: ${err.message}`);
      fail++;
    }
  }

  // rye-instant-charges 독립 컬렉션 복원
  const charges = backup["rye-instant-charges"];
  const restoreCharges =
    charges?.length > 0 &&
    (!onlyKeys || onlyKeys.has("rye-instant-charges")) &&
    !skipKeys.has("rye-instant-charges");

  if (restoreCharges) {
    console.log("\nrye-instant-charges 복원:");
    const { collection, setDoc: sd, doc: d } = await import("firebase/firestore");
    for (const charge of charges) {
      try {
        const { id, ...data } = charge;
        await sd(d(db, "rye-instant-charges", id), data);
        console.log(`  ✓ ${id}`);
        ok++;
      } catch (err) {
        console.error(`  ✗ ${charge.id}: ${err.message}`);
        fail++;
      }
    }
  }

  console.log(`\n=== 복원 완료: 성공 ${ok}건, 실패 ${fail}건 ===`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("복원 실패:", err);
  process.exit(1);
});
