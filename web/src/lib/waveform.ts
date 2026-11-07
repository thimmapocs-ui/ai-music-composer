/**
 * Reduce PCM samples to `bins` min/max pairs for drawing. Pure function so it can be unit-tested
 * without a browser. Peaks are in [-1, 1].
 */
export function computePeaks(samples: Float32Array, bins: number): { min: number; max: number }[] {
  if (bins <= 0) return [];
  const peaks: { min: number; max: number }[] = [];
  const size = samples.length / bins;
  for (let b = 0; b < bins; b++) {
    const start = Math.floor(b * size);
    const end = Math.max(start + 1, Math.floor((b + 1) * size));
    let min = 0;
    let max = 0;
    for (let i = start; i < end && i < samples.length; i++) {
      const v = samples[i];
      if (v < min) min = v;
      if (v > max) max = v;
    }
    peaks.push({ min, max });
  }
  return peaks;
}

/** Pick a MediaRecorder mime type the current browser supports (Chrome: webm, Safari: mp4). */
export function pickRecorderMimeType(isSupported: (t: string) => boolean): string | undefined {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  return candidates.find(isSupported);
}

export function extensionForMime(mime: string): string {
  if (mime.includes("webm")) return "webm";
  if (mime.includes("mp4")) return "m4a";
  if (mime.includes("ogg")) return "ogg";
  return "audio";
}
