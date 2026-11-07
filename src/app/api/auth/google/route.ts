import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import { googleEnabled, googleRedirectUri } from "@/features/auth/social";

const cookie = { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/api/auth/google", maxAge: 600 } as const;

/**
 * Start "Sign in with Google": a one-time state cookie, then off to Google's consent screen.
 * `?link=1` (My account → Link Google, signed in) links the Google account to the current user instead.
 */
export async function GET(req: NextRequest) {
  if (!googleEnabled()) return NextResponse.redirect(new URL("/login?error=google", await googleRedirectUri()));
  const state = randomBytes(16).toString("base64url");
  const store = await cookies();
  store.set("oauth_state", state, cookie);
  if (req.nextUrl.searchParams.get("link") === "1" && (await getCurrentUser())) store.set("oauth_link", "1", cookie);
  else store.delete({ name: "oauth_link", path: "/api/auth/google" });
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
