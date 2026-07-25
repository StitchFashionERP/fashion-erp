"use client";

import { usePathname } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type SharedStateItem = {
  key: string;
  value: string;
  updatedAt: string;
};

type SharedStateResponse = {
  items?: SharedStateItem[];
  error?: string;
};

type PendingMutation = {
  method: "PUT" | "DELETE";
  value?: string;
};

const exactSharedKeys = new Set([
  "fashion-erp-purchase-orders",
  "fashion-erp-purchase-receipts",
  "fashion-erp-inventory-movements-v1",
  "fashion-erp-inventory-settings-v1",
  "fashion-erp-invoices",
  "fashion-erp-company-settings-v1",
  "fashion-erp-pricing-scenarios-v1",
  "fashion-erp-channel-prices-v1",
  "fashion-erp-price-lists-v1",
  "fashion-erp-price-agreements-v1",
  "fashion-erp-pricing-promotions-v1",
  "fashion-erp-scheduled-article-prices-v1",
  "fashion-erp-pricing-history-v1",
  "fashion-erp-variant-barcodes-v1",
  "fashion-erp-barcode-scans-v1",
  "fashion-erp-document-email-logs-v1",
  "stitch-erp-warehouse-locations-v1",
  "stitch-erp-warehouse-positions-v1",
  "stitch-erp-warehouse-transfers-v1",
  "stitch-erp-put-away-tasks-v1",
  "stitch-erp-pick-lists-v1",
  "stitch-erp-stock-counts-v1",
  "stitch-erp-production-orders-v1",
  "stitch-erp-customer-returns-v1",
  "stitch-erp-credit-notes-v1",
  "stitch-erp-exact-bridge-settings-v1",
  "stitch-erp-exact-customer-links-v1",
  "stitch-erp-exact-invoice-exports-v1",
  "stitch-erp-exact-sync-log-v1",
  "stitch-erp-history-events-v1",
  "stitch-erp-reminder-log-v1",
  "stitch-erp-branding-v1",
  "stitch-erp-module-settings-v1",
]);

function isSharedBusinessKey(key: string) {
  return exactSharedKeys.has(key);
}

async function mutateCloudState(
  key: string,
  mutation: PendingMutation,
) {
  const response = await fetch("/api/shared-state", {
    method: mutation.method,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      key,
      ...(mutation.method === "PUT"
        ? { value: mutation.value ?? "" }
        : {}),
    }),
  });

  if (!response.ok) {
    const body = (await response
      .json()
      .catch(() => null)) as { error?: string } | null;

    throw new Error(
      body?.error ||
        `Cloudopslag mislukt (${response.status}).`,
    );
  }
}

export function CloudStorageBridge({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isPublicRoute =
    pathname === "/login" ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/onboarding/");
  const [ready, setReady] = useState(isPublicRoute);
  const [error, setError] = useState("");
  const pendingRef = useRef(
    new Map<string, PendingMutation>(),
  );
  const flushTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isPublicRoute) {
      setReady(true);
      setError("");
      return;
    }

    const nativeGetItem = Storage.prototype.getItem;
    const nativeSetItem = Storage.prototype.setItem;
    const nativeRemoveItem = Storage.prototype.removeItem;

    let active = true;
    let bridgeInstalled = false;

    const flush = async () => {
      flushTimerRef.current = null;
      const mutations = Array.from(
        pendingRef.current.entries(),
      );
      pendingRef.current.clear();

      for (const [key, mutation] of mutations) {
        try {
          await mutateCloudState(key, mutation);
        } catch (mutationError) {
          console.error(
            "Cloudopslag kon niet worden bijgewerkt:",
            mutationError,
          );
          pendingRef.current.set(key, mutation);
        }
      }

      if (
        pendingRef.current.size > 0 &&
        flushTimerRef.current === null
      ) {
        flushTimerRef.current = window.setTimeout(
          flush,
          1500,
        );
      }
    };

    const queueMutation = (
      key: string,
      mutation: PendingMutation,
    ) => {
      pendingRef.current.set(key, mutation);

      if (flushTimerRef.current !== null) {
        window.clearTimeout(flushTimerRef.current);
      }

      flushTimerRef.current = window.setTimeout(
        flush,
        250,
      );
    };

    const installBridge = () => {
      if (bridgeInstalled) {
        return;
      }

      Storage.prototype.setItem = function (
        key: string,
        value: string,
      ) {
        nativeSetItem.call(this, key, value);

        if (
          this === window.localStorage &&
          isSharedBusinessKey(key)
        ) {
          queueMutation(key, {
            method: "PUT",
            value,
          });
        }
      };

      Storage.prototype.removeItem = function (key: string) {
        nativeRemoveItem.call(this, key);

        if (
          this === window.localStorage &&
          isSharedBusinessKey(key)
        ) {
          queueMutation(key, {
            method: "DELETE",
          });
        }
      };

      bridgeInstalled = true;
    };

    const hydrate = async () => {
      try {
        const response = await fetch("/api/shared-state", {
          credentials: "same-origin",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(
            `Cloudopslag laden mislukt (${response.status}).`,
          );
        }

        const payload =
          (await response.json()) as SharedStateResponse;
        const cloudItems = new Map(
          (payload.items ?? [])
            .filter((item) =>
              isSharedBusinessKey(item.key),
            )
            .map((item) => [item.key, item.value]),
        );

        for (const key of exactSharedKeys) {
          const cloudValue = cloudItems.get(key);
          const localValue = nativeGetItem.call(
            window.localStorage,
            key,
          );

          if (cloudValue !== undefined) {
            nativeSetItem.call(
              window.localStorage,
              key,
              cloudValue,
            );
            continue;
          }

          if (localValue !== null) {
            await mutateCloudState(key, {
              method: "PUT",
              value: localValue,
            });
          }
        }

        installBridge();

        if (active) {
          setReady(true);
        }
      } catch (hydrateError) {
        console.error(hydrateError);

        if (active) {
          setError(
            hydrateError instanceof Error
              ? hydrateError.message
              : "Cloudopslag kon niet worden geladen.",
          );
        }
      }
    };

    void hydrate();

    return () => {
      active = false;

      if (flushTimerRef.current !== null) {
        window.clearTimeout(flushTimerRef.current);
      }

      if (bridgeInstalled) {
        Storage.prototype.setItem = nativeSetItem;
        Storage.prototype.removeItem = nativeRemoveItem;
      }
    };
  }, [isPublicRoute]);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-lg rounded-xl border border-red-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">
            Cloudopslag niet beschikbaar
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {error}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            Opnieuw proberen
          </button>
        </div>
      </main>
    );
  }

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-sm font-medium text-slate-600">
          STiTch cloudgegevens laden…
        </div>
      </main>
    );
  }

  return children;
}
