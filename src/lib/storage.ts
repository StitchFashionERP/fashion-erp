import {
  getSharedStateValue,
  setSharedStateValue,
} from "@/lib/shared-state-client";

export function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function readStoredArray<T>(
  keys: string[],
  normalize: (value: Record<string, unknown>) => T,
): T[] | null {
  for (const key of keys) {
    const values = getSharedStateValue<unknown>(key, null);
    const items = Array.isArray(values)
      ? values
      : values && typeof values === "object" && "items" in values
        ? (values as { items?: unknown }).items
        : null;

    if (Array.isArray(items)) {
      return items.map((value) =>
        normalize((value ?? {}) as Record<string, unknown>),
      );
    }
  }

  return null;
}

export function writeStoredArray<T>(
  key: string,
  eventName: string,
  items: T[],
): void {
  setSharedStateValue(key, items);

  if (isBrowser()) {
    window.dispatchEvent(new CustomEvent(eventName));
  }
}

export function subscribeToStorageEvent(
  eventName: string,
  callback: () => void,
): () => void {
  if (!isBrowser()) return () => undefined;

  const listener = () => callback();
  window.addEventListener(eventName, listener);

  return () => {
    window.removeEventListener(eventName, listener);
  };
}
