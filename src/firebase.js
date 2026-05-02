import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, onSnapshot, runTransaction } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously, signOut, onAuthStateChanged } from "firebase/auth";

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
// Firebase Auth 비밀번호는 username 기반 고정값 — 앱 로그인 비밀번호와 독립적
// 이렇게 하면 관리자가 앱 비밀번호를 변경해도 Firebase Auth 세션이 끊기지 않음
const toAuthPassword = (username) => `ryek!${username}#2024`;

async function firebaseSignIn(username, _appPassword) {
  const email = toAuthEmail(username);
  const stablePw = toAuthPassword(username);

  // 1차: 안정적 고정 비밀번호로 시도
  try {
    const cred = await signInWithEmailAndPassword(auth, email, stablePw);
    return cred.user;
  } catch (e) {
    if (e.code === "auth/user-not-found" || e.code === "auth/invalid-credential") {
      // Firebase Auth 계정 없음 → 고정 비밀번호로 신규 생성
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, stablePw);
        return cred.user;
      } catch { return null; }
    }
    // 계정은 있으나 구 비밀번호 스킴으로 생성된 경우 (마이그레이션) → null 반환, 앱은 로컬 인증으로 진행
    // Firebase Auth 토큰이 캐시되어 있으면 Firestore 쓰기는 계속 동작함
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

export { db, auth, doc, setDoc, onSnapshot, runTransaction, firebaseSignIn, firebaseSignInAnon, firebaseLogout, onAuthStateChanged };
