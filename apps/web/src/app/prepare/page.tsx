"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  DEVNET_CIRCLE_USDC_MINT,
  MAINNET_USDC_MINT,
  type Draft,
  type RecipientRecord,
} from "@doppel/engine";
import { buildDevnetTokenTransfer, inspectCompiledTransaction, type TokenAccountFact } from "@doppel/sdk";
import {
  buildSolTransfer,
  canRequestWalletSignature,
  type RpcIdentity,
} from "@doppel/harness";
import { RecipientCheckSummary } from "@doppel/widget";
import { Connection } from "@solana/web3.js";
import { TwinPanel } from "../../components/TwinPanel";
import { listRecipients, subscribeRecipientChanges } from "../../lib/recipient-book";
import { useCheckCoordinator } from "../../lib/use-check-coordinator";
import { connectWallet, DEVNET_ENDPOINT, MAX_WALLET_PRIORITY_FEE_LAMPORTS, MAX_WALLET_TOTAL_FEE_LAMPORTS, requestWalletSignature, walletAvailability } from "../../lib/wallet";
import { NetworkSelect } from "../../components/NetworkSelect";
import { Button } from "../../components/Button";
import { formatRawAmount, parseDisplayAmount } from "../../lib/amounts";
import { checkDevnetFunding } from "../../lib/funding";

export default function PreparePage() {
  const [cluster, setCluster] = useState<"mainnet-beta" | "devnet">("devnet");
  const [sender, setSender] = useState("");
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("0.001");
  const [assetChoice, setAssetChoice] = useState<"SOL" | "USDC">("SOL");
  const [recipients, setRecipients] = useState<RecipientRecord[]>([]);
  const [recipientId, setRecipientId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [lastSignature, setLastSignature] = useState<string | null>(null);
  const [identity, setIdentity] = useState<RpcIdentity | null>(null);
  const [busy, setBusy] = useState(false);
  const [fundingMessage, setFundingMessage] = useState<string | null>(null);
  const sending = useRef(false);
  const [walletState, setWalletState] = useState<"detecting" | "missing" | "available" | "connecting" | "connected" | "error">("detecting");
  const [walletName, setWalletName] = useState("Solana wallet");
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletMessage, setWalletMessage] = useState<string | null>(null);
  const connecting = useRef(false);

  useEffect(() => {
    const detect = () => {
      if (connecting.current) return;
      const found = walletAvailability();
      setWalletName(found.name); setWalletAddress(found.address);
      setWalletState(found.available ? found.address ? "connected" : "available" : "missing");
    };
    detect();
    const timer = window.setTimeout(detect, 1000);
    window.addEventListener("focus", detect);
    return () => { window.clearTimeout(timer); window.removeEventListener("focus", detect); };
  }, []);

  async function onConnect() {
    if (connecting.current) return;
    connecting.current = true;
    setWalletState("connecting"); setWalletMessage(null);
    try {
      const address = await connectWallet();
      setSender(address); setWalletAddress(address); setWalletName(walletAvailability().name);
      setWalletState("connected"); setWalletMessage("Connected. Your sending address is filled in below.");
    } catch (error) {
      const code = (error as { code?: number }).code;
      setWalletState(walletAvailability().available ? "error" : "missing");
      setWalletMessage(code === 4001 ? "Connection declined. Click Connect when you are ready."
        : error instanceof Error ? error.message : "Could not connect. Unlock your wallet and try again.");
    } finally { connecting.current = false; }
  }

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
  const decimals = assetChoice === "SOL" ? 9 : 6;
  const parsedAmount = parseDisplayAmount(amount, decimals);
  const amountRaw = parsedAmount ?? "invalid";
  const exceedsTestLimit = cluster === "devnet" && parsedAmount !== null &&
    BigInt(parsedAmount) > (assetChoice === "SOL" ? 100_000_000n : 1_000_000n);
  const amountError = parsedAmount === null ? `Enter an amount greater than zero with up to ${decimals} decimal places.`
    : exceedsTestLimit ? `This test flow allows at most ${assetChoice === "SOL" ? "0.1 SOL" : "1 USDC"} per payment.` : null;
  const asset = assetChoice === "SOL" ? "SOL" : cluster === "devnet" ? DEVNET_CIRCLE_USDC_MINT : MAINNET_USDC_MINT;
  const draft: Draft = useMemo(
    () => ({
      cluster,
      sender,
      recipientId: selected?.id ?? null,
      recipientRevision: selected?.revision ?? null,
      destination,
      asset,
      amountRaw,
    }),
    [amountRaw, asset, cluster, destination, selected, sender],
  );
  const { snapshot, run, cancel, acknowledgeHistoryLimit, revalidateForWallet } = useCheckCoordinator(draft, selected);

  async function onDevnetSend() {
    if (sending.current) return;
    setMessage(null);
    setLastSignature(null);
    setFundingMessage(null);
    if (amountError) { setMessage(amountError); return; }
    if (cluster !== "devnet") {
      setMessage("Mainnet analysis — no transaction will be sent.");
      return;
    }
    sending.current = true;
    setBusy(true);
    try {
      if (!(await revalidateForWallet(draft))) throw new Error("Check is stale, changed, or not ready for confirmation.");
      const observed = await fetch("/api/genesis?cluster=devnet").then(async (response) => {
        const payload = (await response.json()) as RpcIdentity & { error?: string };
        if (!response.ok) {
          throw new Error(payload.error ?? "genesis_failed");
        }
        return payload;
      });
      setIdentity(observed);
      const connection = new Connection(DEVNET_ENDPOINT, "confirmed");
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      let sourceTokenAccount: TokenAccountFact | null = null;
      let destinationTokenAccount: TokenAccountFact | null = null;
      const token = draft.asset === "SOL" ? null : await buildDevnetTokenTransfer(connection, draft, blockhash);
      const prepared = token?.transaction ?? buildSolTransfer(draft, blockhash);
      sourceTokenAccount = token?.sourceTokenAccount ?? null;
      destinationTokenAccount = token?.destinationTokenAccount ?? null;
      const inspected = inspectCompiledTransaction(draft, prepared, { sourceTokenAccount, destinationTokenAccount });
      if (!inspected.ok) {
        setMessage(`Final transaction does not match the checked draft: ${inspected.reasonCodes.join(", ")}`);
        return;
      }
      const gate = canRequestWalletSignature({
        cluster,
        identity: observed,
        draft,
        transaction: prepared,
        policyAllows: true,
        sourceTokenAccount,
        destinationTokenAccount,
      });
      if (!gate.ok) {
        setMessage(`Wallet request blocked: ${gate.reasonCodes.join(", ")}`);
        return;
      }
      const funding = await checkDevnetFunding(connection, draft, prepared);
      setFundingMessage(funding);
      if (!(await revalidateForWallet(draft))) {
        setMessage("Draft changed before the wallet request.");
        return;
      }
      const signature = await requestWalletSignature({ transaction: prepared, cluster,
        sender: draft.sender, lastValidBlockHeight, revalidate: () => revalidateForWallet(draft),
        onFeeChecked: setFundingMessage });
      setLastSignature(signature);
      setMessage(`Devnet transaction confirmed: ${signature}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "wallet_failed");
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  return (
    <section className="space-y-5">
      <h1 className="text-[32px] leading-[38px] font-medium">Try a payment with test funds</h1>
      <p className="text-muted">Practice the full flow: choose who you intend to pay, check the receiving address, then approve in your wallet.
        Just want to compare addresses? <Link href="/" className="text-iris underline">Use Check an address</Link>—no funds or wallet connection needed.</p>
      {cluster === "mainnet-beta" ? (
        <p className="rounded-[12px] bg-raised p-4 text-review">Real network · read-only. You can review a payment here, but Doppel cannot send real funds.</p>
      ) : (
        <div className="rounded-[12px] bg-raised p-4">
          <h2 className="font-medium">Only the sending wallet needs test SOL first</h2>
          <p className="mt-2 text-muted">For a SOL test, your wallet pays the amount plus a small network fee. The receiving address gets the test SOL and does not need advance funding.</p>
          <p className="mt-2 text-muted">Use free devnet funds, not real SOL. A brand-new receiving address needs a minimum transfer; we check that before asking you to sign.</p>
          <p className="mt-2 text-sm text-muted">Your wallet may add a priority fee. Doppel accepts at most {formatRawAmount(MAX_WALLET_PRIORITY_FEE_LAMPORTS.toString(), 9)} test SOL in priority fees and {formatRawAmount(MAX_WALLET_TOTAL_FEE_LAMPORTS.toString(), 9)} test SOL in total network fees; the payment amount never changes. These limits apply only to free devnet test funds.</p>
          <a href="https://faucet.solana.com/" target="_blank" rel="noreferrer" className="mt-2 inline-block min-h-11 leading-[44px] text-iris underline">Open the free Solana devnet faucet</a>
          <p className="text-sm text-muted">Paste your sending wallet’s public address into the faucet. If it is rate-limited, you can still test all address checks without funds.</p>
        </div>
      )}
      {cluster === "devnet" ? <section className="rounded-[12px] border border-line bg-ink p-4" aria-label="Wallet connection">
        <Button variant="primary" className="px-5"
          aria-busy={walletState === "connecting"} disabled={busy || walletState === "connecting"} onClick={() => void onConnect()}>
          {walletState === "connecting" ? "Connecting… check your wallet" : "Connect my test wallet"}
        </Button>
        <div className="mt-3 text-sm" role="status" aria-live="polite">
          {walletState === "missing" ? <>
            <p className="text-review">No compatible Solana wallet detected in this browser.</p>
            <p className="mt-1 text-muted">Install <a href="https://phantom.com/" target="_blank" rel="noreferrer" className="text-iris underline">Phantom</a> or <a href="https://solflare.com/" target="_blank" rel="noreferrer" className="text-iris underline">Solflare</a>, then refresh this page. You can still check addresses without one.</p>
          </> : walletState === "connected" ? <>
            <p className="text-match">{walletName} connected.</p><p className="break-all font-mono text-muted">{walletAddress}</p>
            {walletAddress !== sender ? <p className="text-review">Click Connect to use this wallet as the sending address.</p> : null}
          </> : <p className="text-muted">{walletState === "connecting" ? "Approve the connection in your wallet popup. Connecting does not send funds."
            : walletState === "detecting" ? "Checking for an installed wallet…" : `${walletName} detected. Click Connect to choose your sending account.`}</p>}
          {walletMessage ? <p className="mt-2 text-review">{walletMessage}</p> : null}
        </div>
      </section> : null}
      <form
        className="grid gap-4 md:grid-cols-2"
        onSubmit={(event) => {
            event.preventDefault();
            setMessage(null); setFundingMessage(null);
            if (!amountError) void run();
        }}
      >
        <NetworkSelect id="prepare-cluster" value={cluster} onChange={(value) => { setCluster(value); setRecipientId(""); setMessage(null); setFundingMessage(null); }} />
        <label htmlFor="prepare-sender">
          Your sending wallet
          <input
            id="prepare-sender"
            aria-label="Your sending wallet"
            className="mt-1 h-11 w-full rounded-[12px] border border-line bg-raised px-3 font-mono"
            value={sender}
            placeholder="Connect a wallet or paste its public address"
            aria-describedby="prepare-sender-hint"
            onChange={(event) => setSender(event.target.value)}
          />
          <span id="prepare-sender-hint" className="mt-2 block text-sm text-muted">Money would leave this wallet. To send a test payment, connect the wallet with this exact address.</span>
        </label>
        <label htmlFor="prepare-recipient">
          Who are you trying to pay?
          <select
            id="prepare-recipient"
            aria-label="Who are you trying to pay?"
            className="mt-1 h-11 w-full rounded-[12px] border border-line bg-raised px-3"
            value={recipientId}
            onChange={(event) => setRecipientId(event.target.value)}
          >
            <option value="">Choose a confirmed recipient</option>
            {recipients
              .filter((item) => item.cluster === cluster)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label} · rev {item.revision}
                </option>
              ))}
          </select>
          <span className="mt-2 block text-sm text-muted">Save a recipient on the same network in your <Link href="/recipients" className="text-iris underline">address book</Link> first.</span>
        </label>
        <label htmlFor="prepare-destination">
          Address you are about to pay
          <input
            id="prepare-destination"
            className="mt-1 h-11 w-full rounded-[12px] border border-line bg-raised px-3 font-mono"
            value={destination}
            placeholder="Paste the receiving address independently"
            onChange={(event) => setDestination(event.target.value)}
          />
        </label>
        <label>
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
        <label>
          Amount ({assetChoice})
          <input
            className="mt-1 h-11 w-full rounded-[12px] border border-line bg-raised px-3 font-mono"
            inputMode="decimal"
            aria-label={`Amount (${assetChoice})`}
            autoComplete="off"
            value={amount}
            aria-invalid={amountError !== null}
            aria-describedby="amount-hint"
            onChange={(event) => setAmount(event.target.value)}
          />
          <span id="amount-hint" className={`mt-2 block text-sm ${amountError ? "text-review" : "text-muted"}`}>
            {amountError ?? `Enter ${assetChoice} directly, for example ${assetChoice === "SOL" ? "0.001" : "0.10"}. Network fee is additional.`}
          </span>
        </label>
        <div className="md:col-span-2 flex gap-3">
          <Button type="submit" variant="primary" disabled={Boolean(amountError) || snapshot.stage === "checking" || busy}>
            {snapshot.stage === "checking" ? "Checking history…" : "Check payment details"}
          </Button>
          <Button variant="secondary" onClick={cancel}>
            Cancel
          </Button>
        </div>
      </form>
      {selected && destination ? <TwinPanel leftLabel={`Saved address for ${selected.label}`} left={selected.address}
        rightLabel="Address you pasted" right={destination} /> : <p className="rounded-[12px] bg-raised p-4 text-muted">Select a saved recipient and paste the receiving address to see their comparison.</p>}
      <div className="rounded-[20px] border border-line bg-ink p-5">
        <RecipientCheckSummary
          result={snapshot.combined}
          coverage={snapshot.bound?.coverage ?? null}
          stale={snapshot.stale}
        />
        <p className="mt-2 text-sm text-muted">
          Poisoning history is searched across supported SOL and canonical USDC, independent of the payment asset.
          Limited history does not establish safety. An exact confirmed recipient may proceed only after
          you explicitly acknowledge the missing historical coverage. Unavailable or unresolved data still blocks.
        </p>
        {identity ? <details className="mt-3 text-sm text-muted"><summary className="cursor-pointer">Technical network verification</summary>
          <p className="break-all font-mono">Observed genesis {identity.genesisHash} from {identity.endpoint}</p>
        </details> : null}
      </div>
      {snapshot.historyLimitAcknowledged || snapshot.combined.reasonCodes.includes("policy.history_acknowledgment_required") ? (
        <label className="flex gap-3 rounded-[12px] bg-raised p-4 text-review">
          <input type="checkbox" checked={snapshot.historyLimitAcknowledged}
            onChange={(event) => { if (event.target.checked) acknowledgeHistoryLimit(); else cancel(); }} />
          I independently confirmed this exact recipient and understand that some historical activity was not checked.
        </label>
      ) : null}
      {snapshot.historyLimitAcknowledged ? <p className="text-review">Limited history acknowledged for this check only. Coverage remains partial; safety is not established.</p> : null}
      <div className="rounded-[12px] bg-raised p-4">
        <h2 className="font-medium">Before you approve</h2>
        <p className="mt-2 break-all">To: {draft.destination || "Enter a receiving address"}</p>
        <p>Amount: {parsedAmount ? formatRawAmount(parsedAmount, decimals) : "Enter a valid amount"} {assetChoice}{cluster === "devnet" ? " (test funds)" : ""} + network fee</p>
        {fundingMessage ? <p className="mt-2 text-sm text-muted" role="status">{fundingMessage}</p> : null}
      </div>
      {cluster === "mainnet-beta" ? (
        <p className="text-muted">Read-only review. To practice sending, choose Test network · devnet above.</p>
      ) : (
        <Button
          variant="primary"
          disabled={busy || Boolean(amountError) || snapshot.combined.action !== "ready_for_confirmation" || snapshot.stale}
          onClick={() => void onDevnetSend()}
        >
          {busy ? "Preparing test payment…" : "Approve test payment in wallet"}
        </Button>
      )}
      {cluster === "devnet" && asset !== "SOL" ? <p className="text-review">USDC is a more advanced test: the sender needs test USDC and test SOL for fees, and both wallets need existing USDC token accounts. Start with SOL for your first test.</p> : null}
      {message ? <p className="break-words text-review" role="status">{message}</p> : null}
      {lastSignature ? <a className="break-all font-mono text-sm text-iris underline" href={`https://explorer.solana.com/tx/${lastSignature}?cluster=devnet`} target="_blank" rel="noreferrer">View confirmed test transaction: {lastSignature}</a> : null}
    </section>
  );
}
