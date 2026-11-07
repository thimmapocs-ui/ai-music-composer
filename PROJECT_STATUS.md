# Project status

Last updated: 2026-11-07. Rule: a feature is marked **Verified** only after it was exercised with real audio
or the real browser; unit tests alone are listed separately.

## Phase 1 Foundation: IN PROGRESS (not yet complete)

| Capability | State | Evidence |
|---|---|---|
| Project CRUD API | Verified | 9 pytest tests; live server run with curl |
| Immutable, content-addressed vocal storage | Verified | Upload of a 4.2 s synthesized melody WAV came back byte-identical (`cmp`); file stored read-only; dedup test |
| Upload validation (type sniffing, size cap, empty) | Verified (tests) | pytest: 415 for non-audio/empty, 413 for oversize, no temp-file leak |
| Audio streaming with HTTP Range | Verified | Live: 200 full body, 206 for `Range`; CORS preflight 200 |
| Web: project dashboard, project page, upload, recorder, waveform + playback | **Built, NOT verified in a browser** | `tsc`, eslint, `next build` pass; 4 unit tests cover peak computation and mime helpers only. The browser tool available here cannot open localhost, and microphone capture cannot be exercised headlessly |
| Browser recording (MediaRecorder) | Unverified | needs a manual test in Chrome and Safari |
| CI | Written, not yet run on GitHub | `.github/workflows/ci.yml` |

### Known gaps / limitations
- Test audio so far is a synthesized sine melody with vibrato, not a real human voice.
- Duration is reported for WAV only; compressed formats report none until Phase 2 decodes them.
- SQLite in Phase 1; Postgres compatibility is untested.
- Browser recordings are webm/mp4 containers. Phase 2 needs ffmpeg to normalise them to WAV before analysis. ffmpeg is not installed yet.
- No authentication or multi-user separation; every project is visible to every caller. Not acceptable beyond local use.

### Exit criteria for Phase 1
1. Manual browser check passes: create song, record in Chrome, upload a WAV, waveform renders, playback and click-to-seek work.
2. CI green on GitHub.
Only then start Phase 2.

## Not started
Phase 2 voice intelligence, Phase 3 composition, Phase 4 studio production, Phase 5 live composer.
Nothing in those phases exists; no pitch, key, tempo, chord or arrangement code has been written.
