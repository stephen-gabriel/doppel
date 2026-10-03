import { RULE_VERSION } from "./schemas.ts";
import { validateAddress } from "./address.ts";

export type AddressComparison =
  | {
      status: "invalid";
      left: string;
      right: string;
      reasons: string[];
    }
  | {
      status: "identical";
      left: string;
      right: string;
      prefix: number;
      suffix: number;
      candidate: false;
      ruleVersion: typeof RULE_VERSION;
    }
  | {
      status: "different";
      left: string;
      right: string;
      prefix: number;
      suffix: number;
      candidate: boolean;
      ruleVersion: typeof RULE_VERSION;
    };

export function overlappingPrefixLength(left: string, right: string): number {
  const limit = Math.min(left.length, right.length);
  let prefix = 0;
  while (prefix < limit && left[prefix] === right[prefix]) {
    prefix += 1;
  }
  return prefix;
}

export function overlappingSuffixLength(
  left: string,
  right: string,
  reservedPrefix: number,
): number {
  const leftRemain = left.length - reservedPrefix;
  const rightRemain = right.length - reservedPrefix;
  const limit = Math.min(leftRemain, rightRemain);
  let suffix = 0;
  while (
    suffix < limit &&
    left[left.length - 1 - suffix] === right[right.length - 1 - suffix]
  ) {
    suffix += 1;
  }
  return suffix;
}

export function isCandidateResemblance(prefix: number, suffix: number): boolean {
  if (prefix >= 2 && suffix >= 2) {
    return true;
  }
  return prefix + suffix >= 5 && prefix >= 1 && suffix >= 1;
}

export function compareAddresses(left: string, right: string): AddressComparison {
  const leftValidation = validateAddress(left);
  const rightValidation = validateAddress(right);
  if (!leftValidation.valid || !rightValidation.valid) {
    return {
      status: "invalid",
      left,
      right,
      reasons: [
        ...(leftValidation.valid ? [] : leftValidation.reasons.map((reason) => `left:${reason}`)),
        ...(rightValidation.valid ? [] : rightValidation.reasons.map((reason) => `right:${reason}`)),
      ],
    };
  }

  if (left === right) {
    return {
      status: "identical",
      left,
      right,
      prefix: left.length,
      suffix: left.length,
      candidate: false,
      ruleVersion: RULE_VERSION,
    };
  }

  const prefix = overlappingPrefixLength(left, right);
  const suffix = overlappingSuffixLength(left, right, prefix);
  return {
    status: "different",
    left,
    right,
    prefix,
    suffix,
    candidate: isCandidateResemblance(prefix, suffix),
    ruleVersion: RULE_VERSION,
  };
}
