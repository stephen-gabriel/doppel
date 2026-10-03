import { decodeBase58 } from "./base58.ts";

export const SOLANA_PUBLIC_KEY_BYTES = 32;

export type AddressValidation =
  | { valid: true; address: string; bytes: Uint8Array }
  | { valid: false; address: string; reasons: string[] };

export function validateAddress(address: string): AddressValidation {
  const reasons: string[] = [];
  if (address.length === 0) {
    reasons.push("empty");
    return { valid: false, address, reasons };
  }

  const decoded = decodeBase58(address);
  if (decoded === null) {
    reasons.push("invalid_base58");
    return { valid: false, address, reasons };
  }
  if (decoded.length !== SOLANA_PUBLIC_KEY_BYTES) {
    reasons.push("invalid_byte_length");
    return { valid: false, address, reasons };
  }

  return { valid: true, address, bytes: decoded };
}

export function isValidAddress(address: string): boolean {
  return validateAddress(address).valid;
}
