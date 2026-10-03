import Link from "next/link";
import { DEVNET_CIRCLE_USDC_MINT, MAINNET_USDC_MINT } from "@doppel/engine";

export default function MethodPage() {
  return <section className="rounded-[20px] border border-line bg-ink p-6 space-y-5">
    <h1 className="text-[32px] leading-[38px] font-medium">How Doppel works</h1>
    <p>Imagine you pay Ada regularly. You save the address she confirmed, then compare it with the address you paste for your next payment.
      If someone planted a similar address in your history, Doppel helps you notice the difference.</p>
    <ol className="list-decimal space-y-3 pl-5">
      <li><Link href="/recipients" className="text-iris underline">Save a recipient</Link> after confirming their full address through a source you trust.</li>
      <li><Link href="/" className="text-iris underline">Check an address</Link>: enter your sending wallet, choose who you intend to pay, and paste the receiving address. Checking needs no funds or wallet connection.</li>
      <li><Link href="/prepare" className="text-iris underline">Test a payment</Link> on devnet to see the check before your wallet approval. Only the sending wallet needs test SOL first for a SOL transfer.</li>
    </ol>
    <h2 className="text-xl">Real network or test network?</h2>
    <p>“Mainnet-beta” is Solana’s real network name, not Doppel’s development status. You can read its real history now; Doppel cannot send real funds.
      Devnet is a separate practice network using free test funds. Saving the same address on one network does not confirm it on the other.</p>
    <h2 className="text-xl">What does a result mean?</h2>
    <p>A matching saved address confirms consistency with your record, not the owner’s identity. Missing history means the scam-pattern check is incomplete.
      An exact confirmed recipient may continue in the test-payment flow after explicitly acknowledging limited history. A mismatch or suspicious finding cannot be overridden.</p>
    <h2 className="text-xl">What we have tested</h2>
    <p>A frozen-rule run exercised 23 synthetic history scenarios and one network-mismatch case. All matched the declared behavior,
      including three deliberately out-of-scope attacks that the classifier missed and one benign lookalike sequence it flagged.
      These are constructed examples, not a real-world accuracy benchmark. Larger transfers, delayed attacks, missing timestamps and incomplete history can reduce detection.</p>
    <details className="text-sm text-muted"><summary className="cursor-pointer text-iris">Technical scope and current limits</summary>
      <div className="mt-3 space-y-3 break-words">
        <p>History uses public RPC across SOL and canonical USDC. Closed historical token accounts are not discoverable by the current fallback. Solami monitoring is not activated.</p>
        <p>Mainnet USDC mint: <code className="break-all">{MAINNET_USDC_MINT}</code>. Devnet issuer test mint: <code className="break-all">{DEVNET_CIRCLE_USDC_MINT}</code>.</p>
        <p>Test SOL transfers are capped at 0.1 SOL. Test USDC transfers are capped at 1 USDC and require existing token accounts. No implicit account creation or priority-fee instructions.</p>
        <p>The published Pine address pair is used for comparison examples. The historical incident has not been reconstructed on-chain by this project. Installed-wallet execution still requires manual verification.</p>
      </div>
    </details>
  </section>;
}
