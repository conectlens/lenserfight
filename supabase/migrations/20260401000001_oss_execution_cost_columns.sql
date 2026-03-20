-- M1: Add credit cost tracking columns to execution.runs
-- Purpose: Track platform credit charges on execution runs (OSS-safe, no wallet dependency)
-- Self-hosted mode: billing_status stays 'free' forever, credit_cost stays NULL

ALTER TABLE "execution"."runs"
  ADD COLUMN "credit_cost"    bigint           NULL,
  ADD COLUMN "billing_status" "text" NOT NULL DEFAULT 'free';

ALTER TABLE "execution"."runs"
  ADD CONSTRAINT "runs_billing_status_check"
    CHECK ("billing_status" IN ('pending', 'charged', 'failed', 'free'));

COMMENT ON COLUMN "execution"."runs"."credit_cost" IS 'Platform credits charged for this run. NULL = not billed. Managed by CF Worker (service_role).';
COMMENT ON COLUMN "execution"."runs"."billing_status" IS 'Billing lifecycle: free (default/self-hosted), pending (charge initiated), charged (wallet debited), failed (insufficient balance).';

-- Partial index: only index non-free runs (the vast majority will be free on self-hosted)
CREATE INDEX "idx_exec_runs_billing_status"
  ON "execution"."runs" ("billing_status", "created_at" DESC)
  WHERE "billing_status" != 'free';
