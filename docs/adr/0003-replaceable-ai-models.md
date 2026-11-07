# ADR 0003: AI/ML components sit behind narrow interfaces
Status: accepted (applies from Phase 2)

**Decision.** Pitch tracking, note transcription, and any generative model are used only through small interfaces (`PitchTracker`, `NoteTranscriber`, ...) with result types owned by this project. Concrete backends (pYIN, CREPE/RMVPE, Basic Pitch) are selected by configuration and benchmarked against the same test set before adoption.

**Rule.** Chords and instruments are derived from the analysed melody and validated by music-theory checks (every melody note must be explainable against the chord, or flagged) before rendering. No random choice without a melodic reason.
