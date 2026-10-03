import { NextResponse } from "next/server";
import { historyProviderStatus } from "../../../lib/history-provider";

export function GET() {
  return NextResponse.json({
    cluster: process.env.DEFAULT_CLUSTER ?? "mainnet-beta",
    provider: historyProviderStatus().activeProvider,
    providerRouting: historyProviderStatus(),
    solamiIntegration: "rpc_configurable_stream_pending",
    solamiTrial: "account_status_not_observed",
    rpsLimit: Number(process.env.RPC_RPS_LIMIT ?? 5),
    historyMaxTransactions: Number(process.env.HISTORY_MAX_TRANSACTIONS ?? 100),
    signing: "devnet_only",
    throttling: "instance_local_best_effort",
    mainnetWrite: false,
  });
}
