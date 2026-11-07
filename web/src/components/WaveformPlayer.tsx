"use client";

import { useEffect, useRef, useState } from "react";
import { api, type Asset } from "@/lib/api";
import { computePeaks } from "@/lib/waveform";

const WIDTH = 800;
const HEIGHT = 120;

export default function WaveformPlayer({ asset }: { asset: Asset }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [peaks, setPeaks] = useState<{ min: number; max: number }[]>([]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch(api.assetUrl(asset.id), { signal: ctrl.signal });
        const data = await res.arrayBuffer();
        const ctx = new AudioContext();
        const buffer = await ctx.decodeAudioData(data);
        void ctx.close();
        setPeaks(computePeaks(buffer.getChannelData(0), WIDTH));
        setStatus("ready");
      } catch {
        if (!ctrl.signal.aborted) setStatus("error");
      }
    })();
    return () => ctrl.abort();
  }, [asset.id]);

  useEffect(() => {
    const c = canvas.current?.getContext("2d");
    if (!c || status !== "ready") return;
    c.clearRect(0, 0, WIDTH, HEIGHT);
    c.fillStyle = "#4a5fd1";
    const mid = HEIGHT / 2;
    peaks.forEach((p, x) => c.fillRect(x, mid - p.max * mid, 1, Math.max(1, (p.max - p.min) * mid)));
    c.fillStyle = "#e5484d";
    c.fillRect(Math.floor(progress * WIDTH), 0, 2, HEIGHT);
  }, [peaks, progress, status]);

  return (
    <div>
      <p>
        {asset.original_filename} · {(asset.size_bytes / 1024).toFixed(0)} KB
        {asset.duration_s != null && ` · ${asset.duration_s.toFixed(1)} s`}
      </p>
      <canvas
        ref={canvas}
        width={WIDTH}
        height={HEIGHT}
        style={{ width: "100%", maxWidth: WIDTH, background: "#f4f5fb", cursor: "pointer" }}
        onClick={(e) => {
          const a = audio.current;
          if (!a || !isFinite(a.duration)) return;
          const r = e.currentTarget.getBoundingClientRect();
          a.currentTime = ((e.clientX - r.left) / r.width) * a.duration;
        }}
      />
      {status === "loading" && <p>Decoding waveform…</p>}
      {status === "error" && <p role="alert">Could not decode this audio for display (playback may still work).</p>}
      <audio
        ref={audio}
        controls
        src={api.assetUrl(asset.id)}
        onTimeUpdate={(e) => {
          const a = e.currentTarget;
          if (isFinite(a.duration) && a.duration > 0) setProgress(a.currentTime / a.duration);
        }}
        style={{ width: "100%", maxWidth: WIDTH }}
      />
    </div>
  );
}
