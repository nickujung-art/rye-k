import { verifyToken } from "../ai/_utils/auth.js";
import { SignJWT, importPKCS8 } from "jose";

const FIREBASE_PROJECT_ID = "rye-k-center";
const FIREBASE_API_KEY = "AIzaSyDViGzxa0o1tqqX6fGr46Sfiews-ieGmks";

// Google OAuth2 Access Token 취득 (서비스 계정 JWT → Bearer token)
async function getGoogleAccessToken(env) {
  const sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);
  const privateKey = await importPKCS8(sa.private_key, "RS256");
  const now = Math.floor(Date.now() / 1000);
  const jwt = await new SignJWT({
    iss: sa.client_email,
    sub: sa.client_email,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    scope: [
      "https://www.googleapis.com/auth/identitytoolkit",
      "https://www.googleapis.com/auth/datastore",
    ].join(" "),
  })
    .setProtectedHeader({ alg: "RS256" })
    .sign(privateKey);

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth2:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const { access_token, error } = await resp.json();
  if (error) throw new Error(`Google OAuth 오류: ${error}`);
  return access_token;
}

// Firestore REST API로 rye-teachers 조회
async function fetchTeachers(accessToken) {
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/appData/rye-teachers`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!resp.ok) throw new Error(`Firestore 조회 실패: ${resp.status}`);
  const data = await resp.json();
  // rye-teachers 문서는 { value: Teacher[] } 구조로 저장됨
  const values = data.fields?.value?.arrayValue?.values || [];
  return values.map((v) => v.mapValue?.fields || {});
}

// Firestore 필드 값 추출 헬퍼
function strField(f) {
  return f?.stringValue || "";
}

// Firebase Auth REST — Custom Claims 설정
async function setCustomClaims(uid, claims, accessToken) {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${FIREBASE_API_KEY}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      localId: uid,
      customAttributes: JSON.stringify(claims),
    }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(`Custom Claims 설정 실패: ${resp.status} ${JSON.stringify(err)}`);
  }
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // 1. Firebase ID Token 검증 (email 사용자만 허용)
  const payload = await verifyToken(request);
  if (!payload) {
    return new Response("Unauthorized", { status: 401 });
  }
  // 익명 사용자 차단
  if (payload.firebase?.sign_in_provider !== "password") {
    return new Response("Unauthorized: email 로그인 전용", { status: 401 });
  }

  const uid = payload.sub;
  const email = payload.email || "";

  try {
    const accessToken = await getGoogleAccessToken(env);

    // 2. admin 특수 처리 — rye-teachers 조회 없이 바로 admin claim 부여
    //    admin 계정은 username="admin" → email="admin@ryek.app"
    if (email === "admin@ryek.app") {
      await setCustomClaims(uid, { role: "admin", teacherId: "admin" }, accessToken);
      return new Response(JSON.stringify({ ok: true, role: "admin" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // 3. rye-teachers에서 email의 username 부분으로 강사 조회
    //    Firebase email = "${username}@ryek.app" → username = email.split("@")[0]
    const username = email.split("@")[0];
    const teachers = await fetchTeachers(accessToken);
    const teacher = teachers.find((f) => strField(f.username) === username);

    if (!teacher) {
      // 강사 레코드 없음 — 기본 role=teacher 부여
      await setCustomClaims(uid, { role: "teacher", teacherId: "" }, accessToken);
      return new Response(JSON.stringify({ ok: true, role: "teacher", note: "teacher record not found" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const role = strField(teacher.role) || "teacher";
    const teacherId = strField(teacher.id) || "";

    await setCustomClaims(uid, { role, teacherId }, accessToken);

    return new Response(JSON.stringify({ ok: true, role, teacherId }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[set-role] 오류:", e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
