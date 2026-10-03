import { MonitorSnapshotSchema } from "@doppel/engine";
import { capturedMonitorResponse, monitorUnavailable } from "../../../lib/monitor-capture";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  // Never proxy arbitrary URLs or expose a deployed host's localhost by default.
  if (process.env.NODE_ENV === "production" && process.env.MONITOR_LOCAL_ENABLED !== "1") {
    return Response.json(monitorUnavailable("Live monitoring is not configured on this deployment."), { headers });
  }
  const port = Number(process.env.MONITOR_PORT ?? 4318);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    return Response.json(monitorUnavailable("Live monitor configuration is unavailable."), { headers });
  }
  try {
    const response = await fetch(`http://127.0.0.1:${port}/snapshot`, { cache: "no-store", signal: AbortSignal.timeout(2000) });
    if (!response.ok) throw new Error("worker_unavailable");
    // Bound the response even for a broken/misconfigured local worker.
    const reader = response.body?.getReader();
    if (!reader) throw new Error("empty_snapshot");
    let text = ""; let bytes = 0;
    const decoder = new TextDecoder();
    try {
      while (true) {
        const next = await reader.read();
        if (next.done) break;
        bytes += next.value.byteLength;
        if (bytes > 2_000_000) throw new Error("snapshot_too_large");
        text += decoder.decode(next.value, { stream: true });
      }
      text += decoder.decode();
    } finally { await reader.cancel(); }
    const snapshot = MonitorSnapshotSchema.parse(JSON.parse(text));
    const stale = Date.now() - snapshot.heartbeatAt > 30_000 || snapshot.heartbeatAt > Date.now() + 5000;
    if ((stale || ["disconnected", "stopped", "error"].includes(snapshot.state)) && snapshot.source.origin === "chain") {
      const captured = capturedMonitorResponse();
      if (captured) return Response.json(captured, { headers });
    }
    return Response.json({ status: stale ? "stale" : "available", snapshot }, { headers });
  } catch {
    return Response.json(monitorUnavailable("Live worker is unavailable."), { headers });
  }
}
