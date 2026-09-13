export async function fetchJsonWithTimeout<T>(
  url: string,
  options: RequestInit = {},
  timeoutMs = 12_000,
): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) throw new Error(`Request failed (${response.status})`);
    return await response.json() as T;
  } finally {
    window.clearTimeout(timeout);
  }
}