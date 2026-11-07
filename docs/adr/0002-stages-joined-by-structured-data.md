# ADR 0002: Pipeline stages communicate only through structured data
Status: accepted

**Decision.** analysis -> composition -> orchestration -> render -> mix exchange versioned artefacts (analysis JSON, arrangement JSON, MIDI, stems), not Python objects. Each stage records tool and model versions with its output.

**Why.** Each stage can be tested on fixtures, replaced, or moved to a GPU worker independently. Musical decisions (symbolic) stay separate from audio rendering, so an arrangement can be validated before any audio is produced.
