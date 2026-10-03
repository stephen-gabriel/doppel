import { z } from "zod";
import { ClusterSchema, TransferEventSchema } from "./schemas.ts";

export const MonitorSnapshotSchema = z.object({
  version: z.literal(1),
  sessionId: z.string().max(100),
  source: z.object({ cluster: ClusterSchema, origin: z.enum(["synthetic", "chain"]),
    mode: z.enum(["replay", "live", "historical"]), provider: z.string().max(100) }),
  state: z.enum(["backfilling", "running", "disconnected", "completed", "stopped", "error"]),
  startedAt: z.number(), heartbeatAt: z.number(),
  watchCount: z.number().int().min(1).max(5),
  assets: z.array(z.string()).max(5),
  historyWindowHours: z.number().positive(),
  coverage: z.literal("partial"),
  warnings: z.array(z.string().max(500)).max(20),
  metrics: z.object({
    received: z.number().int().nonnegative(), retained: z.number().int().nonnegative(),
    duplicates: z.number().int().nonnegative(), ignored: z.number().int().nonnegative(),
    evicted: z.number().int().nonnegative(), reconnects: z.number().int().nonnegative(),
    restarts: z.number().int().nonnegative(), lastSlot: z.number().int().nullable(),
    cursor: z.number().int().nonnegative(), processingSamples: z.number().int().nonnegative(),
    processingMeanMs: z.number().nonnegative(),
  }),
  gaps: z.array(z.object({ id: z.number().int(), reason: z.string().max(300),
    openedAt: z.number(), recoveredAt: z.number().nullable() })).max(50),
  findings: z.array(z.object({ id: z.string().max(250), wallet: z.string(), destination: z.string(),
    label: z.literal("suspected_poisoning"), ruleVersion: z.string(), detectedAt: z.number(),
    evidence: z.array(TransferEventSchema).max(20) })).max(100),
});
export type MonitorSnapshot = z.infer<typeof MonitorSnapshotSchema>;
