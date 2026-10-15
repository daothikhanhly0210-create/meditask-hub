import type { Prisma } from "@prisma/client";

/**
 * Sequence codes shared by the work-order and meeting modules. Both use a
 * per-year, zero-padded counter (PGV-2026-001 / BB-2026-001). The next value is
 * derived from existing rows rather than a dedicated counter table, so a
 * concurrent insert is handled by the caller retrying on a unique violation.
 */
function nextCode(prefix: string, codes: string[]): string {
  let max = 0;
  for (const code of codes) {
    const parsed = Number.parseInt(code.slice(prefix.length), 10);
    if (!Number.isNaN(parsed) && parsed > max) max = parsed;
  }
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

export async function nextWorkOrderCode(tx: Prisma.TransactionClient): Promise<string> {
  const prefix = `PGV-${new Date().getFullYear()}-`;
  const rows = await tx.workOrder.findMany({
    where: { code: { startsWith: prefix } },
    select: { code: true },
  });
  return nextCode(prefix, rows.map((row) => row.code));
}

export async function nextMeetingCode(tx: Prisma.TransactionClient): Promise<string> {
  const prefix = `BB-${new Date().getFullYear()}-`;
  const rows = await tx.meeting.findMany({
    where: { code: { startsWith: prefix } },
    select: { code: true },
  });
  return nextCode(prefix, rows.map((row) => row.code));
}
