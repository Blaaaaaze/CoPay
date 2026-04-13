const base = "";

export type ApiInit = RequestInit & { token?: string | null };

function messageFromApiError(data: unknown, fallback: string): string {
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (typeof o.error === "string" && o.error) return o.error;
    if (typeof o.detail === "string" && o.detail) return o.detail;
  }
  return fallback;
}

export async function api<T>(path: string, opts: ApiInit = {}): Promise<T> {
  const { token, headers, ...rest } = opts;
  const h = new Headers(headers);
  h.set("Content-Type", "application/json");
  if (token) h.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${base}${path}`, { ...rest, headers: h });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(messageFromApiError(data, res.statusText));
  }
  return data as T;
}

export async function apiUpload<T>(
  path: string,
  formData: FormData,
  opts: { token?: string | null } = {}
): Promise<T> {
  const h = new Headers();
  if (opts.token) h.set("Authorization", `Bearer ${opts.token}`);
  const res = await fetch(`${base}${path}`, { method: "POST", body: formData, headers: h });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(messageFromApiError(data, res.statusText));
  }
  return data as T;
}

export async function uploadAvatar(
  token: string,
  file: File
): Promise<{ avatarUrl: string | null }> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${base}/api/me/avatar`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || res.statusText);
  }
  return data as { avatarUrl: string | null };
}
