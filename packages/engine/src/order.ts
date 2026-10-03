import type { TransferEvent } from "./schemas.ts";

export type EventOrder = "before" | "after" | "unknown";

export function hasChainTimestamp(event: TransferEvent): boolean {
  return event.blockTime !== null;
}

export function compareEventOrder(left: TransferEvent, right: TransferEvent): EventOrder {
  if (left.blockTime !== null && right.blockTime !== null) {
    if (left.blockTime < right.blockTime) {
      return "before";
    }
    if (left.blockTime > right.blockTime) {
      return "after";
    }
    if (left.slot < right.slot) {
      return "before";
    }
    if (left.slot > right.slot) {
      return "after";
    }
    return "unknown";
  }

  if (left.blockTime === null && right.blockTime === null) {
    if (left.slot < right.slot) {
      return "before";
    }
    if (left.slot > right.slot) {
      return "after";
    }
    return "unknown";
  }

  return "unknown";
}

export function millisecondsBetween(left: TransferEvent, right: TransferEvent): number | null {
  if (left.blockTime === null || right.blockTime === null) {
    return null;
  }
  return right.blockTime - left.blockTime;
}

export function isAtOrBeforeCutoff(event: TransferEvent, cutoff: number): boolean | "unknown" {
  if (event.blockTime === null) {
    return "unknown";
  }
  return event.blockTime <= cutoff;
}
