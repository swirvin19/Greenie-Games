import { NextResponse } from "next/server";
import { consumeOAuthStateCookie, loginOrCreateOAuthUser } from "@/lib/auth";
import { exchangeAppleCode, parseAppleUserField } from "@/lib/oauth/apple";

// Apple posts this endpoint (response_mode=form_post) instead of redirecting
// with a query string, so this reads form data, not search params — and
// redirects use 303 so the browser follows up with a GET, not a re-POST.
export async function POST(req: Request) {
  const form = await req.formData();
  const code = form.get("code")?.toString();
  const state = form.get("state")?.toString();
  const expectedState = await consumeOAuthStateCookie();

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(new URL("/login?error=oauth", req.url), 303);
  }

  try {
    const profile = await exchangeAppleCode(code);
    const displayName = parseAppleUserField(form.get("user")?.toString());
    await loginOrCreateOAuthUser({
      provider: "apple",
      providerId: profile.sub,
      email: profile.email,
      emailVerified: profile.emailVerified,
      displayName,
    });
    return NextResponse.redirect(new URL("/dashboard", req.url), 303);
  } catch (err) {
    console.error("Apple sign-in failed:", err);
    return NextResponse.redirect(new URL("/login?error=oauth", req.url), 303);
  }
}
