import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

// Point this at your deployed API (e.g. https://your-app.vercel.app) by
// setting EXPO_PUBLIC_API_URL before running `expo start` — Expo inlines
// any EXPO_PUBLIC_* env var into the JS bundle at build time. Defaults to
// localhost for simulator/web testing against `npm run dev` in the web app.
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

const TOKEN_KEY = "greeni_session_token";

// expo-secure-store has no web implementation (browsers have no OS
// keychain) — it throws at runtime there instead of just being a no-op.
// Web falls back to localStorage; iOS/Android use the real secure store.
export async function getToken(): Promise<string | null> {
  if (Platform.OS === "web") return window.localStorage.getItem(TOKEN_KEY);
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  if (Platform.OS === "web") {
    window.localStorage.setItem(TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  if (Platform.OS === "web") {
    window.localStorage.removeItem(TOKEN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export class ApiError extends Error {}

export async function apiFetch<T = unknown>(
  path: string,
  init?: RequestInit & { json?: unknown }
): Promise<T> {
  const { json, ...rest } = init ?? {};
  const token = await getToken();

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    method: rest.method ?? (json ? "POST" : "GET"),
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...rest.headers,
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError((data as { error?: string }).error ?? `Request failed (${res.status})`);
  }
  return data as T;
}
