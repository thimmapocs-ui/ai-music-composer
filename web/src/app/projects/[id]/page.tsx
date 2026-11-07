"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import Recorder from "@/components/Recorder";
import WaveformPlayer from "@/components/WaveformPlayer";
import { api, type ProjectDetail } from "@/lib/api";

function ProjectView() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setProject(await api.getProject(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load project");
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    api
      .getProject(id)
      .then((p) => !cancelled && setProject(p))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Failed to load project"));
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function upload(file: Blob, filename: string) {
    setBusy(true);
    setError(null);
    try {
      await api.uploadVocal(id, file, filename);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
      throw e;
    } finally {
      setBusy(false);
    }
  }

  if (!project) return <main style={{ padding: "2rem" }}>{error ?? "Loading…"}</main>;

  return (
    <main style={{ maxWidth: 840, margin: "2rem auto", padding: "0 1rem" }}>
      <p><Link href="/">← Songs</Link></p>
      <h1>{project.name}</h1>
      <h2>Your singing</h2>
      <p>Sing without background music. Your original recording is kept unchanged.</p>
      <Recorder disabled={busy} onRecorded={upload} />
      <p>
        or upload a recording:{" "}
        <input
          type="file"
          accept="audio/*"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f, f.name).catch(() => undefined);
            e.target.value = "";
          }}
        />
      </p>
      {error && <p role="alert" style={{ color: "#b00020" }}>{error}</p>}
      {project.assets.filter((a) => a.kind === "vocal").map((a) => (
        <WaveformPlayer key={a.id} asset={a} />
      ))}
      <p><em>Voice analysis and arrangement are not built yet.</em></p>
    </main>
  );
}

export default function ProjectPage() {
  // useParams() is runtime-only data; Next requires a Suspense boundary so the shell can prerender.
  return (
    <Suspense fallback={<main style={{ padding: "2rem" }}>Loading…</main>}>
      <ProjectView />
    </Suspense>
  );
}
