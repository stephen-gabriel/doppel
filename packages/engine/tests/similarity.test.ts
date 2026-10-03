import { describe, expect, it } from "vitest";
import { compareAddresses, isCandidateResemblance } from "../src/similarity.ts";
import { findAsymmetricPair } from "./helpers/lookalikes.ts";

const PUBLISHED_SPOOF = "4yfuQCL4fnNfSbBgqFcPTFn5GGZABDaEFQLhGpwjizcY";
const PUBLISHED_REAL = "4yfu48qwim7hGzD3Nphzd2A6ThydzysfKi4wBPFSgnhY";

describe("address similarity", () => {
  it("measures the published pair as prefix 4 / suffix 1 and a candidate", () => {
    const comparison = compareAddresses(PUBLISHED_SPOOF, PUBLISHED_REAL);
    expect(comparison.status).toBe("different");
    if (comparison.status === "different") {
      expect(comparison.prefix).toBe(4);
      expect(comparison.suffix).toBe(1);
      expect(comparison.candidate).toBe(true);
      expect(isCandidateResemblance(4, 1)).toBe(true);
    }
  });

  it("does not treat identical addresses as lookalikes", () => {
    const comparison = compareAddresses(PUBLISHED_REAL, PUBLISHED_REAL);
    expect(comparison.status).toBe("identical");
    if (comparison.status === "identical") {
      expect(comparison.candidate).toBe(false);
    }
  });

  it("is case-sensitive", () => {
    const comparison = compareAddresses(PUBLISHED_REAL, PUBLISHED_REAL.toLowerCase());
    expect(comparison.status).not.toBe("identical");
  });

  it("recognizes a generated 1+4 pair as a candidate", () => {
    const pair = findAsymmetricPair(1, 4);
    const comparison = compareAddresses(pair.left, pair.right);
    expect(comparison.status).toBe("different");
    if (comparison.status === "different") {
      expect(comparison.prefix).toBe(1);
      expect(comparison.suffix).toBe(4);
      expect(comparison.candidate).toBe(true);
    }
  });

  it("does not classify prefix-only or suffix-only as v0.1 candidates", () => {
    expect(isCandidateResemblance(5, 0)).toBe(false);
    expect(isCandidateResemblance(0, 5)).toBe(false);
    expect(isCandidateResemblance(4, 0)).toBe(false);
    expect(isCandidateResemblance(1, 1)).toBe(false);
    expect(isCandidateResemblance(2, 2)).toBe(true);
  });

  it("returns invalid when an address is not 32 bytes", () => {
    const comparison = compareAddresses(PUBLISHED_REAL, "not-an-address");
    expect(comparison.status).toBe("invalid");
  });
});
