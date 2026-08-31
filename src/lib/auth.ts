import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "greeni_session";
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "insecure-dev-secret-do-not-use-in-production"
);

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(userId: string) {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

/** Sets the web session cookie and returns the same token for API clients (the Expo app) to store themselves. */
export async function setSessionCookie(userId: string): Promise<string> {
  const token = await createSessionToken(userId);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return token;
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/**
 * Sessions come from two places: an httpOnly cookie (the web app) or an
 * `Authorization: Bearer <token>` header (the Expo app — a native client
 * has no shared browser cookie jar, so it stores the token itself, e.g. in
 * expo-secure-store, and sends it back on every request instead). Both
 * carry the same JWT produced by createSessionToken; the cookie is tried
 * first since it's the common case, the header is the mobile fallback.
 */
export async function getSessionUserId(): Promise<string | null> {
  const store = await cookies();
  const cookieToken = store.get(SESSION_COOKIE)?.value;

  let token = cookieToken;
  if (!token) {
    const headerStore = await headers();
    const auth = headerStore.get("authorization");
    if (auth?.startsWith("Bearer ")) token = auth.slice("Bearer ".length);
  }

  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const userId = await getSessionUserId();
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId } });
}

export async function requireUserId(): Promise<string> {
  const userId = await getSessionUserId();
  if (!userId) throw new AuthError("Not authenticated");
  return userId;
}

export class AuthError extends Error {}

const OAUTH_STATE_COOKIE = "greeni_oauth_state";

/** CSRF guard for the OAuth redirect round-trip: a random value stashed in a cookie and echoed back as `state`. */
export async function setOAuthStateCookie(state: string) {
  const store = await cookies();
  store.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });
}

export async function consumeOAuthStateCookie(): Promise<string | null> {
  const store = await cookies();
  const value = store.get(OAUTH_STATE_COOKIE)?.value ?? null;
  store.delete(OAUTH_STATE_COOKIE);
  return value;
}

/**
 * Finds or creates the User for an OAuth identity and starts their session.
 * Matches on (authProvider, authProviderId) first — the only thing Apple
 * guarantees on a returning sign-in — and only falls back to matching an
 * existing account by email when the provider vouches the email is
 * verified, so an unverified email can't be used to take over an account.
 */
export async function loginOrCreateOAuthUser(opts: {
  provider: "google" | "apple";
  providerId: string;
  email?: string | null;
  emailVerified?: boolean;
  displayName?: string | null;
}) {
  let user = await prisma.user.findFirst({
    where: { authProvider: opts.provider, authProviderId: opts.providerId },
  });

  if (!user && opts.email && opts.emailVerified) {
    const existing = await prisma.user.findUnique({ where: { email: opts.email } });
    if (existing) {
      user = await prisma.user.update({
        where: { id: existing.id },
        data: { authProvider: opts.provider, authProviderId: opts.providerId },
      });
    }
  }

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: opts.email ?? undefined,
        displayName: opts.displayName || opts.email?.split("@")[0] || "Golfer",
        authProvider: opts.provider,
        authProviderId: opts.providerId,
        progress: { create: {} },
      },
    });
  }

  await setSessionCookie(user.id);
  return user;
}
