import type { CoverageEnvelope, TransferEvent } from "@doppel/engine";

export type HistoryRequest = {
  cluster: CoverageEnvelope["cluster"];
  wallet: string;
  assets: string[];
  maxTransactions: number;
};

export type HistoryEnvelope = {
  events: TransferEvent[];
  coverage: CoverageEnvelope;
};

export interface ChainReader {
  readHistory(request: HistoryRequest, signal?: AbortSignal): Promise<HistoryEnvelope>;
}

export interface TransferSource {
  start(request: { wallets: string[] }, onEvent: (event: TransferEvent) => void): Promise<void>;
  stop(): Promise<void>;
}
