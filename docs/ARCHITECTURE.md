# Architecture (draft v0.1)

## 1. Repository analysis
Greenfield. This repository contains no code yet. Local toolchain at time of writing: Node 22, `uv` available,
system Python 3.9 (too old), no ffmpeg / fluidsynth / rubberband installed.

## 2. Guiding decisions
1. Voice analysis, composition, and rendering are separate stages joined only by structured data
   (analysis JSON, MIDI, event timelines). No stage imports another stage's internals.
2. The original vocal file is immutable. Stored once, content-addressed (sha256), never rewritten.
3. Every arrangement is reproducible from saved project metadata (seed, model versions, parameters).
4. Timing-sensitive accompaniment is deterministic MIDI. AI chooses chords, instruments and structure; it does not render sample-accurate rhythm.
5. The frontend talks only to the API; no model names or ML concepts leak into the UI contract.

## 3. Pipeline
```
upload/record -> normalize (ffmpeg) -> analyze -> arrange (symbolic) -> render (stems) -> mix/master -> export
                 vocal.wav (immutable)  analysis.json  arrangement.json+MIDI  stems/*.wav   mix.wav/mp3
```
Each arrow is an async job with its own status, retry and versioned output.

## 4. Services (modules in one deployable first, split later if needed)
| Module | Responsibility | Input -> Output |
|---|---|---|
| ingest | validate, transcode, store original | file -> vocal.wav + asset row |
| analysis | F0, notes, tempo, key, range, phrases, dynamics | vocal.wav -> analysis.json |
| composition | chords, bass, countermelody, harmony, structure | analysis.json + style -> arrangement.json |
| orchestration | assign instruments / roles / intensity per section | arrangement.json -> instrument plan |
| render | MIDI -> audio per stem via SoundFont | MIDI -> stems/*.wav |
| production | gain, EQ, compression, reverb, pan, master | stems + vocal -> mix, export |
| projects | CRUD, versions, reproducibility metadata | API / DB |
| jobs | queue, progress, cancel | worker |

## 5. Technology selection (candidates; verify before committing)
| Need | Choice | Why / caveat |
|---|---|---|
| Web | Next.js + TypeScript + Web Audio API | Shared types via OpenAPI codegen; later React Native reuses the API client |
| API | FastAPI, Python 3.12 via uv | Typed, OpenAPI out of the box |
| Jobs | Postgres + a worker (arq or RQ on Redis) | Start simple; swap for GPU queue later |
| DB / storage | Postgres; local disk behind an object-store interface (S3/MinIO in prod) | |
| Pitch | CREPE or RMVPE; librosa pYIN as CPU fallback | Benchmark on real, imperfect vocals first |
| Notes | Basic Pitch | Evaluate on sung melodies, not only instruments |
| Theory | music21 | Key, chords, voice-leading |
| Render | FluidSynth + SoundFonts | Deterministic and cheap; quality depends on the SoundFont, expect "MIDI-like" strings |
| Time/pitch | Rubber Band | |
| DSP | Spotify Pedalboard or ffmpeg filters | Pedalboard is GPLv3: check fit |
| Generative audio | MusicGen / Stable Audio Open | Optional later layer only; see licensing |

### Licensing and risk flags (must be verified, not assumed)
- MusicGen weights are commonly under a non-commercial licence; blocks commercial use.
- Rubber Band and Pedalboard are GPL-family; a commercial/closed distribution needs a licence or an alternative.
- FluidSynth is LGPL; SoundFonts each have their own licence. Use only SoundFonts with clear redistribution terms.
- Indian instruments (sitar, tabla, bansuri, harmonium): free SoundFont coverage is thin. Quality risk, may need a sample library.

## 6. Data model (Postgres)
- `project(id, name, owner_id, created_at, updated_at)`
- `asset(id, project_id, kind[vocal|stem|mix|midi|export], sha256, uri, duration_s, sample_rate, immutable bool)`
- `analysis(id, project_id, vocal_asset_id, version, f0_uri, notes_json, tempo, key, scale, range_low, range_high, phrases_json, dynamics_json, tool_versions_json)`
- `arrangement(id, project_id, analysis_id, parent_id, style, seed, params_json, sections_json, created_at)`
- `track(id, arrangement_id, role, instrument, midi_asset_id, stem_asset_id, gain_db, pan, mute, solo, fx_json)`
- `job(id, project_id, type, status, progress, error, input_json, output_json, created_at, finished_at)`
- `export(id, project_id, arrangement_id, format, asset_id, loudness_lufs)`

## 7. API contracts (v1, summary)
| Method | Path | Purpose |
|---|---|---|
| POST | /v1/projects | create project |
| GET | /v1/projects, /v1/projects/{id} | list / read |
| POST | /v1/projects/{id}/vocal | upload recording (multipart) -> asset, starts analysis job |
| GET | /v1/projects/{id}/analysis | latest analysis |
| POST | /v1/projects/{id}/arrangements | {style, seed?, intensity?} -> job |
| PATCH | /v1/arrangements/{id}/tracks/{track_id} | instrument, gain, pan, mute |
| POST | /v1/arrangements/{id}/sections/{n}/regenerate | regenerate one section -> new arrangement version |
| POST | /v1/arrangements/{id}/exports | {format: wav|mp3} -> job |
| GET | /v1/jobs/{id} | status / progress |
| GET | /v1/assets/{id}/content | stream audio (range requests) |
Errors: RFC 9457 problem+json. Long work is always a job; endpoints never block on analysis or rendering.

## 8. Milestones
1. Phase 1 Foundation: monorepo, API + web skeleton, upload/record, waveform playback, project CRUD, tests, CI.
2. Phase 2 Voice intelligence: pitch, notes, tempo, key, phrases, with a benchmark set of real vocals and measured accuracy.
3. Phase 3 Composition: chords, bass, MIDI, instrument roles, FluidSynth render.
4. Phase 4 Studio: multitrack, mixer, effects, export.
5. Phase 5 Live Composer: low-latency pitch + constrained accompaniment, after measuring achievable browser latency.

## 9. Key risks
- Singing transcription accuracy on amateur, unaccompanied vocals is the hardest and most product-critical part.
- Perceived quality is bounded by instrument samples, not only by the arrangement logic.
- Browser live latency (Web Audio + mic) may force a native or WASM audio path for Live mode.
- Licensing (above).
