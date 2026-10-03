import { ComputeBudgetInstruction, ComputeBudgetProgram, Connection, Message, PublicKey, SystemInstruction, SystemProgram, Transaction } from "@solana/web3.js";
import { formatRawAmount } from "./amounts";
import { assertDevnetEndpoint, assertObservedDevnetGenesis, submitSignedTransaction } from "@doppel/harness";

export const DEVNET_ENDPOINT = "https://api.devnet.solana.com";
// Devnet test-fund limits, not USD budgets or permission to send on mainnet.
export const MAX_WALLET_PRIORITY_FEE_LAMPORTS = 100_000n;
export const MAX_WALLET_TOTAL_FEE_LAMPORTS = 120_000n;
const MAX_COMPUTE_UNITS = 1_400_000;

type SigningProvider = {
  isPhantom?: boolean;
  isSolflare?: boolean;
  publicKey?: PublicKey | null;
  connect: () => Promise<{ publicKey: PublicKey }>;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
};

export function walletAvailability(): { available: boolean; name: string; address: string | null } {
  if (typeof window === "undefined") return { available: false, name: "Wallet", address: null };
  const wallet = window.phantom?.solana ?? window.solflare ?? window.solana;
  return { available: Boolean(wallet?.connect && wallet?.signTransaction),
    name: window.phantom?.solana || wallet?.isPhantom ? "Phantom" : window.solflare || wallet?.isSolflare ? "Solflare" : "Solana wallet",
    address: wallet?.publicKey?.toBase58() ?? null };
}

declare global {
  interface Window {
    solana?: SigningProvider;
    phantom?: { solana?: SigningProvider };
    solflare?: SigningProvider;
  }
}

function provider(): SigningProvider {
  if (typeof window === "undefined") throw new Error("wallet_unavailable");
  const wallet = window.phantom?.solana ?? window.solflare ?? window.solana;
  if (!wallet?.connect || !wallet.signTransaction) throw new Error("No compatible Solana wallet detected. Install Phantom or Solflare in this browser, then refresh this page.");
  return wallet;
}

export async function connectWallet(): Promise<string> {
  const wallet = provider();
  const connected = await wallet.connect();
  return connected.publicKey.toBase58();
}

export type WalletRequest = {
  transaction: Transaction;
  cluster: "mainnet-beta" | "devnet";
  sender: string;
  lastValidBlockHeight: number;
  revalidate: () => Promise<boolean>;
  onFeeChecked?: (message: string) => void;
};

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((byte, index) => byte === b[index]);
}

/** Compare resolved message semantics, not SDK objects or account-index ordering. */
function describeMessage(message: Message) {
  return {
    feePayer: message.accountKeys[0]?.toBase58(),
    blockhash: message.recentBlockhash,
    accounts: message.accountKeys.map((key, index) => ({ key: key.toBase58(),
      signer: message.isAccountSigner(index), writable: message.isAccountWritable(index) }))
      .sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0),
    instructions: message.instructions.map((ix) => ({
      program: message.accountKeys[ix.programIdIndex]?.toBase58(),
      accounts: ix.accounts.map((index) => message.accountKeys[index]?.toBase58()), data: ix.data,
    })),
  };
}

export type WalletMessageCheck = { walletAddedComputeBudget: boolean; priorityFeeLamports: bigint };

function validateAddedComputeBudget(message: Message): bigint {
  const transaction = Transaction.populate(message);
  let units: number | null = null;
  let price: bigint | null = null;
  for (const ix of transaction.instructions.filter((item) => item.programId.equals(ComputeBudgetProgram.programId))) {
    if (ix.keys.length !== 0) throw new Error("Wallet compute-budget instructions must not reference accounts. Nothing was submitted.");
    if (ix.data[0] === 2 && ix.data.length === 5 && units === null) {
      units = ComputeBudgetInstruction.decodeSetComputeUnitLimit(ix).units;
      if (units <= 0 || units > MAX_COMPUTE_UNITS) throw new Error("Wallet compute-unit limit is outside the allowed range. Nothing was submitted.");
    } else if (ix.data[0] === 3 && ix.data.length === 9 && price === null) {
      price = BigInt(ComputeBudgetInstruction.decodeSetComputeUnitPrice(ix).microLamports);
    } else {
      throw new Error("Unsupported, malformed or duplicate wallet compute-budget setting. Nothing was submitted.");
    }
  }
  if (price !== null && price > 0n && units === null) {
    throw new Error("Wallet priority fee has no explicit compute-unit limit. Nothing was submitted.");
  }
  const priorityFee = (BigInt(units ?? 0) * (price ?? 0n) + 999_999n) / 1_000_000n;
  if (priorityFee > MAX_WALLET_PRIORITY_FEE_LAMPORTS) {
    throw new Error(`Wallet priority fee is ${formatRawAmount(priorityFee.toString(), 9)} test SOL, above Doppel's ${formatRawAmount(MAX_WALLET_PRIORITY_FEE_LAMPORTS.toString(), 9)} test SOL limit. Lower the wallet priority fee and run a fresh check. Nothing was submitted.`);
  }
  return priorityFee;
}

export function assertUnchangedWalletMessage(expectedBytes: Uint8Array, actualBytes: Uint8Array): WalletMessageCheck {
  if (sameBytes(expectedBytes, actualBytes)) return { walletAddedComputeBudget: false, priorityFeeLamports: 0n };
  const before = describeMessage(Message.from(expectedBytes));
  const actual = Message.from(actualBytes);
  const after = describeMessage(actual);
  const computeProgram = ComputeBudgetProgram.programId.toBase58();
  const walletAddedComputeBudget = !before.accounts.some((account) => account.key === computeProgram)
    && after.instructions.some((ix) => ix.program === computeProgram);
  let priorityFeeLamports = 0n;
  if (walletAddedComputeBudget) {
    const account = after.accounts.find((item) => item.key === computeProgram);
    if (!account || account.signer || account.writable) throw new Error("Wallet changed compute-program signing permissions. Nothing was submitted.");
    priorityFeeLamports = validateAddedComputeBudget(actual);
    // Only this bounded no-account program may be added. Preserve every payment
    // instruction byte and order, original account permission, payer and blockhash.
    after.accounts = after.accounts.filter((item) => item.key !== computeProgram);
    after.instructions = after.instructions.filter((item) => item.program !== computeProgram);
  }
  const changes: string[] = [];
  if (before.feePayer !== after.feePayer) changes.push("fee-paying wallet changed");
  if (before.blockhash !== after.blockhash) changes.push("recent blockhash changed");
  if (JSON.stringify(before.accounts) !== JSON.stringify(after.accounts)) changes.push("accounts or signing permissions changed");
  if (JSON.stringify(before.instructions) !== JSON.stringify(after.instructions)) {
    changes.push(`instruction contents changed (${before.instructions.length} prepared, ${after.instructions.length} returned)`);
    const added = after.instructions.filter((ix) => !before.instructions.some((old) => JSON.stringify(old) === JSON.stringify(ix)));
    if (added.length) changes.push(`returned changed/new programs: ${[...new Set(added.map((ix) => ix.program))].join(", ")}`);
  }
  // Account-index reordering is harmless only if the resolved accounts, privileges,
  // instruction bytes/order, fee payer and blockhash are all identical.
  if (changes.length) throw new Error(`Wallet returned a changed transaction: ${changes.join("; ")}. Nothing was submitted. Do not increase the amount; share this message so we can inspect the wallet's changes.`);
  return { walletAddedComputeBudget, priorityFeeLamports };
}

export async function requestWalletSignature(request: WalletRequest): Promise<string> {
  if (request.cluster !== "devnet") throw new Error("mainnet_send_forbidden");
  const wallet = provider();
  if (wallet.publicKey?.toBase58() !== request.sender) throw new Error("Connected wallet does not match the checked sender.");
  assertDevnetEndpoint(DEVNET_ENDPOINT);
  const connection = new Connection(DEVNET_ENDPOINT, "confirmed");
  assertObservedDevnetGenesis({ endpoint: connection.rpcEndpoint,
    genesisHash: await connection.getGenesisHash(), observed: true });
  // Freeze a wire snapshot before passing anything to a separately bundled extension SDK.
  // Its transaction/Buffer implementation need not be the same instance as ours.
  const wire = request.transaction.serialize({ requireAllSignatures: false, verifySignatures: false });
  const prepared = Transaction.from(Uint8Array.from(wire));
  const expectedMessage = Uint8Array.from(prepared.serializeMessage());
  const blockhash = prepared.recentBlockhash;
  if (!blockhash || !(await request.revalidate())) throw new Error("Payment changed or check expired before signing.");
  // Wallet signs only. Broadcasting never follows the wallet's selected network.
  const returned = await wallet.signTransaction(prepared);
  // Inspect the actual wire bytes returned, then use our own SDK to verify/broadcast.
  const signed = Transaction.from(Uint8Array.from(returned.serialize({ requireAllSignatures: false, verifySignatures: false })));
  const checked = assertUnchangedWalletMessage(expectedMessage, Uint8Array.from(signed.serializeMessage()));
  if (wallet.publicKey?.toBase58() !== request.sender || !(await request.revalidate())) {
    throw new Error("Payment changed or check expired while signing. Nothing was submitted.");
  }
  if (!signed.verifySignatures()) throw new Error("Invalid or missing transaction signature.");
  if (checked.walletAddedComputeBudget) {
    const [fee, balance] = await Promise.all([
      connection.getFeeForMessage(signed.compileMessage(), "confirmed"),
      connection.getBalance(new PublicKey(request.sender), "confirmed"),
    ]);
    if (fee.value === null || !Number.isSafeInteger(fee.value) || fee.value < 0 || !Number.isSafeInteger(balance)) {
      throw new Error("Could not verify the wallet-adjusted network fee. Run a fresh check. Nothing was submitted.");
    }
    if (BigInt(fee.value) > MAX_WALLET_TOTAL_FEE_LAMPORTS) {
      throw new Error(`Wallet-adjusted network fee exceeds ${formatRawAmount(MAX_WALLET_TOTAL_FEE_LAMPORTS.toString(), 9)} test SOL. Lower the wallet fee and check again. Nothing was submitted.`);
    }
    const original = Transaction.populate(Message.from(expectedMessage));
    let paymentLamports = 0n;
    for (const ix of original.instructions) {
      if (ix.programId.equals(SystemProgram.programId)) paymentLamports += BigInt(SystemInstruction.decodeTransfer(ix).lamports);
    }
    if (BigInt(balance) < paymentLamports + BigInt(fee.value)) {
      throw new Error("Sending wallet needs more devnet SOL for the payment plus the wallet-adjusted fee. Nothing was submitted.");
    }
    request.onFeeChecked?.(`Wallet-adjusted network fee checked: ${formatRawAmount(String(fee.value), 9)} test SOL, including ${formatRawAmount(checked.priorityFeeLamports.toString(), 9)} test SOL priority fee.`);
  }
  const signature = await submitSignedTransaction(connection, signed, "devnet", request.revalidate);
  const result = await connection.confirmTransaction({ signature, blockhash,
    lastValidBlockHeight: request.lastValidBlockHeight }, "confirmed");
  if (result.value.err) throw new Error(`Devnet transaction failed: ${JSON.stringify(result.value.err)}`);
  return signature;
}
