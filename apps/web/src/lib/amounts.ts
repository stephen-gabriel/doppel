/** Decimal text only: no floating-point conversion or silent rounding of money. */
export function parseDisplayAmount(value: string, decimals: number): string | null {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18 || value.length > 100) return null;
  const match = /^(\d+)(?:\.(\d*))?$/.exec(value.trim());
  if (!match || (match[2]?.length ?? 0) > decimals) return null;
  const raw = BigInt(`${match[1]}${(match[2] ?? "").padEnd(decimals, "0")}`);
  if (raw <= 0n || raw > 18_446_744_073_709_551_615n) return null;
  return raw.toString();
}

export function formatRawAmount(raw: string, decimals: number): string {
  if (!/^\d+$/.test(raw) || !Number.isInteger(decimals) || decimals < 0 || decimals > 18) return raw;
  const digits = BigInt(raw).toString().padStart(decimals + 1, "0");
  if (decimals === 0) return digits;
  const fraction = digits.slice(-decimals).replace(/0+$/, "");
  return `${digits.slice(0, -decimals)}${fraction ? `.${fraction}` : ""}`;
}
