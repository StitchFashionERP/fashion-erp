"use client";

import { useEffect, useState, type ReactNode } from "react";

const SHARED_EXACT_KEYS = new Set([
  "fashion-erp-purchase-orders",
  "fashion-erp-purchase-receipts",
  "fashion-erp-inventory-movements-v1",
  "fashion-erp-inventory-settings-v1",
]);

const SHARED_KEY_PARTS = [
  "articles",
  "products",
  "customers",
  "sales",
  "purchase",
  "supplier",
  "inventory",
  "invoice",
  "return",
  "production",
  "warehouse",
  "barcode",
  "price-list",
  "pricing",
  "scheduled-price",
  "promotion",
  "company-settings",
  "master-data",
  "history",
  "debtor",
  "document-email",
  "exact-bridge",
];

const LOCAL_ONLY_KEY_PARTS = [
  "language",
  "permission",
  "module-settings",
  "grid-toolbar",
  "sidebar",
  "theme",
  "appearance",
  "draft",
];

function isSharedBusinessKey(key: string) {
  if (!key.startsWith("fashion-erp-")) {
    return false;
  }

  if (SHARED_EXACT_KEYS.has(key)) {
    return true;
  }

  if (LOCAL_ONLY_KEY_PARTS.some((part) => key.includes(part))) {
    return false;
  }

  return SHARED_KEY_PARTS.some((part) => key.includes(part));
}

function parseStoredValue(rawValue: string) {
  try {
    return JSON.parse(rawValue) as unknown;
  } catch {
    return rawValue;
  }
}

function serializeCloudValue(value: unknown) {
  return typeof value === "string" ? value : JSON.stringify(value);
}

async function writeCloudValue(key: string, rawValue: string) {
  await fetch("/api/cloud-storage", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value: parseStoredValue(rawValue) }),
    keepalive: true,
  });
}

async function deleteCloudValue(key: string) {
  await fetch(`/api/cloud-storage?key=${encodeURIComponent(key)}`, {
    method: "DELETE",
    keepalive: true,
  });
}

export function BusinessStorageSync({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const originalSetItem = Storage.prototype.setItem;
    const originalRemoveItem = Storage.prototype.removeItem;
    const originalClear = Storage.prototype.clear;
    let hydrating = true;

    async function initialize() {
      try {
        const response = await fetch("/api/cloud-storage", {
          cache: "no-store",
          credentials: "include",
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as {
          entries?: Array<{ key: string; value: unknown }>;
        };
        const entries = payload.entries ?? [];
        const remoteKeys = new Set(entries.map((entry) => entry.key));

        for (const entry of entries) {
          if (!isSharedBusinessKey(entry.key)) {
            continue;
          }
          originalSetItem.call(
            window.localStorage,
            entry.key,
            serializeCloudValue(entry.value),
          );
        }

        const localEntries: Array<[string, string]> = [];
        for (let index = 0; index < window.localStorage.length; index += 1) {
          const key = window.localStorage.key(index);
          if (!key || !isSharedBusinessKey(key) || remoteKeys.has(key)) {
            continue;
          }
          const value = window.localStorage.getItem(key);
          if (value !== null) {
            localEntries.push([key, value]);
          }
        }

        await Promise.all(
          localEntries.map(([key, value]) => writeCloudValue(key, value)),
        );
      } catch (error) {
        console.error("Cloudopslag kon niet worden geïnitialiseerd.", error);
      } finally {
        hydrating = false;
        if (!cancelled) {
          setReady(true);
        }
      }
    }

    Storage.prototype.setItem = function patchedSetItem(key, value) {
      originalSetItem.call(this, key, value);
      if (this === window.localStorage && !hydrating && isSharedBusinessKey(key)) {
        void writeCloudValue(key, value).catch((error) => {
          console.error(`Cloudopslag mislukt voor ${key}.`, error);
        });
      }
    };

    Storage.prototype.removeItem = function patchedRemoveItem(key) {
      originalRemoveItem.call(this, key);
      if (this === window.localStorage && !hydrating && isSharedBusinessKey(key)) {
        void deleteCloudValue(key).catch((error) => {
          console.error(`Cloudverwijdering mislukt voor ${key}.`, error);
        });
      }
    };

    Storage.prototype.clear = function patchedClear() {
      const sharedKeys: string[] = [];
      if (this === window.localStorage) {
        for (let index = 0; index < this.length; index += 1) {
          const key = this.key(index);
          if (key && isSharedBusinessKey(key)) {
            sharedKeys.push(key);
          }
        }
      }
      originalClear.call(this);
      if (!hydrating) {
        void Promise.all(sharedKeys.map(deleteCloudValue));
      }
    };

    void initialize();

    return () => {
      cancelled = true;
      Storage.prototype.setItem = originalSetItem;
      Storage.prototype.removeItem = originalRemoveItem;
      Storage.prototype.clear = originalClear;
    };
  }, []);

  if (!ready) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <div>Bedrijfsgegevens laden…</div>
      </div>
    );
  }

  return children;
}
