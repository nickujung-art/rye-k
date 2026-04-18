import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, onSnapshot } from "firebase/firestore";
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

async function firebaseSignIn(username, password) {
  const email = toAuthEmail(username);
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  } catch (e) {
    if (e.code === "auth/user-not-found" || e.code === "auth/invalid-credential") {
      try {
        const paddedPw = password.length < 6 ? password + "!ryek" : password;
        const cred = await createUserWithEmailAndPassword(auth, email, paddedPw);
        return cred.user;
      } catch (createErr) {
        console.error("Firebase Auth create failed:", createErr);
        // Try sign in with padded password (already created with padding)
        try {
          const cred2 = await signInWithEmailAndPassword(auth, email, password + "!ryek");
          return cred2.user;
        } catch (e3) { return null; }
      }
    }
    // Might have been created with padded pw
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password + "!ryek");
      return cred.user;
    } catch (e2) { return null; }
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

export { db, auth, doc, setDoc, onSnapshot, firebaseSignIn, firebaseSignInAnon, firebaseLogout, onAuthStateChanged };
