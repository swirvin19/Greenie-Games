import { NextResponse } from "next/server";
import { consumeOAuthStateCookie, loginOrCreateOAuthUser } from "@/lib/auth";
import { exchangeGoogleCode } from "@/lib/oauth/google";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = await consumeOAuthStateCookie();

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(new URL("/login?error=oauth", req.url));
  }

  try {
    const profile = await exchangeGoogleCode(code);
    await loginOrCreateOAuthUser({
      provider: "google",
      providerId: profile.sub,
      email: profile.email,
      emailVerified: profile.emailVerified,
      displayName: profile.name,
    });
    return NextResponse.redirect(new URL("/dashboard", req.url));
  } catch (err) {
    console.error("Google sign-in failed:", err);
    return NextResponse.redirect(new URL("/login?error=oauth", req.url));
  }
}
