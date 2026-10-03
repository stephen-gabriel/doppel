import { MonitorSnapshotSchema } from "@doppel/engine";
import bundle from "../data/monitor-capture.json";

/** Build-bundled export survives worker downtime and serverless restarts. */
export function capturedMonitorResponse(value: unknown = bundle) {
  if (!value || typeof value !== "object") return null;
  const record = value as { version?: unknown; capturedAt?: unknown; snapshot?: unknown };
  if (record.version !== 1 || typeof record.capturedAt !== "number" || !Number.isFinite(record.capturedAt) || record.capturedAt <= 0) return null;
  const result = MonitorSnapshotSchema.safeParse(record.snapshot);
  if (!result.success || result.data.source.origin !== "chain" || result.data.source.cluster !== "mainnet-beta"
    || result.data.source.mode === "replay") return null;
  return { status: "captured" as const, capturedAt: record.capturedAt,
    message: "Live monitoring is unavailable. These are previously captured mainnet observations, not current activity.",
    snapshot: { ...result.data, source: { ...result.data.source, mode: "historical" as const }, state: "stopped" as const } };
}

export function monitorUnavailable(message: string) {
  return capturedMonitorResponse() ?? { status: "offline" as const,
    message: `${message} No verified mainnet capture is bundled yet. Address checks and the address book remain available.` };
}
