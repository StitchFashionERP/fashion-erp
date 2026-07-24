"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useParams,
  useRouter,
} from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { ProductMediaManager } from "@/components/articles/product-media-manager";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  deleteProduct,
  duplicateProduct,
  setProductStatus,
  getProductById,
  getProductStock,
  getReservedStock,
  type Product,
  type ProductStatus,
} from "@/lib/articles";
import { calculatePricing, getPricingHealth } from "@/lib/pricing-engine";
import {
  getArticleHistoryCheck,
} from "@/lib/article-history";
import { getPricingDefaults } from "@/lib/company-settings";
import { getPricingHistoryForProduct } from "@/lib/pricing-history";
import {
  detectBarcodeType,
  getBarcodeSettingsForVariant,
  registerVariantBarcodes,
  type BarcodeType,
  type VariantBarcodeSettings,
} from "@/lib/barcodes";
import styles from "./product-detail.module.css";

type StatusTone =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral";

type BarcodeForm = {
  ean: string;
  internalBarcode: string;
  supplierBarcode: string;
  barcodeType: BarcodeType;
  unitsPerPack: number;
  unitsPerCarton: number;
};

function getStatusTone(
  status: ProductStatus,
): StatusTone {
  if (status === "Actief") {
    return "success";
  }

  if (status === "Concept") {
    return "info";
  }

  return "neutral";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function createEmptyBarcodeForm(): BarcodeForm {
  return {
    ean: "",
    internalBarcode: "",
    supplierBarcode: "",
    barcodeType: "CODE128",
    unitsPerPack: 1,
    unitsPerCarton: 1,
  };
}

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [product, setProduct] =
    useState<Product | null>(null);

  const [isLoaded, setIsLoaded] =
    useState(false);

  const [selectedVariantId, setSelectedVariantId] =
    useState<string | null>(null);

  const [barcodeSettings, setBarcodeSettings] =
    useState<
      Record<string, VariantBarcodeSettings | null>
    >({});

  const [barcodeForm, setBarcodeForm] =
    useState<BarcodeForm>(
      createEmptyBarcodeForm(),
    );

  const [showBarcodePanel, setShowBarcodePanel] =
    useState(false);

  const [notification, setNotification] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    const loadedProduct = getProductById(
      params.id,
    );

    setProduct(loadedProduct);

    if (loadedProduct) {
      const settingsByVariant =
        Object.fromEntries(
          loadedProduct.variants.map(
            (variant) => [
              variant.id,
              getBarcodeSettingsForVariant(
                variant.id,
              ),
            ],
          ),
        );

      setBarcodeSettings(
        settingsByVariant,
      );
    }

    setIsLoaded(true);
  }, [params.id]);

  useEffect(() => {
    if (!notification) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setNotification(null);
    }, 3000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [notification]);

  const selectedVariant = useMemo(() => {
    if (!product || !selectedVariantId) {
      return null;
    }

    return (
      product.variants.find(
        (variant) =>
          variant.id === selectedVariantId,
      ) ?? null
    );
  }, [product, selectedVariantId]);

  function handleDuplicate() {
    if (!product) {
      return;
    }

    const duplicate = duplicateProduct(
      product.id,
    );

    router.push(
      `/artikelen/${duplicate.id}/bewerken`,
    );
  }

  function handleDelete() {
    if (!product) {
      return;
    }

    const history =
      getArticleHistoryCheck(product.id);

    if (!history.canDelete) {
      window.alert(history.message);
      return;
    }

    const confirmed = window.confirm(
      `Weet je zeker dat je "${product.name}" definitief wilt verwijderen?`,
    );

    if (!confirmed) {
      return;
    }

    deleteProduct(product.id);
    router.push("/artikelen");
  }

  function handleArchive() {
    if (!product) {
      return;
    }

    const updated = setProductStatus(
      product.id,
      product.status === "Inactief"
        ? "Actief"
        : "Inactief",
    );

    setProduct(updated);
    setNotification(
      updated.status === "Inactief"
        ? "Artikel op Inactief gezet."
        : "Artikel opnieuw geactiveerd.",
    );
  }

  function openBarcodePanel(
    variantId: string,
  ) {
    if (!product) {
      return;
    }

    const settings =
      getBarcodeSettingsForVariant(
        variantId,
      );

    setSelectedVariantId(variantId);

    setBarcodeForm({
      ean: settings?.ean ?? "",
      internalBarcode:
        settings?.internalBarcode ?? "",
      supplierBarcode:
        settings?.supplierBarcode ?? "",
      barcodeType:
        settings?.barcodeType ??
        "CODE128",
      unitsPerPack:
        settings?.unitsPerPack ?? 1,
      unitsPerCarton:
        settings?.unitsPerCarton ?? 1,
    });

    setError(null);
    setShowBarcodePanel(true);
  }

  function saveBarcodes() {
    if (
      !product ||
      !selectedVariant
    ) {
      return;
    }

    try {
      const saved =
        registerVariantBarcodes({
          productId: product.id,
          variantId:
            selectedVariant.id,
          ean: barcodeForm.ean,
          internalBarcode:
            barcodeForm.internalBarcode,
          supplierBarcode:
            barcodeForm.supplierBarcode,
          barcodeType:
            barcodeForm.barcodeType,
          unitsPerPack:
            barcodeForm.unitsPerPack,
          unitsPerCarton:
            barcodeForm.unitsPerCarton,
        });

      setBarcodeSettings(
        (current) => ({
          ...current,
          [selectedVariant.id]: saved,
        }),
      );

      setShowBarcodePanel(false);
      setError(null);

      setNotification(
        `Barcodes voor ${selectedVariant.sku} zijn opgeslagen.`,
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Barcodes opslaan is niet gelukt.",
      );
    }
  }

  function getPrimaryBarcode(
    variantId: string,
  ) {
    const settings =
      barcodeSettings[variantId];

    if (!settings) {
      return "";
    }

    return (
      settings.ean ||
      settings.internalBarcode ||
      settings.supplierBarcode ||
      ""
    );
  }

  function getBarcodeCount(
    variantId: string,
  ) {
    const settings =
      barcodeSettings[variantId];

    if (!settings) {
      return 0;
    }

    return [
      settings.ean,
      settings.internalBarcode,
      settings.supplierBarcode,
    ].filter(Boolean).length;
  }

  if (!isLoaded) {
    return (
      <section className="content-card">
        <div className={styles.loadingState}>
          Artikel laden...
        </div>
      </section>
    );
  }

  if (!product) {
    return (
      <div>
        <div className={styles.breadcrumb}>
          <Link href="/artikelen">
            Artikelen
          </Link>
          <span>›</span>
          <span>Niet gevonden</span>
        </div>

        <section className="content-card">
          <div className={styles.notFoundState}>
            <h1>Artikel niet gevonden</h1>

            <p>
              Het artikel bestaat niet meer of
              kon niet worden geladen.
            </p>

            <Link
              href="/artikelen"
              className="button button-primary"
            >
              Terug naar artikelen
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const physicalStock =
    getProductStock(product);

  const reservedStock =
    getReservedStock(product);

  const availableStock =
    physicalStock - reservedStock;

  const pricing = calculatePricing(
    {
      supplierPurchasePrice: product.purchasePrice,
      shippingCosts: product.shippingCosts,
      otherCosts: product.otherCosts,
      brandMarkup: product.brandMarkup,
      salesPrice: product.wholesalePrice,
      retailerMarkup: product.retailerMarkup,
      recommendedRetailPrice:
        product.recommendedRetailPrice,
    },
    "retail-price",
    getPricingDefaults(),
  );

  const pricingHealth = getPricingHealth(
    pricing,
    getPricingDefaults(),
  );

  const pricingHistory =
    getPricingHistoryForProduct(product.id);

  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}>
        <Link href="/artikelen">
          Artikelen
        </Link>
        <span>›</span>
        <span>{product.name}</span>
      </div>

      {notification && (
        <div
          className={styles.notification}
        >
          <span>✓</span>
          {notification}
        </div>
      )}

      <PageHeader
        eyebrow={product.code}
        title={product.name}
        description={`${product.collection} · ${product.category} · ${product.supplier}`}
        action={
          <div className="button-group">
            <button
              className="button button-secondary"
              type="button"
              onClick={handleDuplicate}
            >
              Dupliceren
            </button>

            <button
              className="button button-secondary"
              type="button"
              onClick={handleArchive}
            >
              {product.status === "Inactief"
                ? "Activeren"
                : "Archiveren"}
            </button>

            <Link
              href={`/artikelen/${product.id}/bewerken`}
              className="button button-primary"
            >
              Bewerken
            </Link>
          </div>
        }
      />

      <section
        className={styles.overviewGrid}
      >
        <article
          className={`content-card ${styles.imageCard}`}
        >
          <div className={styles.mediaHeader}>
            <div>
              <h2>Productmedia</h2>
              <p>Packshots, details en campagnebeelden.</p>
            </div>
          </div>

          <ProductMediaManager
            productId={product.id}
            productName={product.name}
            onMessage={setNotification}
          />
        </article>

        <article
          className={`content-card ${styles.mainCard}`}
        >
          <div
            className={styles.detailHeader}
          >
            <div>
              <h2>
                Algemene informatie
              </h2>

              <p>
                De belangrijkste product- en
                collectiegegevens.
              </p>
            </div>

            <StatusBadge
              label={product.status}
              tone={getStatusTone(
                product.status,
              )}
            />
          </div>

          <dl className={styles.detailList}>
            <div>
              <dt>Artikelcode</dt>
              <dd>{product.code}</dd>
            </div>

            <div>
              <dt>Collectie</dt>
              <dd>{product.collection}</dd>
            </div>

            <div>
              <dt>Categorie</dt>
              <dd>{product.category}</dd>
            </div>

            <div>
              <dt>Leverancier</dt>
              <dd>{product.supplier}</dd>
            </div>

            <div>
              <dt>Artikelnummer leverancier</dt>
              <dd>{product.supplierProductCode || "—"}</dd>
            </div>

            <div>
              <dt>Merk</dt>
              <dd>
                {product.brand || "—"}
              </dd>
            </div>

            <div>
              <dt>Materiaal</dt>
              <dd>
                {product.material || "—"}
              </dd>
            </div>

            <div>
              <dt>
                Land van oorsprong
              </dt>
              <dd>
                {product.countryOfOrigin ||
                  "—"}
              </dd>
            </div>

            <div>
              <dt>Totale kostprijs</dt>
              <dd>{formatCurrency(product.totalCost)}</dd>
            </div>

            <div>
              <dt>Verkoopprijs excl. btw</dt>
              <dd>{formatCurrency(product.wholesalePrice)}</dd>
            </div>

            <div>
              <dt>Merk-markup</dt>
              <dd>{product.brandMarkup.toLocaleString("nl-NL")}×</dd>
            </div>

            <div>
              <dt>Adviesverkoopprijs incl. btw</dt>
              <dd>{formatCurrency(product.recommendedRetailPrice)}</dd>
            </div>

            <div>
              <dt>Retailer-markup</dt>
              <dd>{product.retailerMarkup.toLocaleString("nl-NL")}×</dd>
            </div>

            <div>
              <dt>Kleuren</dt>
              <dd>{product.colors.length}</dd>
            </div>

            <div>
              <dt>Maten</dt>
              <dd>{product.sizes.length}</dd>
            </div>
          </dl>

          <div
            className={
              styles.descriptionBlock
            }
          >
            <h3>Omschrijving</h3>

            <p>
              {product.description ||
                "Geen omschrijving ingevuld."}
            </p>
          </div>
        </article>
      </section>

      <section className={styles.pricingOverview}>
        <article className="content-card">
          <div className="content-card-header">
            <div>
              <h2 className="content-card-title">
                Pricing Engine
              </h2>
              <p className="content-card-description">
                Actuele prijsopbouw, werkelijke markups en marges.
              </p>
            </div>

            <span
              className={`${styles.pricingHealth} ${
                styles[`pricingHealth_${pricingHealth.tone}`]
              }`}
            >
              {pricingHealth.label}
            </span>
          </div>

          <div className={styles.pricingCards}>
            <section className={styles.pricingCard}>
              <span>Kostprijs</span>
              <strong>{formatCurrency(pricing.totalCost)}</strong>
              <dl>
                <div>
                  <dt>Inkoopprijs leverancier</dt>
                  <dd>{formatCurrency(pricing.supplierPurchasePrice)}</dd>
                </div>
                <div>
                  <dt>Verzendkosten</dt>
                  <dd>{formatCurrency(pricing.shippingCosts)}</dd>
                </div>
                <div>
                  <dt>Overige kosten</dt>
                  <dd>{formatCurrency(pricing.otherCosts)}</dd>
                </div>
              </dl>
            </section>

            <section className={styles.pricingCard}>
              <span>Verkoop aan winkels</span>
              <strong>{formatCurrency(pricing.salesPrice)}</strong>
              <dl>
                <div>
                  <dt>Merk-markup</dt>
                  <dd>{pricing.brandMarkup.toLocaleString("nl-NL")}×</dd>
                </div>
                <div>
                  <dt>Brutomarge</dt>
                  <dd>{formatCurrency(pricing.ownMarginAmount)}</dd>
                </div>
                <div>
                  <dt>Margepercentage</dt>
                  <dd>{pricing.ownMarginPercentage.toLocaleString("nl-NL")}%</dd>
                </div>
              </dl>
            </section>

            <section className={styles.pricingCard}>
              <span>Adviesverkoopprijs</span>
              <strong>{formatCurrency(pricing.recommendedRetailPrice)}</strong>
              <dl>
                <div>
                  <dt>Exclusief btw</dt>
                  <dd>{formatCurrency(pricing.recommendedRetailPriceExVat)}</dd>
                </div>
                <div>
                  <dt>Retailer-markup</dt>
                  <dd>{pricing.retailerMarkup.toLocaleString("nl-NL")}×</dd>
                </div>
                <div>
                  <dt>Retailermarge</dt>
                  <dd>{pricing.retailerMarginPercentage.toLocaleString("nl-NL")}%</dd>
                </div>
              </dl>
            </section>
          </div>

          {pricingHealth.messages.length > 0 && (
            <div className={styles.pricingMessage}>
              {pricingHealth.messages.map((message) => (
                <span key={message}>{message}</span>
              ))}
            </div>
          )}
        </article>

        <article className="content-card">
          <div className="content-card-header">
            <div>
              <h2 className="content-card-title">
                Prijshistorie
              </h2>
              <p className="content-card-description">
                De laatste wijzigingen in kostprijs, verkoopprijs en markups.
              </p>
            </div>
          </div>

          {pricingHistory.length === 0 ? (
            <div className={styles.emptyPricingHistory}>
              Nog geen prijswijzigingen geregistreerd.
            </div>
          ) : (
            <div className={styles.pricingHistory}>
              {pricingHistory.slice(0, 6).map((entry) => (
                <div key={entry.id} className={styles.pricingHistoryItem}>
                  <div>
                    <strong>
                      {entry.action === "created"
                        ? "Prijsstructuur aangemaakt"
                        : "Prijsstructuur gewijzigd"}
                    </strong>
                    <span>
                      {new Intl.DateTimeFormat("nl-NL", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(entry.createdAt))}
                      {` · ${entry.changedBy}`}
                    </span>
                  </div>
                  <span>
                    {entry.changedFields.length} wijziging
                    {entry.changedFields.length === 1 ? "" : "en"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className={styles.stockGrid}>
        <article className="metric-card">
          <div className="metric-label">
            Fysieke voorraad
          </div>

          <div className="metric-value">
            {physicalStock}
          </div>

          <div className="metric-detail">
            stuks aanwezig
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-label">
            Gereserveerd
          </div>

          <div className="metric-value">
            {reservedStock}
          </div>

          <div className="metric-detail">
            voor open verkooporders
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-label">
            Beschikbaar
          </div>

          <div className="metric-value">
            {availableStock}
          </div>

          <div className="metric-detail">
            direct verkoopbaar
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-label">
            Varianten
          </div>

          <div className="metric-value">
            {product.variants.length}
          </div>

          <div className="metric-detail">
            maat-kleurcombinaties
          </div>
        </article>
      </section>

      <section className="content-card">
        <div className="content-card-header">
          <div>
            <h2 className="content-card-title">
              Varianten, voorraad en barcodes
            </h2>

            <p className="content-card-description">
              Voorraad, prijzen en barcodegegevens
              per kleur, maat en SKU.
            </p>
          </div>

          <Link
            href={`/artikelen/${product.id}/bewerken`}
            className="button button-secondary"
          >
            Varianten beheren
          </Link>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Kleur</th>
                <th>Maat</th>
                <th>Barcode</th>
                <th>Verpakking</th>
                <th className="table-number">
                  Fysiek
                </th>
                <th className="table-number">
                  Gereserveerd
                </th>
                <th className="table-number">
                  Beschikbaar
                </th>
                <th className="table-number">Kostprijs</th>
                <th className="table-number">Verkoopprijs</th>
                <th className="table-number">Adviesprijs</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {product.variants.map(
                (variant) => {
                  const available =
                    variant.physicalStock -
                    variant.reservedStock;

                  const settings =
                    barcodeSettings[
                      variant.id
                    ];

                  const primaryBarcode =
                    getPrimaryBarcode(
                      variant.id,
                    );

                  const barcodeCount =
                    getBarcodeCount(
                      variant.id,
                    );

                  return (
                    <tr key={variant.id}>
                      <td>
                        <span className="table-link">
                          {variant.sku}
                        </span>
                      </td>

                      <td className="table-primary">
                        {variant.color}
                      </td>

                      <td>{variant.size}</td>

                      <td>
                        {primaryBarcode ? (
                          <div
                            className={
                              styles.barcodeCell
                            }
                          >
                            <strong>
                              {primaryBarcode}
                            </strong>

                            <span>
                              {barcodeCount} code
                              {barcodeCount === 1
                                ? ""
                                : "s"}
                            </span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className={
                              styles.addBarcodeButton
                            }
                            onClick={() =>
                              openBarcodePanel(
                                variant.id,
                              )
                            }
                          >
                            + Barcode toevoegen
                          </button>
                        )}
                      </td>

                      <td>
                        {settings ? (
                          <div
                            className={
                              styles.packageInfo
                            }
                          >
                            <span>
                              Verpakking{" "}
                              {
                                settings.unitsPerPack
                              }
                            </span>

                            <span>
                              Doos{" "}
                              {
                                settings.unitsPerCarton
                              }
                            </span>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td className="table-number">
                        {
                          variant.physicalStock
                        }
                      </td>

                      <td className="table-number">
                        {
                          variant.reservedStock
                        }
                      </td>

                      <td
                        className={`table-number table-primary ${
                          available <= 5
                            ? "stock-warning"
                            : ""
                        }`}
                      >
                        {available}
                      </td>

                      <td className="table-number">{formatCurrency(variant.totalCost)}</td>
                      <td className="table-number">{formatCurrency(variant.wholesalePrice)}</td>
                      <td className="table-number">{formatCurrency(variant.recommendedRetailPrice)}</td>

                      <td>
                        <button
                          type="button"
                          className={
                            styles.rowActionButton
                          }
                          onClick={() =>
                            openBarcodePanel(
                              variant.id,
                            )
                          }
                          aria-label={`Barcodebeheer voor ${variant.sku}`}
                        >
                          •••
                        </button>
                      </td>
                    </tr>
                  );
                },
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.dangerZone}>
        <div>
          <h2>Artikel verwijderen</h2>

          <p>
            Het artikel wordt uit de lokale
            artikeladministratie verwijderd.
          </p>
        </div>

        <button
          className={styles.deleteButton}
          type="button"
          onClick={handleDelete}
        >
          Artikel verwijderen
        </button>
      </section>

      {showBarcodePanel &&
        selectedVariant && (
          <div
            className={
              styles.dialogBackdrop
            }
            onMouseDown={(event) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                setShowBarcodePanel(false);
              }
            }}
          >
            <section
              className={styles.dialog}
              role="dialog"
              aria-modal="true"
              aria-labelledby="barcode-dialog-title"
            >
              <header
                className={
                  styles.dialogHeader
                }
              >
                <div>
                  <span>
                    Barcodebeheer
                  </span>

                  <h2 id="barcode-dialog-title">
                    {selectedVariant.sku}
                  </h2>

                  <p>
                    {product.name} ·{" "}
                    {selectedVariant.color} ·{" "}
                    {selectedVariant.size}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowBarcodePanel(false)
                  }
                  aria-label="Sluiten"
                >
                  ×
                </button>
              </header>

              <div
                className={
                  styles.dialogBody
                }
              >
                {error && (
                  <div
                    className={
                      styles.dialogError
                    }
                  >
                    <span>!</span>
                    {error}
                  </div>
                )}

                <div
                  className={
                    styles.barcodeIntro
                  }
                >
                  <strong>
                    Barcodes zijn optioneel
                  </strong>

                  <p>
                    Je kunt voorraad altijd
                    handmatig inslaan. De barcode
                    versnelt zoeken, ontvangen en
                    orderpicken.
                  </p>
                </div>

                <div
                  className={
                    styles.barcodeFormGrid
                  }
                >
                  <label>
                    <span>EAN / GTIN</span>

                    <input
                      type="text"
                      value={barcodeForm.ean}
                      onChange={(event) =>
                        setBarcodeForm(
                          (current) => ({
                            ...current,
                            ean:
                              event.target
                                .value,
                            barcodeType:
                              event.target
                                .value
                                ? detectBarcodeType(
                                    event
                                      .target
                                      .value,
                                  )
                                : current.barcodeType,
                          }),
                        )
                      }
                      placeholder="Bijv. 8712345678906"
                    />
                  </label>

                  <label>
                    <span>
                      Barcodetype
                    </span>

                    <select
                      value={
                        barcodeForm.barcodeType
                      }
                      onChange={(event) =>
                        setBarcodeForm(
                          (current) => ({
                            ...current,
                            barcodeType:
                              event.target
                                .value as BarcodeType,
                          }),
                        )
                      }
                    >
                      <option value="EAN13">
                        EAN-13
                      </option>

                      <option value="EAN8">
                        EAN-8
                      </option>

                      <option value="UPC">
                        UPC
                      </option>

                      <option value="CODE128">
                        Code 128
                      </option>

                      <option value="OTHER">
                        Overig
                      </option>
                    </select>
                  </label>

                  <label>
                    <span>
                      Interne barcode
                    </span>

                    <input
                      type="text"
                      value={
                        barcodeForm.internalBarcode
                      }
                      onChange={(event) =>
                        setBarcodeForm(
                          (current) => ({
                            ...current,
                            internalBarcode:
                              event.target
                                .value,
                          }),
                        )
                      }
                      placeholder="Bijv. INT-TS9001-BLK-M"
                    />
                  </label>

                  <label>
                    <span>
                      Leveranciersbarcode
                    </span>

                    <input
                      type="text"
                      value={
                        barcodeForm.supplierBarcode
                      }
                      onChange={(event) =>
                        setBarcodeForm(
                          (current) => ({
                            ...current,
                            supplierBarcode:
                              event.target
                                .value,
                          }),
                        )
                      }
                      placeholder="Barcode van leverancier"
                    />
                  </label>

                  <label>
                    <span>
                      Stuks per verpakking
                    </span>

                    <input
                      type="number"
                      min={1}
                      value={
                        barcodeForm.unitsPerPack
                      }
                      onChange={(event) =>
                        setBarcodeForm(
                          (current) => ({
                            ...current,
                            unitsPerPack:
                              Math.max(
                                1,
                                Number(
                                  event
                                    .target
                                    .value,
                                ) || 1,
                              ),
                          }),
                        )
                      }
                    />
                  </label>

                  <label>
                    <span>
                      Stuks per doos
                    </span>

                    <input
                      type="number"
                      min={1}
                      value={
                        barcodeForm.unitsPerCarton
                      }
                      onChange={(event) =>
                        setBarcodeForm(
                          (current) => ({
                            ...current,
                            unitsPerCarton:
                              Math.max(
                                1,
                                Number(
                                  event
                                    .target
                                    .value,
                                ) || 1,
                              ),
                          }),
                        )
                      }
                    />
                  </label>
                </div>
              </div>

              <footer
                className={
                  styles.dialogFooter
                }
              >
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() =>
                    setShowBarcodePanel(false)
                  }
                >
                  Annuleren
                </button>

                <button
                  type="button"
                  className="button button-primary"
                  onClick={saveBarcodes}
                >
                  Barcodes opslaan
                </button>
              </footer>
            </section>
          </div>
        )}
    </div>
  );
}