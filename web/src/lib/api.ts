export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface Asset {
  id: string;
  project_id: string;
  kind: string;
  original_filename: string;
  content_type: string;
  sha256: string;
  size_bytes: number;
  duration_s: number | null;
  immutable: boolean;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectDetail extends Project {
  assets: Asset[];
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, init);
  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = (await res.json()).detail ?? detail;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, String(detail));
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

const json = (body: unknown): RequestInit => ({
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const api = {
  listProjects: () => request<Project[]>("/v1/projects"),
  createProject: (name: string) => request<Project>("/v1/projects", { method: "POST", ...json({ name }) }),
  getProject: (id: string) => request<ProjectDetail>(`/v1/projects/${id}`),
  renameProject: (id: string, name: string) =>
    request<Project>(`/v1/projects/${id}`, { method: "PATCH", ...json({ name }) }),
  deleteProject: (id: string) => request<void>(`/v1/projects/${id}`, { method: "DELETE" }),
  uploadVocal: (id: string, file: Blob, filename: string) => {
    const form = new FormData();
    form.append("file", file, filename);
    return request<Asset>(`/v1/projects/${id}/vocal`, { method: "POST", body: form });
  },
  assetUrl: (assetId: string) => `${API_URL}/v1/assets/${assetId}/content`,
};
