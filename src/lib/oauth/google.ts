import { createRemoteJWKSet, jwtVerify } from "jose";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function googleJwks() {
  return (jwks ??= createRemoteJWKSet(new URL(JWKS_URL)));
}

export function googleAuthUrl(state: string) {
  const params = new URLSearchParams({
    client_id: requireEnv("GOOGLE_CLIENT_ID"),
    redirect_uri: requireEnv("GOOGLE_REDIRECT_URI"),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export interface OAuthProfile {
  sub: string;
  email?: string;
  emailVerified: boolean;
  name?: string;
}

export async function exchangeGoogleCode(code: string): Promise<OAuthProfile> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: requireEnv("GOOGLE_CLIENT_ID"),
      client_secret: requireEnv("GOOGLE_CLIENT_SECRET"),
      redirect_uri: requireEnv("GOOGLE_REDIRECT_URI"),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${await res.text()}`);
  const data = (await res.json()) as { id_token: string };

  const { payload } = await jwtVerify(data.id_token, googleJwks(), {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: requireEnv("GOOGLE_CLIENT_ID"),
  });

  return {
    sub: payload.sub as string,
    email: payload.email as string | undefined,
    emailVerified: payload.email_verified === true,
    name: payload.name as string | undefined,
  };
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var ${name}`);
  return value;
}
