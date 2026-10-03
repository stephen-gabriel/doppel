export const BASE58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export function decodeBase58(input: string): Uint8Array | null {
  if (input.length === 0) {
    return null;
  }

  const bytes = [0];
  for (const char of input) {
    const value = BASE58_ALPHABET.indexOf(char);
    if (value === -1) {
      return null;
    }
    let carry = value;
    for (let i = 0; i < bytes.length; i += 1) {
      carry += (bytes[i] ?? 0) * 58;
      bytes[i] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }

  let leadingZeros = 0;
  for (let i = 0; i < input.length && input[i] === "1"; i += 1) {
    leadingZeros += 1;
  }

  const output = new Uint8Array(leadingZeros + bytes.length);
  for (let i = 0; i < bytes.length; i += 1) {
    output[output.length - 1 - i] = bytes[i] ?? 0;
  }
  return output;
}

export function encodeBase58(bytes: Uint8Array): string {
  if (bytes.length === 0) {
    return "";
  }

  const digits = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let i = 0; i < digits.length; i += 1) {
      carry += (digits[i] ?? 0) * 256;
      digits[i] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }

  let leadingZeros = 0;
  for (const byte of bytes) {
    if (byte !== 0) {
      break;
    }
    leadingZeros += 1;
  }

  const encoded = digits
    .reverse()
    .map((digit) => BASE58_ALPHABET[digit])
    .join("");
  return `${"1".repeat(leadingZeros)}${encoded}`;
}
