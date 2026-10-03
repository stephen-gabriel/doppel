import {
  confirmRecipient,
  createUnconfirmedRecipient,
  previewImport,
  reviseRecipientAddress,
  serializeExport,
  type Cluster,
  type RecipientRecord,
} from "@doppel/engine";

const DB_NAME = "doppel-recipients";
const STORE = "recipients";
const VERSION = 1;
export const RECIPIENT_CHANGE_EVENT = "doppel-recipients-changed";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    const request = fn(store);
    tx.oncomplete = () => { db.close(); resolve(request ? request.result : undefined); };
    tx.onerror = () => { db.close(); reject(tx.error); };
    tx.onabort = () => { db.close(); reject(tx.error ?? new Error("recipient_write_aborted")); };
  });
}

function notifyChanged(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new window.Event(RECIPIENT_CHANGE_EVENT));
  try {
    localStorage.setItem("doppel-recipients-revision", crypto.randomUUID());
  } catch {
    return;
  }
}

export async function listRecipients(): Promise<RecipientRecord[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).getAll();
    request.onsuccess = () => resolve(request.result as RecipientRecord[]);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
    tx.onabort = () => { db.close(); reject(tx.error ?? new Error("recipient_read_aborted")); };
  });
}

export async function saveRecipient(record: RecipientRecord): Promise<void> {
  await withStore("readwrite", (store) => store.put(record));
  notifyChanged();
}

export async function deleteRecipient(id: string): Promise<void> {
  await withStore("readwrite", (store) => store.delete(id));
  notifyChanged();
}

export async function addRecipientDraft(input: {
  cluster: Cluster;
  address: string;
  label: string;
}): Promise<RecipientRecord> {
  const record = createUnconfirmedRecipient({
    id: crypto.randomUUID(),
    cluster: input.cluster,
    address: input.address,
    label: input.label,
    now: Date.now(),
  });
  await saveRecipient(record);
  return record;
}

export async function confirmSavedRecipient(
  record: RecipientRecord,
  method: string,
): Promise<RecipientRecord> {
  const next = confirmRecipient(record, method, Date.now());
  await saveRecipient(next);
  return next;
}

export async function reviseSavedRecipient(
  record: RecipientRecord,
  nextAddress: string,
): Promise<RecipientRecord> {
  const next = reviseRecipientAddress(record, nextAddress, Date.now());
  await saveRecipient(next);
  return next;
}

export async function previewRecipientImport(payload: unknown): Promise<ReturnType<typeof previewImport>> {
  const preview = previewImport(payload, Date.now());
  const existing = await listRecipients();
  preview.accepted = preview.accepted.filter((record) => {
    if (existing.some((old) => old.cluster === record.cluster && old.address === record.address)) {
      preview.duplicates.push({ address: record.address, cluster: record.cluster }); return false;
    }
    return true;
  });
  return preview;
}

export async function importRecipients(payload: unknown): Promise<ReturnType<typeof previewImport>> {
  const preview = await previewRecipientImport(payload);
  for (const record of preview.accepted) {
    // Never let imported IDs overwrite an independently confirmed local record.
    await saveRecipient({ ...record, id: crypto.randomUUID(), revision: 1, addressHistory: [] });
  }
  return preview;
}

export async function exportRecipients(): Promise<string> {
  const recipients = await listRecipients();
  return JSON.stringify(serializeExport(recipients, Date.now()), null, 2);
}

export function subscribeRecipientChanges(onChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }
  const onEvent = () => onChange();
  const onStorage = (event: StorageEvent) => {
    if (event.key === "doppel-recipients-revision") {
      onChange();
    }
  };
  window.addEventListener(RECIPIENT_CHANGE_EVENT, onEvent);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(RECIPIENT_CHANGE_EVENT, onEvent);
    window.removeEventListener("storage", onStorage);
  };
}
