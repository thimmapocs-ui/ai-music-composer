"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, type Project } from "@/lib/api";

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setProjects(await api.listProjects());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load projects");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    api
      .listProjects()
      .then((list) => !cancelled && setProjects(list))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Failed to load projects"));
    return () => {
      cancelled = true;
    };
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await api.createProject(name.trim());
      setName("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>AI Music Composer</h1>
      <form onSubmit={create}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New song name" />
        <button type="submit">Create</button>
      </form>
      {error && <p role="alert" style={{ color: "#b00020" }}>{error}</p>}
      <ul>
        {projects.map((p) => (
          <li key={p.id}>
            <Link href={`/projects/${p.id}`}>{p.name}</Link>{" "}
            <button
              onClick={async () => {
                if (confirm(`Delete "${p.name}" and its recordings?`)) {
                  await api.deleteProject(p.id);
                  await refresh();
                }
              }}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
      {projects.length === 0 && !error && <p>No songs yet. Create one, then record or upload your singing.</p>}
    </main>
  );
}
