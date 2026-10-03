# Doppel sample — production notes

## Delivered artifact

`renders/doppel-sample.mp4` — verified 24.000 seconds, H.264 1920×1080 at 30 fps, AAC stereo 48 kHz, 4,511,282 bytes. FFmpeg full decode exited 0. Frame overview: `renders/contact-sheet.jpg`. Source scene ID: `01-before-you-sign` (four internal beats). Studio: http://127.0.0.1:3017/#project/doppel-sample (HTTP 200 verified before export).

Final composition checks: 0 runtime errors, 0 layout issues at 2/7.5/12.5/16.5/23 seconds, 18/18 text contrast checks pass. One intentional duplicate-logo warning. Image previews are unavailable to this model; automated checks do not replace the user's visual/audio review.

Render completed in 4m28.8s using screenshot capture/hardware GPU/one worker. Audio was lowered 1 dB by the renderer to stay under -1 dBTP. Initial npx attempt failed with ECOMPROMISED cache lock; a separate temporary npm cache resolved it. Windows preview launch reported a process error but preview --status confirmed the server was running; HTTP probe returned 200.

Cost: $0. No account signup, paid API, cloud rendering, music purchase or transaction. This is the requested sample for judging production style; not the final hackathon video.

- 24 seconds, 1920×1080, one scene composition with four internal beats.
- Actual current app screenshots captured with Playwright in a fresh isolated context; no user's address-book data, wallet or credentials touched. The displayed recipient is a labelled staged example. Images, not fabricated app HTML, form the product plates. This is an edited screenshot demo, not a continuous screen recording.
- Voice: local Kokoro `af_heart`, English, speed 0.9; measured 18.176 seconds, placed at 1 second. No paid API. Narration text in SCRIPT.md. No claim of human narration or premium voice provider.
- Music: original locally synthesized ambient chord/pluck cue in scripts/prepare-assets.mjs. No third-party music recording. HyperFrames dynamic voiceover carve applied to the bed in index.html.
- Logo: existing Doppel project SVG copied unchanged. Fonts: captured app Bricolage Grotesque and JetBrains Mono latin WOFF2, same brand assets as app.
- FFmpeg/FFprobe installed as free local tooling under the preapproved temporary directory. CLI is pinned to HyperFrames 0.8.113. GSAP is frozen locally in assets/gsap.min.js.
- Capture tool reported ok:true but emitted no asset-description file; repaired with an actual isolated browser recapture and inventory, not a synthetic website replacement. Original capture warnings preserved.
- Automatic preset color mapping made secondary text too dark; corrected to the existing UI's #A3AAD0. No unrelated project styles changed.
- Model cannot view attached screenshots in this session. Layout/runtime/motion/contrast checks and actual dimensions are used; user visual review is still important. No claim of listening to the mix or visually watching a finished MP4.
- Sample labels explicitly say captured app UI/no transaction sent. This sample is not the sponsor's live mainnet submission video.
- Project-local confirmed preferences recorded for aspect/automation/storyboard; these can inform future video runs.

## Local tools

For rendering in this environment, prepend these to PATH:
`C:\Users\ZERO\AppData\Local\Temp\opencode\doppel-video-tools\node_modules\ffmpeg-static`
and `C:\Users\ZERO\AppData\Local\Temp\opencode\doppel-video-tools\node_modules\ffprobe-static\bin\win32\x64`.

Then use `npm run check`, `npx hyperframes@0.8.113 preview --background`, and after approval `npm run render -- --workers 1 --quality looks --output renders/doppel-sample.mp4`.
