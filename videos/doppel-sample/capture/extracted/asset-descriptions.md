# Verified capture inventory

HyperFrames capture returned ok:true but omitted this inventory with zero downloadable assets. Repaired using an isolated Playwright capture of the actual app, without rebuilding the page. No RPC calls or wallet signing.

- assets/home.png — actual homepage, 1440x1000 at 2x.
- assets/payment-form.png — actual Prepare form with sample recipient.
- assets/twin-mismatch.png — actual Twin Panel showing the sourced 4+1 lookalike pair, staged sample.
- assets/result-mismatch.png — actual local mismatch summary.
- assets/blocked-button.png — actual disabled signing button due to mismatch.
- assets/prepare-mismatch.png — actual viewport around comparison.
- assets/twin-match.png — actual comparison after replacing with the saved address.
- assets/doppel-logo.svg — existing user project logo, copied unchanged.
- assets/font-*.woff2 and font-rules.json — local web-app font captures and @font-face metadata.

Published addresses used only for a labelled sample; no reconstructed attack or live-mainnet claim.
