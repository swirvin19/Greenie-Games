export class ApiError extends Error {}

export async function apiFetch<T = unknown>(
  path: string,
  init?: RequestInit & { json?: unknown }
): Promise<T> {
  const { json, ...rest } = init ?? {};
  const res = await fetch(path, {
    ...rest,
    method: rest.method ?? (json ? "POST" : "GET"),
    headers: { "Content-Type": "application/json", ...rest.headers },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError((data as { error?: string }).error ?? `Request failed (${res.status})`);
  }
  return data as T;
}
