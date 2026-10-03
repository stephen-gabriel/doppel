import { describe, expect, it } from "vitest";
import { decodeBase58, encodeBase58 } from "../src/base58.ts";
import { validateAddress } from "../src/address.ts";

const PUBLISHED_VICTIM = "5LbwC1ewY3Sca7T8CwzX9wsjvwMAHbdRo6SCQL8j7EWc";

describe("base58 and address validation", () => {
  it("round-trips 32-byte keys", () => {
    const bytes = new Uint8Array(32);
    for (let i = 0; i < 32; i += 1) {
      bytes[i] = i * 7;
    }
    const encoded = encodeBase58(bytes);
    const decoded = decodeBase58(encoded);
    expect(decoded).toEqual(bytes);
  });

  it("accepts the published victim address as 32 bytes", () => {
    const result = validateAddress(PUBLISHED_VICTIM);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.bytes.length).toBe(32);
    }
  });

  it("rejects empty, invalid base58, and wrong byte length", () => {
    const empty = validateAddress("");
    const badCharset = validateAddress("0OIl");
    const tooShortA = validateAddress("1");
    const tooShortB = validateAddress("2");
    expect(empty.valid).toBe(false);
    expect(badCharset.valid).toBe(false);
    expect(tooShortA.valid).toBe(false);
    expect(tooShortB.valid).toBe(false);
    if (!empty.valid) expect(empty.reasons).toEqual(["empty"]);
    if (!badCharset.valid) expect(badCharset.reasons).toEqual(["invalid_base58"]);
    if (!tooShortA.valid) expect(tooShortA.reasons).toEqual(["invalid_byte_length"]);
    if (!tooShortB.valid) expect(tooShortB.reasons).toEqual(["invalid_byte_length"]);
  });

  it("treats case changes as a different encoding, not a match", () => {
    const lowered = PUBLISHED_VICTIM.toLowerCase();
    expect(lowered).not.toBe(PUBLISHED_VICTIM);
    const result = validateAddress(lowered);
    if (result.valid) {
      expect(result.address).not.toBe(PUBLISHED_VICTIM);
    } else {
      expect(result.reasons.length).toBeGreaterThan(0);
    }
  });
});
