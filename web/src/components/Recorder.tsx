"use client";

import { useEffect, useRef, useState } from "react";
import { extensionForMime, pickRecorderMimeType } from "@/lib/waveform";

interface Props {
  disabled?: boolean;
  onRecorded: (blob: Blob, filename: string) => Promise<void>;
}

export default function Recorder({ disabled, onRecorded }: Props) {
  const [state, setState] = useState<"idle" | "recording" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
    recorder.current?.stream.getTracks().forEach((t) => t.stop());
  }, []);

  async function start() {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Recording is not supported in this browser. Upload a file instead.");
      return;
    }
    try {
      // Turn off browser speech processing: echo cancellation, noise suppression and auto gain
      // would alter the singer's dynamics and pitch, which the analysis depends on.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      const mimeType = pickRecorderMimeType((t) => MediaRecorder.isTypeSupported(t));
      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunks.current = [];
      rec.ondataavailable = (e) => e.data.size > 0 && chunks.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const type = rec.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunks.current, { type });
        setState("saving");
        try {
          await onRecorded(blob, `recording-${Date.now()}.${extensionForMime(type)}`);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Upload failed");
        } finally {
          setState("idle");
        }
      };
      rec.start();
      recorder.current = rec;
      setSeconds(0);
      timer.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      setState("recording");
    } catch (e) {
      setError(e instanceof Error ? `Microphone unavailable: ${e.message}` : "Microphone unavailable");
    }
  }

  function stop() {
    if (timer.current) clearInterval(timer.current);
    recorder.current?.stop();
  }

  return (
    <div>
      {state === "recording" ? (
        <button onClick={stop}>■ Stop ({seconds}s)</button>
      ) : (
        <button onClick={start} disabled={disabled || state === "saving"}>
          ● {state === "saving" ? "Saving…" : "Record"}
        </button>
      )}
      {error && <p role="alert" style={{ color: "#b00020" }}>{error}</p>}
    </div>
  );
}
