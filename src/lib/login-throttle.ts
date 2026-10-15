import { prisma } from "@/lib/prisma";

/**
 * Failed sign-in throttling (brute-force protection).
 *
 * Counters live in the database rather than in memory because the app runs on
 * Vercel, where every request may hit a different serverless instance — an
 * in-process counter would let an attacker simply spread attempts around.
 *
 * Two independent keys are tracked:
 *   - `email:<address>`  protects one account (5 misses -> 15 minute lock)
 *   - `ip:<address>`     slows password spraying across many accounts. The
 *                        threshold is deliberately much higher, because a
 *                        hospital often reaches the internet through a single
 *                        NAT address shared by all its staff.
 *
 * While a key is locked no further failures are counted for it, so hammering
 * the form cannot extend the lock indefinitely.
 */
const WINDOW_MS = 15 * 60 * 1000;
const RETENTION_MS = 24 * 60 * 60 * 1000;

const RULES = [
  { prefix: "email:", maxFailures: 5, lockMs: 15 * 60 * 1000 },
  { prefix: "ip:", maxFailures: 30, lockMs: 15 * 60 * 1000 },
] as const;

export const emailKey = (email: string) => `email:${email.trim().toLowerCase()}`;
export const ipKey = (ip: string) => `ip:${ip}`;

/** Builds the set of keys that a single sign-in attempt is subject to. */
export function throttleKeys(email: string, ip: string | null): string[] {
  return ip ? [emailKey(email), ipKey(ip)] : [emailKey(email)];
}

/** Reads the client address from the proxy headers (null outside Vercel). */
export function clientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip");
}

function ruleFor(identifier: string) {
  return RULES.find((rule) => identifier.startsWith(rule.prefix));
}

/** Latest lock expiry among the keys, or null when none is locked. */
export async function lockedUntil(identifiers: string[]): Promise<Date | null> {
  if (identifiers.length === 0) return null;

  const rows = await prisma.loginAttempt.findMany({
    where: { identifier: { in: identifiers }, lockedUntil: { gt: new Date() } },
    select: { lockedUntil: true },
  });

  const expiries = rows.map((row) => row.lockedUntil!.getTime());
  return expiries.length > 0 ? new Date(Math.max(...expiries)) : null;
}

/**
 * Counts one failed attempt for a single key and returns the lock expiry when
 * that attempt trips the rule. Never throws into the auth flow.
 */
export async function recordFailure(identifier: string): Promise<Date | null> {
  const rule = ruleFor(identifier);
  if (!rule) return null;

  try {
    const now = new Date();
    const existing = await prisma.loginAttempt.findUnique({ where: { identifier } });
    const withinWindow =
      existing?.firstFailedAt != null && now.getTime() - existing.firstFailedAt.getTime() < WINDOW_MS;
    const failures = withinWindow ? existing!.failures + 1 : 1;
    const lockedUntil = failures >= rule.maxFailures ? new Date(now.getTime() + rule.lockMs) : null;

    await prisma.loginAttempt.upsert({
      where: { identifier },
      create: { identifier, failures, firstFailedAt: now, lastFailedAt: now, lockedUntil },
      update: {
        failures,
        firstFailedAt: withinWindow ? existing!.firstFailedAt! : now,
        lastFailedAt: now,
        lockedUntil,
      },
    });

    return lockedUntil;
  } catch (error) {
    console.error("[login-throttle] failed to record attempt", error);
    return null;
  }
}

/**
 * Counts one failed attempt for every key of the attempt and returns the latest
 * lock expiry caused by it (null when nothing was locked).
 */
export async function recordFailures(identifiers: string[]): Promise<Date | null> {
  const locks = await Promise.all(identifiers.map(recordFailure));
  const expiries = locks.filter((date): date is Date => date !== null).map((date) => date.getTime());
  return expiries.length > 0 ? new Date(Math.max(...expiries)) : null;
}

/** A successful sign-in clears the counters so honest mistakes are forgiven. */
export async function clearFailures(identifiers: string[]): Promise<void> {
  try {
    await prisma.loginAttempt.deleteMany({ where: { identifier: { in: identifiers } } });
  } catch (error) {
    console.error("[login-throttle] failed to clear attempts", error);
  }
}

/**
 * Drops counters that have been idle for a day, so an attacker spraying random
 * e-mail addresses cannot grow the table forever. Best effort only.
 */
export async function pruneOldAttempts(): Promise<void> {
  try {
    await prisma.loginAttempt.deleteMany({
      where: { lastFailedAt: { lt: new Date(Date.now() - RETENTION_MS) } },
    });
  } catch (error) {
    console.error("[login-throttle] failed to prune attempts", error);
  }
}
