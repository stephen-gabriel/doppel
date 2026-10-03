import { NextResponse } from "next/server";
import { clusterEndpoint } from "@doppel/sources";
import { assertDevnetEndpoint, fetchRpcGenesis } from "@doppel/harness";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const cluster = url.searchParams.get("cluster");
  if (cluster !== "devnet") {
    return NextResponse.json({ error: "mainnet_send_forbidden" }, { status: 400 });
  }
  const endpoint = clusterEndpoint("devnet");
  try {
    assertDevnetEndpoint(endpoint);
    const identity = await fetchRpcGenesis(endpoint);
    return NextResponse.json(identity);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "genesis_failed" },
      { status: 503 },
    );
  }
}
