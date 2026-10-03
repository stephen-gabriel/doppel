export function NetworkSelect(props: {
  id: string;
  value: "mainnet-beta" | "devnet";
  onChange: (value: "mainnet-beta" | "devnet") => void;
}) {
  return <div>
    <label htmlFor={props.id}>Network</label>
    <select id={props.id} aria-describedby={`${props.id}-hint`}
      className="mt-1 h-11 w-full rounded-[12px] border border-line bg-raised px-3"
      value={props.value} onChange={(event) => props.onChange(event.target.value as "mainnet-beta" | "devnet")}>
      <option value="mainnet-beta">Real network · read-only</option>
      <option value="devnet">Test network · devnet</option>
    </select>
    <p id={`${props.id}-hint`} className="mt-2 text-sm text-muted">
      {props.value === "mainnet-beta"
        ? "Solana’s real network is also called mainnet-beta. You can check it now; Doppel cannot send real funds."
        : "Use Solana Devnet in your wallet—not Solana Testnet. Devnet is for app practice with free test funds; Testnet is a different network mainly for validator/network testing."}
    </p>
  </div>;
}
