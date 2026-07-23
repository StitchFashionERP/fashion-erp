"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useSearchParams,
} from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { BarcodeScannerInput } from "@/components/scanning/barcode-scanner-input";
import {
  findVariantByBarcodeOrSku,
  getPickListById,
  getPickLists,
  getWarehouseLocations,
  getVariantLocationStock,
  pickWarehouseLine,
  transferWarehouseStock,
  type PickList,
} from "@/lib/warehouse";
import styles from "./scanner.module.css";

type Mode = "Picken" | "Verplaatsen";

function WarehouseScannerContent() {
  const searchParams = useSearchParams();
  const [mode, setMode] =
    useState<Mode>("Picken");
  const [pickLists, setPickLists] =
    useState<PickList[]>([]);
  const [pickListId, setPickListId] =
    useState(
      searchParams.get("pickListId") || "",
    );
  const [sourceLocationId, setSourceLocationId] =
    useState("");
  const [
    destinationLocationId,
    setDestinationLocationId,
  ] = useState("");
  const [message, setMessage] =
    useState("");
  const [error, setError] = useState("");

  const locations = getWarehouseLocations();

  function reload() {
    setPickLists(getPickLists());
  }

  useEffect(() => {
    reload();
  }, []);

  const selectedPickList = useMemo(
    () =>
      pickListId
        ? getPickListById(pickListId)
        : null,
    [pickListId, pickLists],
  );

  function handleScan(value: string) {
    setError("");
    setMessage("");

    const found =
      findVariantByBarcodeOrSku(value);

    if (!found) {
      setError(
        `Geen variant gevonden voor ${value}.`,
      );
      return;
    }

    if (mode === "Picken") {
      if (!selectedPickList) {
        setError(
          "Selecteer eerst een picklijst.",
        );
        return;
      }

      const line =
        selectedPickList.lines.find(
          (item) =>
            item.variantId ===
              found.variant.id &&
            item.pickedQuantity <
              item.requiredQuantity,
        );

      if (!line) {
        setError(
          `${found.variant.sku} staat niet meer open op deze picklijst.`,
        );
        return;
      }

      try {
        pickWarehouseLine({
          pickListId:
            selectedPickList.id,
          lineId: line.id,
          quantity: 1,
        });

        setMessage(
          `1x ${found.variant.sku} gepickt.`,
        );
        reload();
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Scannen is niet gelukt.",
        );
      }

      return;
    }

    if (
      !sourceLocationId ||
      !destinationLocationId
    ) {
      setError(
        "Selecteer bron- en doellocatie.",
      );
      return;
    }

    try {
      transferWarehouseStock({
        productId: found.product.id,
        variantId: found.variant.id,
        fromLocationId:
          sourceLocationId,
        toLocationId:
          destinationLocationId,
        quantity: 1,
        reason: "Scannerverplaatsing",
        userName: "Daan",
      });

      setMessage(
        `1x ${found.variant.sku} verplaatst.`,
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Verplaatsen is niet gelukt.",
      );
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Warehouse"
        title="Scanner"
        description="Gebruik een USB-, Bluetooth- of camerascanner voor picken en voorraadverplaatsingen."
      />

      <section className={styles.modeTabs}>
        {(["Picken", "Verplaatsen"] as Mode[]).map(
          (item) => (
            <button
              key={item}
              type="button"
              className={
                mode === item
                  ? styles.activeMode
                  : ""
              }
              onClick={() => setMode(item)}
            >
              {item}
            </button>
          ),
        )}
      </section>

      <section className={styles.scannerGrid}>
        <article className="content-card">
          <div className="content-card-header">
            <div>
              <h2 className="content-card-title">
                {mode === "Picken"
                  ? "Order picken"
                  : "Voorraad verplaatsen"}
              </h2>
              <p className="content-card-description">
                Scan een SKU of barcode. Iedere
                scan verwerkt één stuk.
              </p>
            </div>
          </div>

          <div className={styles.form}>
            {mode === "Picken" ? (
              <label>
                <span>Picklijst</span>
                <select
                  value={pickListId}
                  onChange={(event) =>
                    setPickListId(
                      event.target.value,
                    )
                  }
                >
                  <option value="">
                    Selecteer picklijst
                  </option>
                  {pickLists
                    .filter(
                      (list) =>
                        list.status === "Bezig" ||
                        list.status === "Gepickt",
                    )
                    .map((list) => (
                      <option
                        key={list.id}
                        value={list.id}
                      >
                        {list.pickNumber} ·{" "}
                        {list.customerName}
                      </option>
                    ))}
                </select>
              </label>
            ) : (
              <div className={styles.locationGrid}>
                <label>
                  <span>Bronlocatie</span>
                  <select
                    value={sourceLocationId}
                    onChange={(event) =>
                      setSourceLocationId(
                        event.target.value,
                      )
                    }
                  >
                    <option value="">
                      Selecteer locatie
                    </option>
                    {locations.map(
                      (location) => (
                        <option
                          key={location.id}
                          value={location.id}
                        >
                          {location.code} ·{" "}
                          {location.name}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label>
                  <span>Doellocatie</span>
                  <select
                    value={
                      destinationLocationId
                    }
                    onChange={(event) =>
                      setDestinationLocationId(
                        event.target.value,
                      )
                    }
                  >
                    <option value="">
                      Selecteer locatie
                    </option>
                    {locations.map(
                      (location) => (
                        <option
                          key={location.id}
                          value={location.id}
                        >
                          {location.code} ·{" "}
                          {location.name}
                        </option>
                      ),
                    )}
                  </select>
                </label>
              </div>
            )}

            <BarcodeScannerInput
              label="Scan artikel"
              placeholder="Scan SKU of voer handmatig in"
              onScan={handleScan}
              autoFocus
            />

            {message && (
              <div className={styles.success}>
                ✓ {message}
              </div>
            )}

            {error && (
              <div className={styles.error}>
                ! {error}
              </div>
            )}
          </div>
        </article>

        <article className="content-card">
          <div className="content-card-header">
            <div>
              <h2 className="content-card-title">
                Voortgang
              </h2>
            </div>
          </div>

          {selectedPickList ? (
            <div className={styles.progressList}>
              {selectedPickList.lines.map(
                (line) => (
                  <div
                    key={line.id}
                    className={styles.progressLine}
                  >
                    <div>
                      <strong>
                        {line.productName}
                      </strong>
                      <span>
                        {line.sku} · {line.color} ·{" "}
                        {line.size}
                      </span>
                    </div>

                    <strong>
                      {line.pickedQuantity}/
                      {line.requiredQuantity}
                    </strong>
                  </div>
                ),
              )}
            </div>
          ) : (
            <div className={styles.empty}>
              Selecteer een picklijst om de
              voortgang te bekijken.
            </div>
          )}
        </article>
      </section>
    </div>
  );
}


export default function WarehouseScannerPage() {
  return (
    <Suspense fallback={<div />}>
      <WarehouseScannerContent />
    </Suspense>
  );
}
