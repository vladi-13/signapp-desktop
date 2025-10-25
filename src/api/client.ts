export const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";

type FetchOpts = {
  method?: "GET" | "POST";
  body?: any;
  headers?: Record<string, string>;
  timeoutMs?: number;
};

async function withTimeout<T>(p: Promise<T>, ms = 8000): Promise<T> {
  const t = new Promise<never>((_, rej) =>
    setTimeout(() => rej(new Error("timeout")), ms)
  );
  return Promise.race([p, t]);
}

export async function apiFetch<T = any>(
  path: string,
  opts: FetchOpts = {}
): Promise<{ ok: boolean; data?: T; error?: string }> {
  try {
    const res = await withTimeout(
      fetch(`${BACKEND_URL}${path}`, {
        method: opts.method || "GET",
        headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
        body: opts.body ? JSON.stringify(opts.body) : undefined,
      }),
      opts.timeoutMs ?? 8000
    );
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return { ok: false, error: `HTTP ${res.status} ${txt}` };
    }
    const data = await res.json().catch(() => ({}));
    return { ok: true, data };
  } catch (e: any) {
    return { ok: false, error: e?.message || "network error" };
  }
}

export const api = {
  health: () => apiFetch<{ ok: boolean; device: string }>("/health"),
  signToText: (frames_b64: string[]) =>
    apiFetch<{ text: string; latency_ms: number }>("/sign-to-text", {
      method: "POST",
      body: { frames_b64 },
      timeoutMs: 20000,
    }),
  textToSign: (text: string) =>
    apiFetch<{ poses: any[]; latency_ms: number }>("/text-to-sign", {
      method: "POST",
      body: { text },
      timeoutMs: 20000,
    }),
};
