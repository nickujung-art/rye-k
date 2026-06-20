/**
 * 구버전 ghost 학생 레코드 삭제 + 강사 instruments 정리
 * 실행: node scripts/migrate-ghost-students.js
 * 실행 전: npm run db:backup 으로 백업 완료 확인
 */

import { initializeApp } from "firebase/app";
import { getFirestore, doc, runTransaction } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const env = readFileSync(join(__dirname, "..", ".env.local"), "utf8");
const salt = env.match(/^VITE_AUTH_SALT=(.+)$/m)?.[1]?.trim() || "";
const pw = salt ? `ryek2!admin#${salt}` : `ryek!admin#2024`;

const firebaseConfig = {
  apiKey: "AIzaSyDViGzxa0o1tqqX6fGr46Sfiews-ieGmks",
  authDomain: "rye-k-center.firebaseapp.com",
  projectId: "rye-k-center",
  storageBucket: "rye-k-center.firebasestorage.app",
  messagingSenderId: "610521638965",
  appId: "1:610521638965:web:656cbac5c2dbea2aa6697c",
};

// ── 삭제할 구버전 ghost 레코드 IDs ──────────────────────────────────────────
const GHOST_IDS_TO_DELETE = new Set([
  "s42",              // 권양안 (ghost · t5 · 화 18:00)
  "s43",              // 이해기 (ghost · t5 · 화 18:00)
  "s44",              // 전근호 (ghost · t5 · 화 18:00)
  "s46",              // 문준기 (ghost · t5 · 화 18:30)
  "s47",              // 모상도 (ghost · t5 · 화 19:30)
  "s48",              // 김민서 (ghost · t5 · 토 11:00)
  "s49",              // 변혜라 (ghost · t5 · 목 19:00)
  "s50",              // 손지혜 (ghost · t5 · 목 19:00)
  "s51",              // 김성호(금송) (ghost · 이소영 · 월 11:00)
  "s52",              // 조보흠(백탄) (ghost · 이소영 · 월 12:00)
  "s53",              // 이경진 (ghost · 이소영 · 화 11:00)
  "s54",              // 이종언 (ghost · 이소영 · 화 11:00)
  "s55",              // 이남희 (ghost · 이소영 · 화 11:30)
  "s56",              // 박병재(이음) (ghost · 이소영 · 화 11:30)
  "s68",              // 백시온 (ghost · 유선화 · 토 10:00)
  "s69",              // 남보배 (ghost · 유선화 · 토 10:00)
  "s70",              // 태겸 (ghost · 유선화 · 토 10:00)
  "s71",              // 김지안 (ghost · 유선화 · 토 12:30)
  "s72",              // 김아인 (ghost · t14 · 토 11:00)
  "mq1ql4cq84a2",    // 김아인 대금 중복 레코드 (초등 대금만 유지)
]);

// ── 강사 instruments 수정 ────────────────────────────────────────────────────
const TEACHER_INSTRUMENTS_FIX = {
  "t6":  ["대금", "소금", "단소"],        // 이소영: 구버전 복합 문자열 제거
  "t7":  ["대금"],                        // 임하영: "대금 · 소금 · 단소" → "대금"
  "t8":  ["초등 대금", "대금"],           // 김병재: 구버전 제거
  "t13": ["장단장구", "사물놀이"],        // 정동주: "장구 · 북 · 꽹과리 · 징" 제거
};

async function main() {
  console.log("=== Ghost 레코드 정리 시작 ===\n");

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const auth = getAuth(app);

  console.log("Firebase Auth 연결 중...");
  await signInWithEmailAndPassword(auth, "admin@ryek2.app", pw);
  console.log("✓ Auth 완료\n");

  // ── 학생 ghost 레코드 삭제 ─────────────────────────────────────────────────
  const studentsRef = doc(db, "appData", "rye-students");
  let deletedCount = 0;
  let keptCount = 0;

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(studentsRef);
    if (!snap.exists()) { console.log("rye-students 없음"); return; }

    const current = snap.data();
    const students = current.value || [];

    console.log(`현재 학생 수: ${students.length}`);
    const filtered = students.filter(s => {
      if (GHOST_IDS_TO_DELETE.has(s.id)) {
        console.log(`  삭제: ${s.name} (${s.id})`);
        deletedCount++;
        return false;
      }
      keptCount++;
      return true;
    });

    tx.update(studentsRef, { value: filtered, updatedAt: Date.now() });
  });

  console.log(`\n✓ 학생 정리 완료 — 삭제 ${deletedCount}건, 유지 ${keptCount}건`);

  // ── 강사 instruments 정리 ──────────────────────────────────────────────────
  const teachersRef = doc(db, "appData", "rye-teachers");

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(teachersRef);
    if (!snap.exists()) { console.log("rye-teachers 없음"); return; }

    const current = snap.data();
    const teachers = current.value || [];

    const updated = teachers.map(t => {
      if (TEACHER_INSTRUMENTS_FIX[t.id]) {
        const before = JSON.stringify(t.instruments);
        const after = JSON.stringify(TEACHER_INSTRUMENTS_FIX[t.id]);
        console.log(`  강사 ${t.name} (${t.id}): ${before} → ${after}`);
        return { ...t, instruments: TEACHER_INSTRUMENTS_FIX[t.id] };
      }
      return t;
    });

    tx.update(teachersRef, { value: updated, updatedAt: Date.now() });
  });

  console.log("\n✓ 강사 instruments 정리 완료");
  console.log("\n=== 마이그레이션 완료 ===");
  process.exit(0);
}

main().catch(e => { console.error("오류:", e.message); process.exit(1); });
