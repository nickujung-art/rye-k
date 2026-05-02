import { jwtVerify, createRemoteJWKSet } from "jose";

const PROJECT_ID = "rye-k-center";
const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
);

// Returns the verified JWT payload, or null if verification fails.
// Rejects anonymous and unauthenticated Firebase users.
export async function verifyToken(request) {
  const auth = request.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${PROJECT_ID}`,
      audience: PROJECT_ID,
    });
    const signInProvider = payload?.firebase?.sign_in_provider;
    if (!signInProvider || signInProvider === "anonymous") return null;
    return payload;
  } catch {
    return null;
  }
}
