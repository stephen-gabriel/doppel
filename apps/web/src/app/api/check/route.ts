import { NextResponse } from "next/server";
import {
  evaluatePattern,
  isSupportedPaymentAsset,
  isValidAddress,
  MAINNET_USDC_MINT,
  poisoningHistoryAssets,
} from "@doppel/engine";
import { HistoryCache } from "@doppel/sources";
import { readerFor } from "../../../lib/history-provider";
import { CheckRequestSchema } from "../../../lib/check-contract";
import { readBoundedJson, RequestLimiter } from "../../../lib/request-limits";

const cache = new HistoryCache(30_000);
const limiter = new RequestLimiter();
let activeChecks = 0;

export async function POST(request: Request) {
  const retry = limiter.take((request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local").slice(0, 100));
  if (retry !== null || activeChecks >= 4) return NextResponse.json({ error: "rate_limited",
    message: "Too many checks. Wait a minute and try again." }, { status: 429, headers: { "Retry-After": String(retry ?? 60), "Cache-Control": "no-store" } });
  let body: unknown;
  try {
    body = await readBoundedJson(request);
  } catch (error) {
    const tooLarge = error instanceof Error && error.message === "request_too_large";
    return NextResponse.json({ error: tooLarge ? "request_too_large" : "invalid_json" }, { status: tooLarge ? 413 : 400 });
  }

  const parsed = CheckRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", details: parsed.error.issues }, { status: 400 });
  }

  const input = parsed.data;
  if ("rpcUrl" in (body as object) || "endpoint" in (body as object)) {
    return NextResponse.json({ error: "arbitrary_rpc_rejected" }, { status: 400 });
  }
  if (!isValidAddress(input.sender) || !isValidAddress(input.destination)) {
    return NextResponse.json({ error: "invalid_address" }, { status: 400 });
  }
  if (!isSupportedPaymentAsset(input.cluster, input.asset)) {
    return NextResponse.json(
      {
        error: "unsupported_asset",
        message:
          input.asset === "USDC"
            ? "Use the cluster-canonical USDC mint, not the USDC symbol."
            : "Asset is not SOL or the cluster-canonical USDC mint.",
        canonicalMainnetUsdc: MAINNET_USDC_MINT,
      },
      { status: 400 },
    );
  }

  const configuredMax = Number(process.env.HISTORY_MAX_TRANSACTIONS ?? 100);
  const maxTransactions = input.maxTransactions ?? (Number.isInteger(configuredMax) && configuredMax > 0 ? Math.min(configuredMax, 100) : 100);
  const historyAssets = poisoningHistoryAssets(input.cluster);
  const historyRequest = {
    cluster: input.cluster,
    wallet: input.sender,
    assets: historyAssets,
    maxTransactions,
  };

  const cached = cache.get(historyRequest);
  const controller = new AbortController();
  const abort = () => controller.abort();
  request.signal.addEventListener("abort", abort, { once: true });
  if (request.signal.aborted) controller.abort();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  activeChecks++;
  try {
    const history = cached ?? (await readerFor(input.cluster).readHistory(historyRequest, controller.signal));
    if (!cached && history.coverage.status !== "unavailable") {
      cache.set(historyRequest, history);
    }
    const pattern = evaluatePattern({
      sender: input.sender,
      destination: input.destination,
      events: history.events,
      coverage: history.coverage.status,
      now: Date.now(),
    });
    return NextResponse.json({
      pattern: pattern.pattern,
      reasonCodes: pattern.reasonCodes,
      evidence: pattern.evidence,
      previouslyPaid: pattern.previouslyPaid,
      incomingOnly: pattern.incomingOnly,
      events: history.events,
      coverage: {
        ...history.coverage,
        warnings: [
          ...history.coverage.warnings,
          `Payment asset ${input.asset}. Poisoning history searched across ${historyAssets.join(" and ")}.`,
        ],
      },
      historyAssets,
      ruleVersion: pattern.ruleVersion,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(
      {
        error: "lookup_failed",
        message: "History lookup is unavailable. Your saved-address comparison still works; try again later.",
        coverage: {
          status: "unavailable",
          wallet: input.sender,
          cluster: input.cluster,
          origin: "chain",
          mode: "historical",
          provider: "public-rpc",
          warnings: ["History lookup failed."],
        },
      },
      { status: 503 },
    );
  } finally {
    activeChecks--;
    request.signal.removeEventListener("abort", abort);
    clearTimeout(timeout);
  }
}
