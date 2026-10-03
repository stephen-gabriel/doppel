import { SystemProgram, Transaction, type TransactionInstruction } from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  decodeTransferCheckedInstruction,
  decodeTransferInstruction,
} from "@solana/spl-token";
import { isSupportedPaymentAsset, resolveAsset, type Draft } from "@doppel/engine";

export const SYSTEM_PROGRAM = SystemProgram.programId.toBase58();
export const TOKEN_PROGRAM = TOKEN_PROGRAM_ID.toBase58();
export const ASSOCIATED_TOKEN_PROGRAM = ASSOCIATED_TOKEN_PROGRAM_ID.toBase58();
export const COMPUTE_BUDGET_PROGRAM = "ComputeBudget111111111111111111111111111111";

export type TokenAccountFact = {
  address: string;
  mint: string;
  owner: string;
};

export type InspectedTransfer = {
  ok: boolean;
  reasonCodes: string[];
  sender: string | null;
  destinationOwner: string | null;
  destinationTokenAccount: string | null;
  mint: string | null;
  amountRaw: string | null;
};

function decodeSystemTransfer(ix: TransactionInstruction): {
  from: string;
  to: string;
  lamports: string;
} | null {
  if (!ix.programId.equals(SystemProgram.programId)) {
    return null;
  }
  if (ix.data.length !== 12 || ix.keys.length !== 2 || !ix.keys[0]?.isSigner ||
      !ix.keys[0]?.isWritable || !ix.keys[1]?.isWritable) {
    return null;
  }
  const type = ix.data.readUInt32LE(0);
  if (type !== 2) {
    return null;
  }
  const lamports = ix.data.readBigUInt64LE(4);
  const from = ix.keys[0]?.pubkey.toBase58() ?? null;
  const to = ix.keys[1]?.pubkey.toBase58() ?? null;
  if (!from || !to) {
    return null;
  }
  return { from, to, lamports: lamports.toString() };
}

export function inspectCompiledTransaction(
  draft: Draft,
  tx: Transaction,
  options: {
    destinationTokenAccount?: TokenAccountFact | null;
    sourceTokenAccount?: TokenAccountFact | null;
  } = {},
): InspectedTransfer {
  const reasons: string[] = [];
  if (!isSupportedPaymentAsset(draft.cluster, draft.asset)) reasons.push("inspect.unsupported_asset");
  if (!/^\d+$/.test(draft.amountRaw) || BigInt(draft.amountRaw) <= 0n ||
      BigInt(draft.amountRaw) > 18_446_744_073_709_551_615n) reasons.push("inspect.invalid_amount");
  if (!tx.recentBlockhash) reasons.push("inspect.missing_blockhash");
  if (tx.nonceInfo) reasons.push("inspect.unsupported_nonce");
  const feePayer = tx.feePayer?.toBase58() ?? null;
  if (!feePayer) {
    reasons.push("inspect.missing_fee_payer");
  } else if (feePayer !== draft.sender) {
    reasons.push("inspect.fee_payer_mismatch");
  }

  const transfers: InspectedTransfer[] = [];
  for (const ix of tx.instructions) {
    const system = decodeSystemTransfer(ix);
    if (system) {
      transfers.push({
        ok: true,
        reasonCodes: [],
        sender: system.from,
        destinationOwner: system.to,
        destinationTokenAccount: null,
        mint: "SOL",
        amountRaw: system.lamports,
      });
      continue;
    }
    if (ix.programId.equals(TOKEN_PROGRAM_ID)) {
      try {
        const checked = decodeTransferCheckedInstruction(ix, TOKEN_PROGRAM_ID);
        if (ix.keys.length !== 4 || !checked.keys.owner.isSigner ||
            !checked.keys.source.isWritable || !checked.keys.destination.isWritable ||
            checked.data.decimals !== resolveAsset(draft.cluster, draft.asset).decimals) {
          reasons.push("inspect.invalid_token_instruction");
        }
        const source = options.sourceTokenAccount;
        if (!source || source.address !== checked.keys.source.pubkey.toBase58() ||
            source.owner !== draft.sender || source.mint !== draft.asset) {
          reasons.push("inspect.source_token_unverified");
        }
        transfers.push({
          ok: true,
          reasonCodes: [],
          sender: checked.keys.owner.pubkey.toBase58(),
          destinationOwner: null,
          destinationTokenAccount: checked.keys.destination.pubkey.toBase58(),
          mint: checked.keys.mint.pubkey.toBase58(),
          amountRaw: checked.data.amount.toString(),
        });
        continue;
      } catch {
        try {
          const plain = decodeTransferInstruction(ix, TOKEN_PROGRAM_ID);
          if (ix.keys.length !== 3 || !plain.keys.owner.isSigner ||
              !plain.keys.source.isWritable || !plain.keys.destination.isWritable) {
            reasons.push("inspect.invalid_token_instruction");
          }
          const source = options.sourceTokenAccount;
          if (!source || source.address !== plain.keys.source.pubkey.toBase58() ||
              source.owner !== draft.sender || source.mint !== draft.asset) {
            reasons.push("inspect.source_token_unverified");
          }
          transfers.push({
            ok: true,
            reasonCodes: [],
            sender: plain.keys.owner.pubkey.toBase58(),
            destinationOwner: null,
            destinationTokenAccount: plain.keys.destination.pubkey.toBase58(),
            mint: null,
            amountRaw: plain.data.amount.toString(),
          });
          continue;
        } catch {
          reasons.push("inspect.unparsed_token_instruction");
          continue;
        }
      }
    }
    // Only a direct transfer to existing accounts is supported in this boundary.
    reasons.push("inspect.unsupported_instruction");
  }

  if (transfers.length !== 1) {
    reasons.push("inspect.expected_one_transfer");
  }
  const transfer = transfers[0];
  if (!transfer) {
    return {
      ok: false,
      reasonCodes: reasons,
      sender: null,
      destinationOwner: null,
      destinationTokenAccount: null,
      mint: null,
      amountRaw: null,
    };
  }
  if (!transfer.sender) {
    reasons.push("inspect.missing_sender");
  } else if (transfer.sender !== draft.sender) {
    reasons.push("inspect.sender_mismatch");
  }
  if (!transfer.amountRaw) {
    reasons.push("inspect.missing_amount");
  } else if (transfer.amountRaw !== draft.amountRaw) {
    reasons.push("inspect.amount_mismatch");
  }

  const expectedMint = resolveAsset(draft.cluster, draft.asset);
  if (expectedMint.kind === "sol") {
    if (transfer.mint !== "SOL") {
      reasons.push("inspect.asset_mismatch");
    }
    if (!transfer.destinationOwner) {
      reasons.push("inspect.missing_destination");
    } else if (transfer.destinationOwner !== draft.destination) {
      reasons.push("inspect.destination_mismatch");
    }
  } else {
    const fact = options.destinationTokenAccount ?? null;
    if (!fact) {
      reasons.push("inspect.destination_token_unverified");
    } else {
      if (fact.mint !== draft.asset) {
        reasons.push("inspect.destination_mint_mismatch");
      }
      if (fact.owner !== draft.destination) {
        reasons.push("inspect.destination_owner_mismatch");
      }
      if (transfer.destinationTokenAccount !== fact.address) {
        reasons.push("inspect.destination_token_mismatch");
      }
    }
    if (transfer.mint && transfer.mint !== draft.asset) {
      reasons.push("inspect.asset_mismatch");
    }
    if (!transfer.destinationTokenAccount) {
      reasons.push("inspect.destination_unresolved");
    }
  }

  return {
    ok: reasons.length === 0,
    reasonCodes: reasons,
    sender: transfer.sender,
    destinationOwner: transfer.destinationOwner,
    destinationTokenAccount: transfer.destinationTokenAccount,
    mint: transfer.mint,
    amountRaw: transfer.amountRaw,
  };
}

export const inspectPreparedTransaction = inspectCompiledTransaction;
