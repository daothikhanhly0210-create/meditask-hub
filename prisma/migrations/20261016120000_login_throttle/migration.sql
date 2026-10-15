-- Failed sign-in counters (brute-force protection).
-- Kept in the database so the limit holds across all serverless instances.
CREATE TABLE "login_attempts" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "failures" INTEGER NOT NULL DEFAULT 0,
    "firstFailedAt" TIMESTAMP(3),
    "lastFailedAt" TIMESTAMP(3),
    "lockedUntil" TIMESTAMP(3),

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "login_attempts_identifier_key" ON "login_attempts"("identifier");

CREATE INDEX "login_attempts_lastFailedAt_idx" ON "login_attempts"("lastFailedAt");

CREATE INDEX "login_attempts_lockedUntil_idx" ON "login_attempts"("lockedUntil");
