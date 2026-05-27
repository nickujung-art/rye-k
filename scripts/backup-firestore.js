/**
 * Firestore 전체 백업 스크립트
 * 사용: node scripts/backup-firestore.js
 *
 * backups/ 디렉토리에 backup-YYYY-MM-DDTHH-mm-ss.json 파일로 저장됨
 */

import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, collection, getDocs } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── 이메일 Auth 자격증명 파생 (firebase.js와 동일한 로직) ───────────────────────
// RYEK_BACKUP_USER 환경변수로 재정의 가능 (기본값: admin)
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

const COLLECTION = "appData";
const KEYS = [
  "rye-teachers",
  "rye-students",
  "rye-notices",
  "rye-categories",
  "rye-attendance",
  "rye-payments",
  "rye-activity",
  "rye-pending",
  "rye-fee-presets",
  "rye-schedule-overrides",
  "rye-trash",
  "rye-student-notices",
  "rye-institutions",
  "rye-unmatched-payments",
  "rye-payment-log",
  "rye-ai-reports",
  "rye-settings",
  "rye-shop-items",
];

async function main() {
  console.log("=== RYE-K Firestore 백업 시작 ===\n");

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const auth = getAuth(app);

  // 이메일 로그인 (rye-teachers/students는 isEmailUser() 읽기만 허용)
  console.log(`Firebase Auth 연결 중... (${BACKUP_EMAIL})`);
  await signInWithEmailAndPassword(auth, BACKUP_EMAIL, BACKUP_PASSWORD);
  console.log("✓ Auth 완료 (email)\n");

  const backup = {
    timestamp: new Date().toISOString(),
    projectId: "rye-k-center",
    appData: {},
    "rye-instant-charges": [],
  };

  // appData 컬렉션 각 문서 읽기
  console.log("appData 컬렉션 읽기:");
  for (const key of KEYS) {
    try {
      const snap = await getDoc(doc(db, COLLECTION, key));
      if (snap.exists()) {
        backup.appData[key] = snap.data();
        const val = snap.data().value;
        const summary = Array.isArray(val)
          ? `${val.length}개`
          : typeof val === "object" && val !== null
          ? "object"
          : String(val ?? "(없음)");
        console.log(`  ✓ ${key}: ${summary}`);
      } else {
        backup.appData[key] = null;
        console.log(`  - ${key}: 문서 없음`);
      }
    } catch (err) {
      backup.appData[key] = { __error: err.message };
      console.error(`  ✗ ${key}: ${err.message}`);
    }
  }

  // rye-instant-charges 독립 컬렉션
  console.log("\nrye-instant-charges 컬렉션 읽기:");
  try {
    const snap = await getDocs(collection(db, "rye-instant-charges"));
    backup["rye-instant-charges"] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    console.log(`  ✓ rye-instant-charges: ${backup["rye-instant-charges"].length}개`);
  } catch (err) {
    backup["rye-instant-charges"] = [{ __error: err.message }];
    console.error(`  ✗ rye-instant-charges: ${err.message}`);
  }

  // 파일 저장
  const backupsDir = join(__dirname, "..", "backups");
  if (!existsSync(backupsDir)) mkdirSync(backupsDir);

  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = join(backupsDir, `backup-${ts}.json`);
  writeFileSync(filename, JSON.stringify(backup, null, 2), "utf8");

  console.log(`\n=== 백업 완료 ===`);
  console.log(`저장 위치: ${filename}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("백업 실패:", err);
  process.exit(1);
});
