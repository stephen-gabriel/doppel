import { Keypair } from "@solana/web3.js";

export type HarnessKey = {
  publicKey: string;
  secretKey: Uint8Array;
};

export function generateDisposableKey(): HarnessKey {
  const keypair = Keypair.generate();
  return {
    publicKey: keypair.publicKey.toBase58(),
    secretKey: keypair.secretKey,
  };
}

export function keypairFromSecret(secretKey: Uint8Array): Keypair {
  return Keypair.fromSecretKey(secretKey);
}
