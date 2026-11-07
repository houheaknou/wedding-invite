import { createHash, createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { telegramProfile } from "@/features/auth/social";

// A made-up bot token: only used to sign test payloads the same way Telegram does.
const TOKEN = "123456:TEST-token-for-unit-tests";

function signed(fields: Record<string, string>) {
  const check = Object.entries(fields)
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("\n");
  const secret = createHash("sha256").update(TOKEN).digest();
  const hash = createHmac("sha256", secret).update(check).digest("hex");
  return new URLSearchParams({ ...fields, hash });
}

const now = () => String(Math.floor(Date.now() / 1000));

describe("telegramProfile", () => {
  beforeEach(() => vi.stubEnv("TELEGRAM_BOT_TOKEN", TOKEN));
  afterEach(() => vi.unstubAllEnvs());

  it("accepts a correctly signed, fresh login", () => {
    const p = telegramProfile(signed({ id: "42", first_name: "Sok", last_name: "Dara", auth_date: now() }));
    expect(p).toEqual({ provider: "telegram", id: "42", name: "Sok Dara" });
  });

  it("falls back to the username for the display name", () => {
    expect(telegramProfile(signed({ id: "42", username: "sokdara", auth_date: now() }))?.name).toBe("sokdara");
  });

  it("rejects a tampered field", () => {
    const params = signed({ id: "42", first_name: "Sok", auth_date: now() });
    params.set("id", "43");
    expect(telegramProfile(params)).toBeNull();
  });

  it("rejects a forged or malformed hash", () => {
    const params = signed({ id: "42", auth_date: now() });
    params.set("hash", "00".repeat(32));
    expect(telegramProfile(params)).toBeNull();
    params.set("hash", "not-hex");
    expect(telegramProfile(params)).toBeNull();
  });

  it("rejects a login older than an hour (replayed link) [review L-5]", () => {
    const at = (minutesAgo: number) => String(Math.floor(Date.now() / 1000) - minutesAgo * 60);
    expect(telegramProfile(signed({ id: "42", auth_date: at(55) }))).not.toBeNull();
    expect(telegramProfile(signed({ id: "42", auth_date: at(61) }))).toBeNull();
  });

  it("rejects a missing or non-numeric auth_date", () => {
    expect(telegramProfile(signed({ id: "42" }))).toBeNull();
    expect(telegramProfile(signed({ id: "42", auth_date: "soon" }))).toBeNull();
  });

  it("rejects everything when the bot is not configured", () => {
    const params = signed({ id: "42", auth_date: now() });
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "");
    expect(telegramProfile(params)).toBeNull();
  });
});
