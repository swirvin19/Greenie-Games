import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Lets the Expo app call this API from a different origin (native fetch
// isn't browser-CORS-restricted, but Expo's web target and local testing
// are). Permissive by design: auth here is a Bearer token the client holds,
// not a cookie, so there's no session to leak via a wildcard origin the
// way there would be with credentialed cookie-based CORS.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function proxy(request: NextRequest) {
  if (request.method === "OPTIONS") {
    return NextResponse.json({}, { headers: corsHeaders });
  }

  const response = NextResponse.next();
  for (const [key, value] of Object.entries(corsHeaders)) {
    response.headers.set(key, value);
  }
  return response;
}

export const config = {
  matcher: "/api/:path*",
};
