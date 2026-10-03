import { describe, expect, it } from "vitest";
import {
  confirmRecipient,
  createUnconfirmedRecipient,
  neverTrustIncoming,
  previewImport,
  reviseRecipientAddress,
  serializeExport,
} from "../src/recipients.ts";

const ADDRESS_A = "4yfu48qwim7hGzD3Nphzd2A6ThydzysfKi4wBPFSgnhY";
const ADDRESS_B = "4yfuQCL4fnNfSbBgqFcPTFn5GGZABDaEFQLhGpwjizcY";

describe("recipient records", () => {
  it("creates records unconfirmed", () => {
    const record = createUnconfirmedRecipient({
      id: "r1",
      cluster: "mainnet-beta",
      address: ADDRESS_A,
      label: "Grant desk",
      now: 10,
    });
    expect(record.confirmationStatus).toBe("unconfirmed");
    expect(record.revision).toBe(1);
  });

  it("requires explicit confirmation and never auto-confirms incoming-derived records", () => {
    const incoming = neverTrustIncoming(
      createUnconfirmedRecipient({
        id: "r2",
        cluster: "mainnet-beta",
        address: ADDRESS_B,
        label: "Incoming",
        now: 10,
      }),
    );
    expect(incoming.confirmationStatus).toBe("unconfirmed");
    const confirmed = confirmRecipient(incoming, "manual_review", 20);
    expect(confirmed.confirmationStatus).toBe("confirmed");
    expect(confirmed.confirmedAt).toBe(20);
  });

  it("revising an address increments revision and returns the record to unconfirmed", () => {
    const confirmed = confirmRecipient(
      createUnconfirmedRecipient({
        id: "r3",
        cluster: "mainnet-beta",
        address: ADDRESS_A,
        label: "Payee",
        now: 1,
      }),
      "manual_review",
      2,
    );
    const revised = reviseRecipientAddress(confirmed, ADDRESS_B, 3);
    expect(revised.revision).toBe(2);
    expect(revised.confirmationStatus).toBe("unconfirmed");
    expect(revised.addressHistory[0]?.address).toBe(ADDRESS_A);
  });

  it("import preview never auto-confirms and reports duplicates", () => {
    const record = confirmRecipient(
      createUnconfirmedRecipient({
        id: "r4",
        cluster: "mainnet-beta",
        address: ADDRESS_A,
        label: "Payee",
        now: 1,
      }),
      "manual_review",
      2,
    );
    const preview = previewImport(
      serializeExport([record, { ...record, id: "r5" }], 4),
      5,
    );
    expect(preview.accepted).toHaveLength(1);
    expect(preview.accepted[0]?.confirmationStatus).toBe("unconfirmed");
    expect(preview.duplicates).toHaveLength(1);
  });
});
