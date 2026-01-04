function getApiBase(): string {
  const base = process.env.NEXT_PUBLIC_SPORTS_API_URL || process.env.NEXT_PUBLIC_THEORY_ENGINE_URL;
  if (!base) {
    throw new Error(
      "Set NEXT_PUBLIC_SPORTS_API_URL (or NEXT_PUBLIC_THEORY_ENGINE_URL) to the sports-data-admin API base URL"
    );
  }
  return base;
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const apiBase = getApiBase();
  const url = `${apiBase}${path}`;

  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Request failed (${res.status}): ${body}`);
    }

    return await res.json();
  } catch (err) {
    if (err instanceof TypeError && err.message.includes("fetch")) {
      throw new Error(`Failed to connect to backend at ${apiBase}. Is the server running?`);
    }
    throw err;
  }
}

export async function requestBlob(path: string, init?: RequestInit): Promise<Blob> {
  const apiBase = getApiBase();
  const url = `${apiBase}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Request failed (${res.status}): ${body}`);
  }
  return await res.blob();
}
