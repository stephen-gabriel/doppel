import { z } from "zod";
import { validateAddress } from "./address.ts";
import {
  RecipientRecordSchema,
  type Cluster,
  type RecipientRecord,
} from "./schemas.ts";

export const RECIPIENT_EXPORT_VERSION = 1 as const;

export const RecipientExportSchema = z.object({
  version: z.literal(RECIPIENT_EXPORT_VERSION),
  exportedAt: z.number().int().nonnegative(),
  recipients: z.array(RecipientRecordSchema),
});

export type RecipientExport = z.infer<typeof RecipientExportSchema>;

export type ImportPreview = {
  accepted: RecipientRecord[];
  duplicates: Array<{ address: string; cluster: Cluster }>;
  invalid: Array<{ reason: string; index: number }>;
};

export function createUnconfirmedRecipient(input: {
  id: string;
  cluster: Cluster;
  address: string;
  label: string;
  now: number;
}): RecipientRecord {
  const address = validateAddress(input.address);
  if (!address.valid) {
    throw new Error("invalid_address");
  }
  const label = input.label.trim();
  if (label.length === 0) {
    throw new Error("empty_label");
  }
  return {
    id: input.id,
    cluster: input.cluster,
    address: input.address,
    label,
    confirmationStatus: "unconfirmed",
    confirmationMethod: null,
    confirmedAt: null,
    revision: 1,
    createdAt: input.now,
    updatedAt: input.now,
    addressHistory: [],
  };
}

export function confirmRecipient(
  record: RecipientRecord,
  method: string,
  now: number,
): RecipientRecord {
  if (method.trim().length === 0) {
    throw new Error("empty_confirmation_method");
  }
  return {
    ...record,
    confirmationStatus: "confirmed",
    confirmationMethod: method.trim(),
    confirmedAt: now,
    updatedAt: now,
  };
}

export function reviseRecipientAddress(
  record: RecipientRecord,
  nextAddress: string,
  now: number,
): RecipientRecord {
  const parsed = validateAddress(nextAddress);
  if (!parsed.valid) {
    throw new Error("invalid_address");
  }
  if (nextAddress === record.address) {
    throw new Error("address_unchanged");
  }
  return {
    ...record,
    address: nextAddress,
    confirmationStatus: "unconfirmed",
    confirmationMethod: null,
    confirmedAt: null,
    revision: record.revision + 1,
    updatedAt: now,
    addressHistory: [
      ...record.addressHistory,
      { address: record.address, revision: record.revision, changedAt: now },
    ],
  };
}

export function neverTrustIncoming(record: RecipientRecord): RecipientRecord {
  return {
    ...record,
    confirmationStatus: "unconfirmed",
    confirmationMethod: null,
    confirmedAt: null,
  };
}

export function previewImport(payload: unknown, now: number): ImportPreview {
  const parsed = RecipientExportSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      accepted: [],
      duplicates: [],
      invalid: [{ reason: "invalid_export_schema", index: -1 }],
    };
  }

  const accepted: RecipientRecord[] = [];
  const duplicates: ImportPreview["duplicates"] = [];
  const invalid: ImportPreview["invalid"] = [];
  const seen = new Set<string>();

  parsed.data.recipients.forEach((record, index) => {
    const address = validateAddress(record.address);
    if (!address.valid) {
      invalid.push({ reason: "invalid_address", index });
      return;
    }
    const key = `${record.cluster}:${record.address}`;
    if (seen.has(key)) {
      duplicates.push({ address: record.address, cluster: record.cluster });
      return;
    }
    seen.add(key);
    accepted.push({
      ...record,
      confirmationStatus: "unconfirmed",
      confirmationMethod: null,
      confirmedAt: null,
      updatedAt: now,
    });
  });

  return { accepted, duplicates, invalid };
}

export function serializeExport(recipients: RecipientRecord[], now: number): RecipientExport {
  return {
    version: RECIPIENT_EXPORT_VERSION,
    exportedAt: now,
    recipients,
  };
}
