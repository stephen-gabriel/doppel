"use client";

import { useEffect, useRef, useState } from "react";
import type { CoverageEnvelope, Draft, RecipientRecord, TransferEvent } from "@doppel/engine";
import { CheckCoordinator, draftFingerprint } from "@doppel/sdk";
import { listRecipients, subscribeRecipientChanges } from "./recipient-book";

export type RemoteCheck = { events: TransferEvent[]; coverage: CoverageEnvelope };

export function useCheckCoordinator(draft: Draft, recipient: RecipientRecord | null) {
  const current = useRef({ draft, recipient });
  current.current = { draft, recipient };
  const coordinatorRef = useRef<CheckCoordinator | null>(null);
  if (!coordinatorRef.current) {
    coordinatorRef.current = new CheckCoordinator(async ({ draft: value, historyAssets, signal }) => {
      const response = await fetch("/api/check", {
        method: "POST", headers: { "content-type": "application/json" }, signal,
        body: JSON.stringify({ cluster: value.cluster, sender: value.sender,
          destination: value.destination, asset: value.asset, amountRaw: value.amountRaw,
          historyAssets, maxTransactions: 40 }),
      });
      const payload = await response.json() as RemoteCheck & { error?: string; message?: string };
      if (!response.ok) throw new Error(payload.message ?? payload.error ?? "lookup_failed");
      return payload;
    });
  }
  const coordinator = coordinatorRef.current;
  const [, render] = useState(0);
  const refresh = () => render((value) => value + 1);
  // Compute against current props, never display a stored snapshot from an older draft.
  const snapshot = coordinator.snapshot(draft, recipient);

  useEffect(() => {
    const timer = window.setInterval(() => render((value) => value + 1), 500);
    const unsubscribe = subscribeRecipientChanges(() => {
      coordinator.cancel();
      render((value) => value + 1);
    });
    return () => { window.clearInterval(timer); unsubscribe(); coordinator.cancel(); };
  }, [coordinator]);

  const run = async () => {
    const pending = coordinator.run(current.current.draft, current.current.recipient);
    refresh();
    try { await pending; }
    catch (error) { if ((error as Error).name !== "AbortError") throw error; }
    refresh();
    return coordinator.snapshot(current.current.draft, current.current.recipient);
  };
  const cancel = () => { coordinator.cancel(); refresh(); };
  const acknowledgeHistoryLimit = () => {
    coordinator.acknowledgeHistoryLimit(current.current.draft, current.current.recipient);
    refresh();
  };
  const revalidateForWallet = async (expectedDraft: Draft): Promise<boolean> => {
    const records = await listRecipients();
    const latest = current.current;
    if (draftFingerprint(expectedDraft) !== draftFingerprint(latest.draft)) return false;
    const stored = records.find((record) => record.id === latest.draft.recipientId) ?? null;
    const allowed = coordinator.allowsWalletRequest(latest.draft, stored);
    refresh();
    return allowed;
  };
  return { snapshot, run, cancel, acknowledgeHistoryLimit, revalidateForWallet, coordinator };
}
