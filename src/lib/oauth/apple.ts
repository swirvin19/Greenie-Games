import { createRemoteJWKSet, importPKCS8, jwtVerify, SignJWT } from "jose";
import type { OAuthProfile } from "./google";

const AUTH_URL = "https://appleid.apple.com/auth/authorize";
const TOKEN_URL = "https://appleid.apple.com/auth/token";
const KEYS_URL = "https://appleid.apple.com/auth/keys";

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function appleJwks() {
  return (jwks ??= createRemoteJWKSet(new URL(KEYS_URL)));
}

export function appleAuthUrl(state: string) {
  const params = new URLSearchParams({
    client_id: requireEnv("APPLE_CLIENT_ID"),
    redirect_uri: requireEnv("APPLE_REDIRECT_URI"),
    response_type: "code",
    scope: "name email",
    response_mode: "form_post", // Apple POSTs the callback instead of redirecting with a query string
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

// Apple doesn't accept a static client secret — it wants a short-lived
// ES256 JWT signed with the private key from your "Sign in with Apple"
// key (the .p8 file), minted fresh per token request.
async function appleClientSecret(): Promise<string> {
  const pem = requireEnv("APPLE_PRIVATE_KEY").replace(/\\n/g, "\n");
  const key = await importPKCS8(pem, "ES256");
  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: requireEnv("APPLE_KEY_ID") })
    .setIssuer(requireEnv("APPLE_TEAM_ID"))
    .setIssuedAt()
    .setExpirationTime("5m")
    .setAudience("https://appleid.apple.com")
    .setSubject(requireEnv("APPLE_CLIENT_ID"))
    .sign(key);
}

export async function exchangeAppleCode(code: string): Promise<OAuthProfile> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: requireEnv("APPLE_CLIENT_ID"),
      client_secret: await appleClientSecret(),
      redirect_uri: requireEnv("APPLE_REDIRECT_URI"),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Apple token exchange failed: ${await res.text()}`);
  const data = (await res.json()) as { id_token: string };

  const { payload } = await jwtVerify(data.id_token, appleJwks(), {
    issuer: "https://appleid.apple.com",
    audience: requireEnv("APPLE_CLIENT_ID"),
  });

  return {
    sub: payload.sub as string,
    // Apple only includes email (and only ever includes name, separately,
    // in the form-post `user` field) on the very first authorization for
    // a given user + client. Returning sign-ins carry neither — callers
    // must key off `sub`, not email, for anyone but a first-time signup.
    email: payload.email as string | undefined,
    emailVerified: payload.email_verified === true || payload.email_verified === "true",
  };
}

/** Parses the one-time `user` form field Apple sends alongside the first authorization. */
export function parseAppleUserField(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as { name?: { firstName?: string; lastName?: string } };
    const name = [parsed.name?.firstName, parsed.name?.lastName].filter(Boolean).join(" ");
    return name || undefined;
  } catch {
    return undefined;
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var ${name}`);
  return value;
}
