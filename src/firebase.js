import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, onSnapshot, runTransaction } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously, signOut, onAuthStateChanged, updatePassword } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDViGzxa0o1tqqX6fGr46Sfiews-ieGmks",
  authDomain: "rye-k-center.firebaseapp.com",
  projectId: "rye-k-center",
  storageBucket: "rye-k-center.firebasestorage.app",
  messagingSenderId: "610521638965",
  appId: "1:610521638965:web:656cbac5c2dbea2aa6697c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const toAuthEmail = (username) => `${username}@ryek.app`;

// ⚠️ VITE_AUTH_SALT — 한 번 설정하면 절대 변경/제거 금지!
// 변경 시 SALTED 사용자 모두 로그인 실패 → 강사 앱 마비.
// 신규 설정 절차 및 복구 방법: docs/operations/auth-salt.md
const _SALT = import.meta.env.VITE_AUTH_SALT || "";
const _LEGACY_PW = (u) => `ryek!${u}#2024`;    // 구 스킴 (fallback용)
const _SALTED_PW = (u) => `ryek2!${u}#${_SALT}`; // 신 스킴 (SALT 설정 후)

async function firebaseSignIn(username, _appPassword) {
  const email = toAuthEmail(username);

  // 1차: 솔트 비밀번호 시도 (SALT가 설정된 경우에만)
  if (_SALT) {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, _SALTED_PW(username));
      return cred.user;
    } catch (e) {
      if (e.code !== "auth/user-not-found" && e.code !== "auth/invalid-credential" && e.code !== "auth/wrong-password") {
        return null; // 예상치 못한 오류
      }
      // fall through to legacy
    }
  }

  // 2차: 구 비밀번호 시도 (fallback 또는 SALT 미설정)
  try {
    const cred = await signInWithEmailAndPassword(auth, email, _LEGACY_PW(username));
    // SALT 설정된 경우, 백그라운드에서 신 비밀번호로 업그레이드
    if (_SALT) {
      try { await updatePassword(cred.user, _SALTED_PW(username)); } catch {}
    }
    return cred.user;
  } catch (e) {
    if (e.code === "auth/user-not-found" || e.code === "auth/invalid-credential") {
      // Firebase Auth 계정 없음 → 신규 생성 (SALT 있으면 신 스킴, 없으면 구 스킴)
      try {
        const initialPw = _SALT ? _SALTED_PW(username) : _LEGACY_PW(username);
        const cred = await createUserWithEmailAndPassword(auth, email, initialPw);
        return cred.user;
      } catch { return null; }
    }
    // 계정 있으나 구 비밀번호도 불일치 — 로컬 인증으로 진행 (Firebase 토큰 캐시 유지)
    return null;
  }
}

async function firebaseSignInAnon() {
  try {
    const cred = await signInAnonymously(auth);
    return cred.user;
  } catch (e) {
    console.error("Firebase anonymous auth failed:", e);
    return null;
  }
}

async function firebaseLogout() {
  try { await signOut(auth); } catch (e) { console.error("Sign out error:", e); }
}

export async function getPortalIdToken() {
  try {
    const user = auth.currentUser;
    if (!user) return null;
    return await user.getIdToken();
  } catch {
    return null;
  }
}

export { db, auth, doc, setDoc, onSnapshot, runTransaction, firebaseSignIn, firebaseSignInAnon, firebaseLogout, onAuthStateChanged };
