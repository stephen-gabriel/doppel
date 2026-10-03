"use client";

import { useEffect, useState } from "react";
import { MonitorSnapshotSchema, type MonitorSnapshot } from "@doppel/engine";
import { TwinPanel } from "../../components/TwinPanel";
import { EvidenceTimeline } from "../../components/EvidenceTimeline";

export default function MonitorPage() {
  const [snapshot, setSnapshot] = useState<MonitorSnapshot | null>(null);
  const [status, setStatus] = useState<"loading" | "available" | "stale" | "offline" | "captured">("loading");
  const [notice, setNotice] = useState<string | null>(null);
  const [capturedAt, setCapturedAt] = useState<number | null>(null);
  const [clock, setClock] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const response = await fetch("/api/monitor", { cache: "no-store", signal: controller.signal });
        const data = await response.json() as { status?: string; snapshot?: unknown; message?: string; capturedAt?: number };
        if (controller.signal.aborted) return;
        setNotice(data.message ?? null); setCapturedAt(data.capturedAt ?? null);
        if (response.ok && (data.status === "available" || data.status === "stale" || data.status === "captured")) {
          setSnapshot(MonitorSnapshotSchema.parse(data.snapshot)); setStatus(data.status);
        } else setStatus("offline");
      } catch { if (!controller.signal.aborted) setStatus("offline"); }
      if (!controller.signal.aborted) { setClock(Date.now()); timer = setTimeout(() => void poll(), 5000); }
    }
    void poll();
    return () => { controller.abort(); clearTimeout(timer); };
  }, []);
  const age = snapshot ? Math.max(0, Math.floor((clock - snapshot.heartbeatAt) / 1000)) : null;
  const stale = status !== "available" || (age !== null && age > 30);
  const replay = snapshot?.source.mode === "replay";
  const live = snapshot?.source.origin === "chain" && snapshot.source.mode === "live" && snapshot.state === "running" && !stale;
  const openGaps = snapshot?.gaps.filter((gap) => gap.recoveredAt === null) ?? [];
  return <section className="space-y-5">
    <div>
      <h1 className="text-[32px] leading-[38px] font-medium">Focused wallet monitor</h1>
      <p className="mt-3 text-muted">Follow suspicious lookalike activity for a small watchlist. This view shows exactly what the worker has processed—not all of Solana.</p>
    </div>
    <div role="status" className="rounded-[12px] border border-line bg-raised p-4">
      <p className="font-medium">{status === "loading" ? "Checking monitoring availability…" : status === "captured" ? "Captured mainnet observations · not live" : !snapshot ? "Monitor offline" : stale ? "Worker offline or stale — last captured snapshot" : replay ? "Synthetic replay · not live mainnet" : live ? "Live chain monitoring" : "Historical or paused monitoring"}</p>
      {snapshot ? <p className="mt-2 text-sm text-muted">Source: {snapshot.source.provider} · {snapshot.source.origin} · {snapshot.source.mode}.
        Worker: {snapshot.state}. Last heartbeat {age ?? 0}s ago.</p> : <p className="mt-2 text-muted">Start the local worker in another terminal to see a labelled replay. Your address book and checks work independently.</p>}
      {notice ? <p className="mt-2 text-sm text-muted">{notice}</p> : null}
      {capturedAt ? <p className="mt-2 text-sm text-muted">Capture exported: {new Date(capturedAt).toISOString()}. Original worker heartbeat: {snapshot ? new Date(snapshot.heartbeatAt).toISOString() : "unknown"}.</p> : null}
      <p className="mt-2 text-sm text-muted">Address checks and your address book do not depend on this stream. {replay ? "Replay findings are synthetic examples, not attacks detected on the real network." : "Historical observations are labelled and are never shown as new live detections."}</p>
    </div>
    <details className="rounded-[12px] bg-ink p-4" open={!snapshot}>
      <summary className="cursor-pointer text-iris">Run the local replay</summary>
      <p className="mt-3 text-sm text-muted">In the project root, keep this running alongside the website. No wallet, RPC key, transaction or payment required.</p>
      <pre className="mt-3 overflow-x-auto rounded-lg bg-raised p-3 text-sm">pnpm --filter @doppel/worker replay</pre>
      <p className="mt-2 text-sm text-muted">The bundled sequence deliberately contains duplicates, late arrivals and a simulated disconnect. SQLite remembers progress across restarts. Completed replays do not restart automatically.</p>
    </details>
    {snapshot ? <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[["Watched wallets", snapshot.watchCount], ["Retained transfers", snapshot.metrics.retained],
          ["Duplicate deliveries ignored", snapshot.metrics.duplicates], ["Suspected patterns in retained history", snapshot.findings.length]].map(([label, value]) =>
          <div key={label} className="rounded-[12px] border border-line p-4"><p className="text-2xl font-medium">{value}</p><p className="mt-1 text-sm text-muted">{label}</p></div>)}
      </div>
      <div className="rounded-[12px] bg-raised p-4">
        <h2 className="text-xl">Coverage is partial</h2>
        <p className="mt-2 text-muted">Retention window: {snapshot.historyWindowHours} hours of event time. Supported assets: SOL and canonical USDC. {openGaps.length} open coverage gaps.</p>
        {snapshot.warnings.map((warning) => <p key={warning} className="mt-2 text-sm text-muted">{warning}</p>)}
        {snapshot.gaps.length ? <details className="mt-3"><summary className="cursor-pointer text-iris">Recovery and coverage log</summary>
          <ul className="mt-2 space-y-2">{snapshot.gaps.map((gap) => <li key={gap.id} className="text-sm">
            {gap.recoveredAt === null ? "Open" : "Recovered in this source"}: {gap.reason}
          </li>)}</ul>
        </details> : null}
      </div>
      <div className="space-y-3">
        <h2 className="text-xl">{replay ? "Replay findings" : "Observed findings"}</h2>
        {snapshot.findings.length === 0 ? <p className="text-muted">No suspected pattern in the retained history. This is not a safety verdict.</p> : snapshot.findings.map((finding) => {
          const reference = finding.evidence.find((event) => event.fromOwner === finding.wallet && event.toOwner !== finding.destination)?.toOwner;
          return <details key={finding.id} className="rounded-[12px] border border-line bg-ink p-4">
            <summary className="cursor-pointer">Suspected lookalike pattern · {finding.wallet.slice(0, 4)}…{finding.wallet.slice(-4)} · {replay ? "synthetic replay" : "needs review"}</summary>
            <p className="my-3 text-sm text-muted">Rule {finding.ruleVersion}. This is a heuristic finding, not proof of theft or malicious identity.</p>
            {reference ? <TwinPanel leftLabel="Previously paid address" left={reference} rightLabel="Incoming lookalike" right={finding.destination} /> : null}
            <div className="mt-3"><EvidenceTimeline events={finding.evidence} sender={finding.wallet} /></div>
          </details>;
        })}
      </div>
      <details className="rounded-[12px] border border-line p-4"><summary className="cursor-pointer text-iris">Pipeline health and counters</summary>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <dt>Deliveries received</dt><dd>{snapshot.metrics.received}</dd>
          <dt>Out-of-scope events</dt><dd>{snapshot.metrics.ignored}</dd>
          <dt>Evicted events</dt><dd>{snapshot.metrics.evicted}</dd>
          <dt>Disconnect/recovery cycles</dt><dd>{snapshot.metrics.reconnects}</dd>
          <dt>Worker restarts</dt><dd>{snapshot.metrics.restarts}</dd>
          <dt>Last observed event slot</dt><dd>{snapshot.metrics.lastSlot ?? "None"}</dd>
          <dt>Replay checkpoint</dt><dd>{snapshot.metrics.cursor}</dd>
          <dt>Mean processing time</dt><dd>{snapshot.metrics.processingMeanMs.toFixed(2)} ms ({snapshot.metrics.processingSamples} samples)</dd>
        </dl>
        <p className="mt-3 text-sm text-muted">Counters persist with this dataset. Processing time measures local ingest/evaluation, not network latency. Event slots in a synthetic replay are invented test values.</p>
      </details>
    </> : null}
  </section>;
}
