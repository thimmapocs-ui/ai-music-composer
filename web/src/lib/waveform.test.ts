import { describe, expect, it } from "vitest";
import { computePeaks, extensionForMime, pickRecorderMimeType } from "./waveform";

describe("computePeaks", () => {
  it("returns the requested number of bins with correct min/max", () => {
    const s = new Float32Array([0, 0.5, -0.25, 1, -1, 0.1, 0, 0]);
    const p = computePeaks(s, 4);
    expect(p).toHaveLength(4);
    expect(p[0]).toEqual({ min: 0, max: 0.5 });
    expect(p[1]).toEqual({ min: -0.25, max: 1 });
    expect(p[2].min).toBe(-1);
    expect(p[2].max).toBeCloseTo(0.1, 6); // Float32 storage
  });

  it("handles fewer samples than bins and empty input", () => {
    expect(computePeaks(new Float32Array([0.3]), 5)).toHaveLength(5);
    expect(computePeaks(new Float32Array(0), 3).every((x) => x.max === 0 && x.min === 0)).toBe(true);
    expect(computePeaks(new Float32Array(4), 0)).toEqual([]);
  });
});

describe("recorder mime helpers", () => {
  it("prefers webm opus, falls back to mp4, else undefined", () => {
    expect(pickRecorderMimeType(() => true)).toBe("audio/webm;codecs=opus");
    expect(pickRecorderMimeType((t) => t === "audio/mp4")).toBe("audio/mp4");
    expect(pickRecorderMimeType(() => false)).toBeUndefined();
  });
  it("maps mime to extension", () => {
    expect(extensionForMime("audio/webm;codecs=opus")).toBe("webm");
    expect(extensionForMime("audio/mp4")).toBe("m4a");
  });
});
