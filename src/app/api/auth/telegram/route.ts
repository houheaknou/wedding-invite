import { NextResponse, type NextRequest } from "next/server";
import { createSession } from "@/features/auth/session";
import { appOrigin, telegramProfile, userForSocial } from "@/features/auth/social";

/** The Telegram Login Widget redirects here with the signed user data (?id&first_name&…&hash). */
export async function GET(req: NextRequest) {
  const origin = await appOrigin();
  const profile = telegramProfile(req.nextUrl.searchParams);
  if (!profile) return NextResponse.redirect(`${origin}/login?error=telegram`);
  try {
    await createSession(await userForSocial(profile));
  } catch (e) {
    console.error("[telegram login]", e);
    return NextResponse.redirect(`${origin}/login?error=telegram`);
  }
  return NextResponse.redirect(`${origin}/events`);
}
