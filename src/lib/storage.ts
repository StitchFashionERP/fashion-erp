export function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function readStoredArray<T>(
  keys: string[],
  normalize: (value: Record<string, unknown>) => T,
): T[] | null {
  if (!isBrowser()) return null;

  for (const key of keys) {
    const raw = window.localStorage.getItem(key);
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw) as unknown;
      const values = Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === "object" && "items" in parsed
          ? (parsed as { items?: unknown }).items
          : null;

      if (Array.isArray(values)) {
        return values.map((value) =>
          normalize((value ?? {}) as Record<string, unknown>),
        );
      }
    } catch {
      // Probeer de volgende bekende opslaglocatie.
    }
  }

  return null;
}

export function writeStoredArray<T>(
  key: string,
  eventName: string,
  items: T[],
): void {
  if (!isBrowser()) return;

  window.localStorage.setItem(key, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(eventName));
}

export function subscribeToStorageEvent(
  eventName: string,
  callback: () => void,
): () => void {
  if (!isBrowser()) return () => undefined;

  const listener = () => callback();
  window.addEventListener(eventName, listener);
  window.addEventListener("storage", listener);

  return () => {
    window.removeEventListener(eventName, listener);
    window.removeEventListener("storage", listener);
  };
}
