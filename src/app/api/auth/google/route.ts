import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { googleEnabled, googleRedirectUri } from "@/lib/social-auth";

/** Start "Sign in with Google": a one-time state cookie, then off to Google's consent screen. */
export async function GET() {
  if (!googleEnabled()) return NextResponse.redirect(new URL("/login?error=google", await googleRedirectUri()));
  const state = randomBytes(16).toString("base64url");
  (await cookies()).set("oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth/google",
    maxAge: 600,
  });
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: await googleRedirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  }).toString();
  return NextResponse.redirect(url);
}
