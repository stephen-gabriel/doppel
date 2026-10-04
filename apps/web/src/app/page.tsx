"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  DEVNET_CIRCLE_USDC_MINT,
  MAINNET_USDC_MINT,
  type Draft,
  type RecipientRecord,
} from "@doppel/engine";
import { ActionNote, ContinuityBadge, CoverageNote, PatternBadge } from "../components/ResultBadges";
import { Button } from "../components/Button";
import { EvidenceTimeline } from "../components/EvidenceTimeline";
import { TwinPanel } from "../components/TwinPanel";
import { NetworkSelect } from "../components/NetworkSelect";
import { listRecipients, subscribeRecipientChanges } from "../lib/recipient-book";
import { useCheckCoordinator } from "../lib/use-check-coordinator";

const EXAMPLE_REAL = "4yfu48qwim7hGzD3Nphzd2A6ThydzysfKi4wBPFSgnhY";
const EXAMPLE_SPOOF = "4yfuQCL4fnNfSbBgqFcPTFn5GGZABDaEFQLhGpwjizcY";

export default function CheckPage() {
  const [cluster, setCluster] = useState<"mainnet-beta" | "devnet">("mainnet-beta");
  const [sender, setSender] = useState("");
  const [destination, setDestination] = useState("");
  const [assetChoice, setAssetChoice] = useState<"SOL" | "USDC">("SOL");
  const [recipients, setRecipients] = useState<RecipientRecord[]>([]);
  const [recipientId, setRecipientId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [example, setExample] = useState<"match" | "different" | null>(null);

  useEffect(() => {
    const load = () => {
      listRecipients()
        .then(setRecipients)
        .catch(() => setRecipients([]));
    };
    load();
    return subscribeRecipientChanges(load);
  }, []);

  const selected = recipients.find((item) => item.id === recipientId && item.cluster === cluster) ?? null;
  const asset = assetChoice === "SOL" ? "SOL" : cluster === "devnet" ? DEVNET_CIRCLE_USDC_MINT : MAINNET_USDC_MINT;
  const draft: Draft = useMemo(
    () => ({
      cluster,
      sender,
      recipientId: selected?.id ?? null,
      recipientRevision: selected?.revision ?? null,
      destination,
      asset,
      amountRaw: "0",
    }),
    [asset, cluster, destination, selected, sender],
  );
  const { snapshot, run, cancel } = useCheckCoordinator(draft, selected);

  return (
    <div className="space-y-6">
      <div className="rounded-[12px] bg-raised p-5">
        <h2 className="text-xl font-medium">Start here: check an address without sending money</h2>
        <p className="mt-2 text-muted">Save an address you trust in your <Link href="/recipients" className="text-iris underline">address book</Link>,
          then compare it with the address you are about to pay. No wallet connection, SOL balance or transaction fee is needed.</p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setExample("match")}>See a matching example</Button>
          <Button variant="secondary" onClick={() => setExample("different")}>See a lookalike example</Button>
          <Link href="/prepare" className="min-h-11 self-center px-2 leading-[44px] text-iris underline">Want to try a test payment?</Link>
        </div>
        {example ? <div className="mt-4 space-y-3" aria-live="polite">
          <p className="text-sm text-muted">Address-comparison example only · no network request or wallet check. These are addresses from a published case, not recommended payment destinations.</p>
          <TwinPanel leftLabel="Address saved for Ada (illustration)" left={EXAMPLE_REAL}
            rightLabel="Address pasted for payment" right={example === "match" ? EXAMPLE_REAL : EXAMPLE_SPOOF} />
          <Button variant="ghost" onClick={() => setExample(null)}>Close example</Button>
        </div> : null}
      </div>
    <div className="grid gap-6 lg:grid-cols-12">
      <section className="lg:col-span-5 rounded-[20px] border border-line bg-ink p-6">
        <h1 className="text-[32px] leading-[38px] font-medium md:text-[48px] md:leading-[54px]">
          Check the recipient before you send.
        </h1>
        <p className="mt-3 text-muted">
          Who did you intend to pay, and where would the money actually go?
        </p>
        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            void run().catch((caught: Error) => setError(caught.message));
          }}
        >
          <NetworkSelect id="check-network" value={cluster} onChange={(value) => { setCluster(value); setRecipientId(""); }} />
          <label className="block">
            Your wallet address
            <input
              className="mt-1 h-11 w-full rounded-[12px] border border-line bg-raised px-3 font-mono"
              value={sender}
              placeholder="The wallet you would send from"
              aria-describedby="check-sender-hint"
              onChange={(event) => setSender(event.target.value)}
              required
            />
          </label>
          <p id="check-sender-hint" className="text-sm text-muted">We read this wallet’s public payment history. Paste a public address, never a recovery phrase.</p>
          <label className="block">
            Who are you trying to pay?
            <select
              className="mt-1 h-11 w-full rounded-[12px] border border-line bg-raised px-3"
              value={recipientId}
              onChange={(event) => setRecipientId(event.target.value)}
            >
              <option value="">Choose a saved recipient (optional)</option>
              {recipients
                .filter((item) => item.cluster === cluster)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label} · rev {item.revision} · {item.confirmationStatus}
                  </option>
                ))}
            </select>
          </label>
          <p className="text-sm text-muted">This is the address you previously confirmed. <Link href="/recipients" className="text-iris underline">Save a recipient</Link> if the list is empty.
            Without one, we can only inspect history.</p>
          <label className="block">
            Address you are about to pay
            <input
              className="mt-1 h-11 w-full rounded-[12px] border border-line bg-raised px-3 font-mono"
              value={destination}
              placeholder="Paste the proposed receiving address"
              onChange={(event) => setDestination(event.target.value)}
              required
            />
          </label>
          <label className="block">
            What would you send?
            <select
              className="mt-1 h-11 w-full rounded-[12px] border border-line bg-raised px-3"
              value={assetChoice}
              onChange={(event) => setAssetChoice(event.target.value as "SOL" | "USDC")}
            >
              <option value="SOL">SOL</option>
              <option value="USDC">USDC</option>
            </select>
          </label>
          <p className="text-sm text-muted">
            This only checks addresses. We look at both SOL and USDC history; no money will move.
          </p>
          <div className="flex gap-3">
            <Button type="submit" variant="primary" disabled={snapshot.stage === "checking"}>
              {snapshot.stage === "checking" ? "Checking history…" : "Check address"}
            </Button>
            <Button variant="secondary" onClick={cancel}>
              Cancel
            </Button>
          </div>
        </form>
        <p className="mt-4 text-sm text-muted" role="status">{snapshot.stage === "idle" ? "Fill in the addresses to begin."
          : snapshot.stage === "checking" ? "Reading public history. This may take a few seconds."
            : snapshot.stage === "failed" ? "History could not be loaded. Your saved-address comparison still works."
              : snapshot.stage === "ready" ? "Check finished. Review your result below." : "Check stopped or details changed. Run a fresh check."}</p>
        {snapshot.stale && snapshot.stage !== "idle" && snapshot.stage !== "checking" ? (
          <p className="text-review">Payment details changed. Check again before continuing.</p>
        ) : null}
      </section>
      <section className="lg:col-span-7 space-y-4" aria-live="polite">
        {selected && destination ? <TwinPanel leftLabel={`Saved address for ${selected.label}`} left={selected.address}
          rightLabel="Address you pasted" right={destination} /> : <div className="rounded-[20px] border border-line bg-ink p-5">
          <h2 className="text-xl">Your address comparison</h2>
          <p className="mt-2 text-muted">Choose a saved recipient and paste the address you plan to pay. We will show whether the full addresses match.</p>
        </div>}
        <div className="rounded-[20px] border border-line bg-ink p-5 space-y-3">
          <h2 className="text-xl">What we can tell you</h2>
          <ContinuityBadge value={snapshot.combined.continuity} />
          {snapshot.bound && !snapshot.stale ? <PatternBadge value={snapshot.combined.pattern} /> : null}
          {snapshot.bound ? (
            <CoverageNote coverage={snapshot.bound.coverage} />
          ) : (
            <p className="text-muted">No chain lookup yet.</p>
          )}
          {destination ? <ActionNote value={snapshot.combined.action} /> : null}
          {error ? <p className="text-pause">{error}</p> : null}
        </div>
        {snapshot.bound && !snapshot.stale ? <details className="rounded-[20px] border border-line bg-ink p-5">
          <summary className="cursor-pointer text-xl">Payment history behind this result</summary>
          <div className="mt-4"><EvidenceTimeline events={snapshot.bound.events} sender={sender} /></div>
        </details> : null}
      </section>
    </div>
    </div>
  );
}
