export type RpcRequest = {
  method: string;
  params: unknown[];
};

export type RpcError = {
  code: number;
  message: string;
};

export class RpcClient {
  private readonly endpoint: string;
  private readonly fetchImpl: typeof fetch;

  constructor(endpoint: string, fetchImpl: typeof fetch = fetch) {
    this.endpoint = endpoint;
    this.fetchImpl = fetchImpl;
  }

  async call<T>(
    request: RpcRequest,
    options: { signal?: AbortSignal | undefined; timeoutMs?: number | undefined } = {},
  ): Promise<T> {
    const timeoutMs = options.timeoutMs ?? 15_000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const onAbort = () => controller.abort();
    options.signal?.addEventListener("abort", onAbort);
    if (options.signal?.aborted) controller.abort();
    try {
      const response = await this.fetchImpl(this.endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: request.method,
          params: request.params,
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`rpc_http_${response.status}`);
      }
      const payload = (await response.json()) as {
        result?: T;
        error?: RpcError;
      };
      if (payload.error) {
        throw new Error(`rpc_${payload.error.code}:${payload.error.message}`);
      }
      if (payload.result === undefined) {
        throw new Error("rpc_empty_result");
      }
      return payload.result;
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", onAbort);
    }
  }
}

export type SignatureInfo = {
  signature: string;
  slot: number;
  err: unknown;
  blockTime: number | null;
};

export type ParsedInstruction = {
  program?: string;
  programId?: string;
  parsed?: {
    type?: string;
    info?: Record<string, unknown>;
  };
  accounts?: string[];
};

export type ParsedInnerInstruction = {
  index: number;
  instructions: ParsedInstruction[];
};

export type TokenBalance = {
  accountIndex: number;
  mint: string;
  owner?: string;
  uiTokenAmount?: { decimals?: number; amount?: string };
};

export type ParsedTransaction = {
  slot: number;
  blockTime: number | null;
  meta: {
    err: unknown;
    innerInstructions?: ParsedInnerInstruction[];
    preTokenBalances?: TokenBalance[];
    postTokenBalances?: TokenBalance[];
    loadedAddresses?: { writable?: string[]; readonly?: string[] };
  } | null;
  transaction: {
    signatures: string[];
    message: {
      accountKeys: Array<string | { pubkey: string; signer?: boolean; writable?: boolean }>;
      instructions: ParsedInstruction[];
    };
  };
};
