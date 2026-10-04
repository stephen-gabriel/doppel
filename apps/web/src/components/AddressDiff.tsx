"use client";

import { useState } from "react";
import { overlappingPrefixLength, overlappingSuffixLength } from "@doppel/engine";
import { Button } from "./Button";

export function AddressDiff(props: { address: string; other: string; label: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const prefix = overlappingPrefixLength(props.address, props.other);
  const suffix = overlappingSuffixLength(props.address, props.other, prefix);
  const middleEnd = Math.max(prefix, props.address.length - suffix);
  const start = props.address.slice(0, prefix);
  const middle = props.address.slice(prefix, middleEnd);
  const end = props.address.slice(middleEnd);

  return (
    <div>
      <p className="mb-1 text-sm text-muted">{props.label}</p>
      <p className="break-all font-mono text-[15px] leading-6">
        <span className="text-iris">{start}</span>
        <span>{middle}</span>
        <span className="text-iris">{end}</span>
      </p>
      <Button
        variant="secondary"
        size="sm"
        className="mt-2"
        aria-label={`Copy full address: ${props.label}`}
        onClick={() => { void navigator.clipboard?.writeText(props.address)
          .then(() => setMessage("Address copied."))
          .catch(() => setMessage("Copy unavailable. Select the full address above to copy it."));
          if (!navigator.clipboard) setMessage("Copy unavailable. Select the full address above to copy it."); }}
      >
        Copy full address
      </Button>
      {message ? <p className="text-sm text-muted" role="status">{message}</p> : null}
    </div>
  );
}
