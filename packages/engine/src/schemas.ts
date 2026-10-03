import { z } from "zod";

export const RULE_VERSION = "0.1" as const;

export const ClusterSchema = z.enum(["mainnet-beta", "devnet", "local-test"]);
export const DraftClusterSchema = z.enum(["mainnet-beta", "devnet"]);
export const OriginSchema = z.enum(["chain", "synthetic"]);
export const ObservationModeSchema = z.enum(["live", "historical", "replay"]);
export const ContinuitySchema = z.enum([
  "exact",
  "mismatch",
  "unconfirmed",
  "not_selected",
]);
export const PatternSchema = z.enum([
  "suspected_poisoning",
  "resemblance_only",
  "none_observed",
  "unknown",
]);
export const CoverageStatusSchema = z.enum([
  "complete_within_scope",
  "partial",
  "unavailable",
]);
export const ActionSchema = z.enum([
  "pause",
  "review",
  "ready_for_confirmation",
]);
export const ConfirmationStatusSchema = z.enum(["unconfirmed", "confirmed"]);
export const ResolutionSchema = z.enum([
  "resolved",
  "unsupported",
  "unresolved",
]);
export const IntegerAmountSchema = z.string().regex(/^\d+$/);

export const DraftSchema = z.object({
  cluster: DraftClusterSchema,
  sender: z.string(),
  recipientId: z.string().nullable(),
  recipientRevision: z.number().int().nonnegative().nullable(),
  destination: z.string(),
  asset: z.string().min(1),
  amountRaw: IntegerAmountSchema,
});

export const RecipientAddressChangeSchema = z.object({
  address: z.string(),
  revision: z.number().int().positive(),
  changedAt: z.number().int().nonnegative(),
});

export const RecipientRecordSchema = z.object({
  id: z.string().min(1),
  cluster: ClusterSchema,
  address: z.string(),
  label: z.string(),
  confirmationStatus: ConfirmationStatusSchema,
  confirmationMethod: z.string().nullable(),
  confirmedAt: z.number().int().nonnegative().nullable(),
  revision: z.number().int().positive(),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
  addressHistory: z.array(RecipientAddressChangeSchema),
});

export const TransferEventSchema = z.object({
  id: z.string().min(1),
  cluster: ClusterSchema,
  signature: z.string().min(1),
  slot: z.number().int().nonnegative(),
  instructionPath: z.string().min(1),
  blockTime: z.number().int().nullable(),
  observedAt: z.number().int().nonnegative(),
  fromOwner: z.string().nullable(),
  toOwner: z.string().nullable(),
  sourceTokenAccount: z.string().optional(),
  destinationTokenAccount: z.string().optional(),
  asset: z.string().min(1),
  amountRaw: IntegerAmountSchema,
  decimals: z.number().int().nonnegative(),
  resolution: ResolutionSchema,
});

export const CoverageEnvelopeSchema = z.object({
  status: CoverageStatusSchema,
  wallet: z.string(),
  cluster: ClusterSchema,
  origin: OriginSchema,
  mode: ObservationModeSchema,
  provider: z.string().nullable(),
  ruleVersion: z.literal(RULE_VERSION),
  checkedAt: z.number().int().nonnegative(),
  requestedFrom: z.number().int().nullable(),
  requestedTo: z.number().int().nullable(),
  observedFrom: z.number().int().nullable(),
  observedTo: z.number().int().nullable(),
  lastEvaluatedSlot: z.number().int().nullable(),
  requestedTransactionCount: z.number().int().nonnegative(),
  fetchedTransactionCount: z.number().int().nonnegative(),
  tokenAccountDiscovery: z.enum(["complete", "partial", "unavailable", "not_applicable"]),
  unsupportedEventCount: z.number().int().nonnegative(),
  unresolvedEventCount: z.number().int().nonnegative(),
  limitReason: z.string().nullable(),
  cacheAgeSeconds: z.number().nonnegative().nullable(),
  warnings: z.array(z.string()),
});

export const FactRefSchema = z.object({
  value: z.boolean(),
  eventIds: z.array(z.string()),
});

export const EvidenceFactSchema = z.object({
  code: z.string(),
  eventIds: z.array(z.string()),
  detail: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
});

export const CheckResultSchema = z.object({
  continuity: ContinuitySchema,
  pattern: PatternSchema,
  coverage: CoverageStatusSchema,
  action: ActionSchema,
  previouslyPaid: FactRefSchema,
  incomingOnly: FactRefSchema,
  reasonCodes: z.array(z.string()),
  evidence: z.array(EvidenceFactSchema),
  ruleVersion: z.literal(RULE_VERSION),
});

export const RuleConfigSchema = z.object({
  ruleVersion: z.literal(RULE_VERSION),
  dustSolMaxLamports: z.bigint(),
  dustUsdcMaxRaw: z.bigint(),
  patternWindowHours: z.number().positive(),
});

export type Cluster = z.infer<typeof ClusterSchema>;
export type Draft = z.infer<typeof DraftSchema>;
export type RecipientRecord = z.infer<typeof RecipientRecordSchema>;
export type TransferEvent = z.infer<typeof TransferEventSchema>;
export type CoverageEnvelope = z.infer<typeof CoverageEnvelopeSchema>;
export type CheckResult = z.infer<typeof CheckResultSchema>;
export type RuleConfig = z.infer<typeof RuleConfigSchema>;
export type Continuity = z.infer<typeof ContinuitySchema>;
export type Pattern = z.infer<typeof PatternSchema>;
export type CoverageStatus = z.infer<typeof CoverageStatusSchema>;
export type Action = z.infer<typeof ActionSchema>;
export type EvidenceFact = z.infer<typeof EvidenceFactSchema>;
