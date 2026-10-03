import { BASE58_ALPHABET } from "../../src/base58.ts";
import { validateAddress } from "../../src/address.ts";
import {
  overlappingPrefixLength,
  overlappingSuffixLength,
} from "../../src/similarity.ts";

const SEED = "4yfu48qwim7hGzD3Nphzd2A6ThydzysfKi4wBPFSgnhY";

function middleFromCounter(length: number, counter: number): string {
  let remaining = counter;
  let middle = "";
  for (let i = 0; i < length; i += 1) {
    middle = `${BASE58_ALPHABET[remaining % 58]}${middle}`;
    remaining = Math.floor(remaining / 58);
  }
  return middle;
}

export function findAsymmetricPair(
  prefixWant: number,
  suffixWant: number,
  seed = SEED,
): { left: string; right: string; prefix: number; suffix: number } {
  const prefix = seed.slice(0, prefixWant);
  const suffix = seed.slice(seed.length - suffixWant);
  const middleLength = seed.length - prefixWant - suffixWant;
  if (middleLength < 1) {
    throw new Error("seed address too short for requested edges");
  }

  for (let counter = 1; counter < 200_000; counter += 1) {
    const candidate = `${prefix}${middleFromCounter(middleLength, counter)}${suffix}`;
    if (candidate === seed) {
      continue;
    }
    if (!validateAddress(candidate).valid) {
      continue;
    }
    const measuredPrefix = overlappingPrefixLength(seed, candidate);
    const measuredSuffix = overlappingSuffixLength(seed, candidate, measuredPrefix);
    if (measuredPrefix === prefixWant && measuredSuffix === suffixWant) {
      return {
        left: seed,
        right: candidate,
        prefix: measuredPrefix,
        suffix: measuredSuffix,
      };
    }
  }
  throw new Error(`Unable to synthesize ${prefixWant}+${suffixWant} pair`);
}
