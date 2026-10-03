# Embed the current check coordinator

Workspace packages are source packages, not published npm releases. The real React integration is `apps/web/src/lib/use-check-coordinator.ts`; the reference payment page is `apps/web/src/app/prepare/page.tsx`.

```ts
import { CheckCoordinator } from '@doppel/sdk';
import { CoverageEnvelopeSchema, TransferEventSchema } from '@doppel/engine';

const coordinator = new CheckCoordinator(async ({ draft, historyAssets, signal }) => {
  const response = await fetch('/api/check', {
    method: 'POST', signal, headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      cluster: draft.cluster, sender: draft.sender,
      destination: draft.destination, asset: draft.asset,
      amountRaw: draft.amountRaw, historyAssets, maxTransactions: 40,
    }),
  });
  if (!response.ok) throw new Error('History lookup unavailable');
  const payload = await response.json();
  return {
    events: TransferEventSchema.array().parse(payload.events),
    coverage: CoverageEnvelopeSchema.parse(payload.coverage),
  };
});

// draft contains exact integer amount, network, sender, destination, asset,
// recipientId and recipientRevision; recipient is your current local record.
const snapshot = await coordinator.run(draft, recipient);
// Render all dimensions, not just action. The widget is display-only:
// <RecipientCheckSummary result={snapshot.combined}
//   coverage={snapshot.bound?.coverage} stale={snapshot.stale} />
```

On every draft/recipient change call `snapshot(currentDraft, currentRecipient)` and discard superseded async results. It invalidates old approvals. Never use an old returned snapshot to authorize signing. Read the current persisted recipient record immediately before wallet request and broadcast, as the reference hook does.

Partial-history acknowledgment is a distinct user action via `acknowledgeHistoryLimit`; do not call it automatically. It applies only to an exact confirmed recipient, fresh completed check and eligible partial history. It cannot override suspicious findings/unavailable data/unresolved transfers. It expires and is cleared on cancellation, edits and recheck.

The coordinator does not validate a serialized payment or control unrelated wallet applications. Actual transaction inspection, wallet identity, current draft validation, message/signature checking and devnet-only broadcast are separate mandatory boundaries. Use the reference code; do not replace them with a disabled-button check.

## Read-only API example

```bash
curl -X POST http://localhost:3000/api/check \
  -H "Content-Type: application/json" \
  -d '{"cluster":"mainnet-beta","sender":"5LbwC1ewY3Sca7T8CwzX9wsjvwMAHbdRo6SCQL8j7EWc","destination":"4yfuQCL4fnNfSbBgqFcPTFn5GGZABDaEFQLhGpwjizcY","asset":"SOL","maxTransactions":8}'
```

These sourced example addresses do not guarantee a current finding. Returned observations depend on bounded available history; historical incident reconstruction is unresolved. API does not save recipient labels or confirm identity. On PowerShell, use `curl.exe` to avoid its legacy alias behavior.
