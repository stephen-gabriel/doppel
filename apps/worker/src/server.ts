import { createServer } from "node:http";
import type { MonitorStore } from "./store.ts";

export function monitorServer(store: MonitorStore) {
  return createServer((request, response) => {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Content-Type", "application/json");
    response.setHeader("X-Content-Type-Options", "nosniff");
    if (request.method !== "GET" || request.url !== "/snapshot") {
      response.writeHead(404); response.end(JSON.stringify({ error: "not_found" })); return;
    }
    try { response.end(JSON.stringify(store.snapshot())); }
    catch { response.writeHead(503); response.end(JSON.stringify({ error: "snapshot_unavailable" })); }
  });
}
