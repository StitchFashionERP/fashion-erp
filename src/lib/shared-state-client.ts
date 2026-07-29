"use client";

type SharedStateItem = {
  key?: string;
  value?: string;
};

const cache = new Map<string, string>();

function parseResponseError(body: unknown, fallback: string) {
  if (body && typeof body === "object" && "error" in body) {
    return String((body as { error?: unknown }).error ?? fallback);
  }
  return fallback;
}

export async function hydrateSharedState(keys: readonly string[]) {
  const response = await fetch("/api/shared-state", {
    method: "GET",
    cache: "no-store",
    credentials: "same-origin",
  });

  const body = (await response.json().catch(() => null)) as
    | { items?: SharedStateItem[]; error?: string }
    | null;

  if (!response.ok) {
    throw new Error(
      parseResponseError(body, "Centrale bedrijfsdata kon niet worden geladen."),
    );
  }

  const requested = new Set(keys);
  for (const item of body?.items ?? []) {
    if (
      typeof item.key === "string" &&
      typeof item.value === "string" &&
      requested.has(item.key)
    ) {
      cache.set(item.key, item.value);
    }
  }
}

export function getSharedStateValue<T>(key: string, fallback: T): T {
  const raw = cache.get(key);
  if (raw === undefined) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function setSharedStateValue<T>(key: string, value: T) {
  const serialized = JSON.stringify(value);
  cache.set(key, serialized);

  void fetch("/api/shared-state", {
    method: "PUT",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value: serialized }),
  })
    .then(async (response) => {
      if (response.ok) return;
      const body = (await response.json().catch(() => null)) as unknown;
      throw new Error(
        parseResponseError(body, `Opslaan van ${key} is mislukt.`),
      );
    })
    .catch((error) => {
      console.error("Centrale bedrijfsdata kon niet worden opgeslagen.", error);
    });
}

export function removeSharedStateValue(key: string) {
  cache.delete(key);

  void fetch("/api/shared-state", {
    method: "DELETE",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  }).catch((error) => {
    console.error("Centrale bedrijfsdata kon niet worden verwijderd.", error);
  });
}
