import { z } from "zod";

export const CheckRequestSchema = z.object({
  cluster: z.enum(["mainnet-beta", "devnet"]),
  sender: z.string().min(32).max(44),
  destination: z.string().min(32).max(44),
  asset: z.string().min(1).max(44),
  amountRaw: z.string().max(20).regex(/^\d+$/).optional(),
  historyAssets: z.array(z.string().max(44)).max(2).optional(),
  maxTransactions: z.number().int().positive().max(100).optional(),
}).strict();

export type CheckRequest = z.infer<typeof CheckRequestSchema>;
