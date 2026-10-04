"use client";

import { useEffect, useState } from "react";
import { NetworkSelect } from "../../components/NetworkSelect";
import { Button } from "../../components/Button";
import type { ImportPreview, RecipientRecord } from "@doppel/engine";
import {
  addRecipientDraft,
  confirmSavedRecipient,
  deleteRecipient,
  exportRecipients,
  importRecipients,
  previewRecipientImport,
  listRecipients,
  reviseSavedRecipient,
} from "../../lib/recipient-book";

export default function RecipientsPage() {
  const [records, setRecords] = useState<RecipientRecord[]>([]);
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");
  const [cluster, setCluster] = useState<"mainnet-beta" | "devnet">("mainnet-beta");
  const [pending, setPending] = useState<RecipientRecord | null>(null);
  const [reviseId, setReviseId] = useState<string | null>(null);
  const [nextAddress, setNextAddress] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [importDraft, setImportDraft] = useState<{ payload: unknown; preview: ImportPreview } | null>(null);
  const reportError = (error: unknown) => setMessage(error instanceof Error ? error.message : "This action failed. Please try again.");

  async function refresh() {
    setRecords(await listRecipients());
  }

  useEffect(() => {
    void refresh().catch(reportError);
  }, []);

  return (
    <section className="space-y-6">
      <div className="rounded-[20px] border border-line bg-ink p-6">
        <h1 className="text-[32px] leading-[38px] font-medium">Your address book</h1>
        <p className="mt-3 text-muted">
          Save the full address of someone you intend to pay, after getting it from a source you trust.
          Give it a name such as “Ada” or “My exchange.” Confirming saves your own verification; Doppel does not verify their identity.
          Your address book stays in this browser.
        </p>
        <form
          className="mt-6 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            addRecipientDraft({ cluster, address, label })
              .then((record) => {
                setPending(record);
                setMessage("Review the full address before confirming.");
                return refresh();
              })
              .catch((error: unknown) =>
                setMessage(error instanceof Error ? error.message : "save_failed"),
              );
          }}
        >
          <label htmlFor="recipient-label" className="block">Recipient name</label>
          <input id="recipient-label"
            className="h-11 w-full rounded-[12px] border border-line bg-raised px-3"
            placeholder="Label"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            required
          />
          <label htmlFor="recipient-address" className="block">Full receiving address</label>
          <input id="recipient-address"
            className="h-11 w-full rounded-[12px] border border-line bg-raised px-3 font-mono"
            placeholder="Full address"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            required
          />
          <NetworkSelect id="recipient-network" value={cluster} onChange={setCluster} />
          <Button type="submit" variant="primary">
            Review recipient
          </Button>
        </form>
        {pending ? (
          <div className="mt-4 rounded-[12px] bg-raised p-4">
            <p>Review full address:</p>
            <p className="break-all font-mono">{pending.address}</p>
            <p className="text-sm text-muted">Source descriptions are your assertion, not identity verification.</p>
            <Button
              variant="primary"
              className="mt-3"
              onClick={() => {
                void confirmSavedRecipient(pending, "manual_review").then(() => {
                  setPending(null);
                  setMessage("Saved as confirmed by you.");
                  return refresh();
                }).catch(reportError);
              }}
            >
              Confirm this record
            </Button>
          </div>
        ) : null}
        {message ? <p className="mt-3 text-sm text-review" role="status">{message}</p> : null}
      </div>
      <div className="space-y-3">
        {records.map((record) => (
          <article key={record.id} className="rounded-[20px] border border-line bg-ink p-5">
            <p className="break-words font-medium">{record.label}</p>
            <p className="break-all font-mono text-sm">{record.address}</p>
            <p className="text-sm text-muted">
              {record.cluster === "devnet" ? "Test network" : record.cluster === "mainnet-beta" ? "Real network" : "Local test"} · {record.confirmationStatus === "confirmed" ? "Confirmed by you" : "Needs confirmation"} · version {record.revision}
            </p>
            {reviseId === record.id ? (
              <form
                className="mt-3 space-y-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void reviseSavedRecipient(record, nextAddress)
                    .then((revised) => {
                      setReviseId(null);
                      setPending(revised);
                      setMessage("Address changed. Confirm the new revision before using it.");
                      return refresh();
                    })
                    .catch((error: Error) => setMessage(error.message));
                }}
              >
                <p className="break-all text-sm">Old: {record.address}</p>
                <input
                  aria-label={`New full address for ${record.label}`}
                  className="h-11 w-full rounded-[12px] border border-line bg-raised px-3 font-mono"
                  value={nextAddress}
                  onChange={(event) => setNextAddress(event.target.value)}
                  placeholder="New full address"
                />
                <Button type="submit" variant="primary">
                  Review new address
                </Button>
              </form>
            ) : (
              <div className="mt-3 flex flex-wrap gap-3">
                {record.confirmationStatus === "unconfirmed" ? <Button variant="secondary" onClick={() => setPending(record)}>
                  Review confirmation
                </Button> : null}
                <Button
                  variant="secondary"
                  onClick={() => {
                    setReviseId(record.id);
                    setNextAddress("");
                  }}
                >
                  Change address
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    void deleteRecipient(record.id).then(() => { if (pending?.id === record.id) setPending(null); return refresh(); }).catch(reportError);
                  }}
                >
                  Remove
                </Button>
              </div>
            )}
          </article>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <Button
          variant="secondary"
          onClick={() => {
            void exportRecipients().then((json) => {
              const blob = new Blob([json], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = "doppel-recipients.json";
              link.click();
              URL.revokeObjectURL(url);
            }).catch(reportError);
          }}
        >
          Export
        </Button>
        <label className="inline-flex min-h-11 cursor-pointer items-center rounded-[12px] border border-line-strong bg-raised px-4 text-[15px] font-medium text-text shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-[background-color,border-color] duration-150 hover:border-iris hover:bg-[#2a3157] active:translate-y-px active:bg-[#222848]">
          Preview an address-book file
          <input
            type="file"
            className="mt-2 block w-full max-w-[240px] text-sm"
            accept="application/json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              setImportDraft(null);
              if (file.size > 1_000_000) { setMessage("Choose a JSON file smaller than 1 MB."); return; }
              void file.text().then(async (text) => {
                const payload: unknown = JSON.parse(text);
                const preview = await previewRecipientImport(payload);
                setImportDraft({ payload, preview });
                setMessage("Review the import below. Nothing has been saved yet.");
              }).catch(() => setMessage("Could not read this address-book file. Choose a valid Doppel JSON export."));
            }}
          />
        </label>
      </div>
      {importDraft ? <div className="rounded-[12px] bg-raised p-4 space-y-3">
        <h2 className="text-xl">Review import</h2>
        <p>{importDraft.preview.accepted.length} new records, {importDraft.preview.duplicates.length} duplicates, {importDraft.preview.invalid.length} invalid entries.
          Existing records will not be replaced. All imported records need fresh confirmation.</p>
        <ul>{importDraft.preview.accepted.slice(0, 10).map((record, index) => <li key={index} className="break-all text-sm">{record.label}: {record.address}</li>)}</ul>
        <Button variant="primary" disabled={!importDraft.preview.accepted.length}
          onClick={() => { void importRecipients(importDraft.payload).then(async (result) => {
            setImportDraft(null); setMessage(`Imported ${result.accepted.length} unconfirmed records.`); await refresh();
          }).catch(reportError); }}>Import reviewed records</Button>
        <Button variant="ghost" onClick={() => setImportDraft(null)}>Cancel import</Button>
      </div> : null}
    </section>
  );
}
