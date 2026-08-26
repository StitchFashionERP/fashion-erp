"use client";

import { useEffect, useState, type ReactNode } from "react";
import { fetchProducts } from "@/lib/articles";
import { barcodeSharedStateKeys } from "@/lib/barcodes";
import { eanCenterSharedStateKeys } from "@/lib/ean-center";
import { exactBridgeSharedStateKeys } from "@/lib/exact-bridge";
import { historyEngineSharedStateKeys } from "@/lib/history-engine";
import { priceListsSharedStateKeys } from "@/lib/price-lists";
import { pricingHistorySharedStateKeys } from "@/lib/pricing-history";
import { pricingProfessionalSharedStateKeys } from "@/lib/pricing-professional";
import { pricingPromotionsSharedStateKeys } from "@/lib/pricing-promotions";
import { productMediaSharedStateKeys } from "@/lib/product-media";
import { scheduledPricesSharedStateKeys } from "@/lib/scheduled-prices";

import { inventorySharedStateKeys } from "@/lib/inventory";
import { invoiceSharedStateKeys } from "@/lib/invoices";
import { productionSharedStateKeys } from "@/lib/production";
import { returnsSharedStateKeys } from "@/lib/returns";
import { debtorManagementSharedStateKeys } from "@/lib/debtor-management";
import { documentEmailSharedStateKeys } from "@/lib/document-emails";
import { numberSeriesSharedStateKeys } from "@/lib/number-series";
import { appUsersSharedStateKeys } from "@/lib/users";
import { communicationSettingsSharedStateKeys } from "@/lib/communication-settings";
import { loadCompanySettings } from "@/lib/company-settings";
import { purchasingSharedStateKeys } from "@/lib/purchasing";
import { warehouseSharedStateKeys } from "@/lib/warehouse";
import { hydrateSharedState } from "@/lib/shared-state-client";
import {
  hydrateCustomers,
  hydrateMasterData,
} from "@/lib/master-data";

export function BusinessDataBootstrap({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      try {
        const steps = [
          ["artikelen", () => fetchProducts()],
          ["stamgegevens", () => hydrateMasterData()],
          ["klanten", () => hydrateCustomers()],
          ["bedrijfsinstellingen", () => loadCompanySettings()],
          [
            "gedeelde bedrijfsdata",
            () =>
              hydrateSharedState([
                ...inventorySharedStateKeys,
                ...purchasingSharedStateKeys,
                ...warehouseSharedStateKeys,
                ...invoiceSharedStateKeys,
                ...numberSeriesSharedStateKeys,
                ...productionSharedStateKeys,
                ...returnsSharedStateKeys,
                ...debtorManagementSharedStateKeys,
                ...documentEmailSharedStateKeys,
                ...appUsersSharedStateKeys,
                ...communicationSettingsSharedStateKeys,
                ...barcodeSharedStateKeys,
                ...eanCenterSharedStateKeys,
                ...exactBridgeSharedStateKeys,
                ...historyEngineSharedStateKeys,
                ...priceListsSharedStateKeys,
                ...pricingHistorySharedStateKeys,
                ...pricingProfessionalSharedStateKeys,
                ...pricingPromotionsSharedStateKeys,
                ...productMediaSharedStateKeys,
                ...scheduledPricesSharedStateKeys,
              ]),
          ],
        ] as const;

        for (const [name, loader] of steps) {
          try {
            console.log(`[BusinessDataBootstrap] START: ${name}`);
            await loader();
            console.log(`[BusinessDataBootstrap] OK: ${name}`);
          } catch (error) {
            console.error(
              `[BusinessDataBootstrap] FAILED: ${name}`,
              error,
            );

            throw new Error(
              `${name}: ${
                error instanceof Error
                  ? error.message
                  : String(error)
              }`,
            );
          }
        }

        if (!cancelled) {
          setStatus("ready");
        }
      } catch (error) {
        console.error("Centrale bedrijfsdata kon niet worden geladen.", error);
        if (!cancelled) {
          setMessage(
            error instanceof Error
              ? error.message
              : "Centrale bedrijfsdata kon niet worden geladen.",
          );
          setStatus("error");
        }
      }
    }

    void initialize();
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "loading") {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <div>Bedrijfsgegevens laden…</div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <div>
          <strong>Bedrijfsgegevens konden niet worden geladen.</strong>
          <div>{message}</div>
          <button type="button" onClick={() => window.location.reload()}>
            Opnieuw proberen
          </button>
        </div>
      </div>
    );
  }

  return children;
}
