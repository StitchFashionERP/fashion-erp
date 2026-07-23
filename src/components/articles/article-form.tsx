"use client";

import Link from "next/link";
import {
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getStoredProducts,
  getVariantKey,
  type Product,
  type ProductInput,
  type ProductStatus,
} from "@/lib/articles";
import { calculatePricing } from "@/lib/pricing-engine";
import {
  articleVatCodes,
  type VatCode,
} from "@/lib/vat-engine";
import { getCompanySettings } from "@/lib/company-settings";
import {
  getCategories,
  getCollections,
  getColors,
  getSizes,
  getSuppliers,
  type NamedMasterData,
} from "@/lib/master-data";
import styles from "./article-form.module.css";

type ArticleFormProps = {
  initialProduct?: Product;
  submitLabel: string;
  onSubmit: (input: ProductInput) => void;
};

export function ArticleForm({
  initialProduct,
  submitLabel,
  onSubmit,
}: ArticleFormProps) {
  const [collections, setCollections] = useState<
    string[]
  >([]);
  const [categories, setCategories] = useState<
    string[]
  >([]);
  const [suppliers, setSuppliers] = useState<
    string[]
  >([]);
  const [colorOptions, setColorOptions] = useState<
    NamedMasterData[]
  >([]);
  const [sizeOptions, setSizeOptions] = useState<
    NamedMasterData[]
  >([]);

  const [code, setCode] = useState(
    initialProduct?.code ?? "",
  );
  const [name, setName] = useState(
    initialProduct?.name ?? "",
  );
  const [collection, setCollection] = useState(
    initialProduct?.collection ?? "",
  );
  const [category, setCategory] = useState(
    initialProduct?.category ?? "",
  );
  const [supplier, setSupplier] = useState(
    initialProduct?.supplier ?? "",
  );
  const [status, setStatus] =
    useState<ProductStatus>(
      initialProduct?.status ?? "Concept",
    );
  const [vatCode, setVatCode] =
    useState<VatCode>(
      initialProduct?.vatCode ?? "2V",
    );

  const [brand, setBrand] = useState(
    initialProduct?.brand ?? "Demo Fashion",
  );
  const [material, setMaterial] = useState(
    initialProduct?.material ?? "",
  );
  const [garmentType, setGarmentType] = useState(
    initialProduct?.garmentType ?? "",
  );
  const [fit, setFit] = useState(
    initialProduct?.fit ?? "",
  );
  const [colorFamily, setColorFamily] = useState(
    initialProduct?.colorFamily ?? "",
  );
  const [seasonType, setSeasonType] = useState<
    "Doorlopend" | "Voorjaar/Zomer" | "Herfst/Winter"
  >(
    initialProduct?.seasonType ?? "Doorlopend",
  );

  const [countryOfOrigin, setCountryOfOrigin] =
    useState(
      initialProduct?.countryOfOrigin ?? "",
    );
  const [description, setDescription] =
    useState(initialProduct?.description ?? "");

  const [purchasePrice, setPurchasePrice] =
    useState(
      initialProduct
        ? String(initialProduct.purchasePrice).replace(
            ".",
            ",",
          )
        : "",
    );

  const settings = useMemo(() => getCompanySettings(), []);

  const [shippingCosts, setShippingCosts] = useState(
    initialProduct ? String(initialProduct.shippingCosts ?? 0).replace(".", ",") : "",
  );
  const [otherCosts, setOtherCosts] = useState(
    initialProduct ? String(initialProduct.otherCosts ?? 0).replace(".", ",") : "",
  );
  const [brandMarkup, setBrandMarkup] = useState(
    String(initialProduct?.brandMarkup || settings.pricing.brandMarkup).replace(".", ","),
  );
  const [salesPrice, setSalesPrice] = useState(
    initialProduct ? String(initialProduct.wholesalePrice).replace(".", ",") : "",
  );
  const [retailerMarkup, setRetailerMarkup] = useState(
    String(initialProduct?.retailerMarkup || settings.pricing.retailerMarkup).replace(".", ","),
  );
  const [recommendedRetailPrice, setRecommendedRetailPrice] = useState(
    initialProduct ? String(initialProduct.recommendedRetailPrice ?? 0).replace(".", ",") : "",
  );

  function parseNumber(value: string) {
    return Number(value.replace(",", ".")) || 0;
  }

  const pricing = useMemo(
    () =>
      calculatePricing(
        {
          supplierPurchasePrice: parseNumber(purchasePrice),
          shippingCosts: parseNumber(shippingCosts),
          otherCosts: parseNumber(otherCosts),
          brandMarkup: parseNumber(brandMarkup),
          salesPrice: parseNumber(salesPrice),
          retailerMarkup: parseNumber(retailerMarkup),
          recommendedRetailPrice: parseNumber(recommendedRetailPrice),
        },
        parseNumber(salesPrice) > 0
          ? "sales-price"
          : "targets",
        settings.pricing,
      ),
    [purchasePrice, shippingCosts, otherCosts, brandMarkup, salesPrice, retailerMarkup, recommendedRetailPrice, settings.pricing],
  );

  function displayNumber(value: number) {
    return String(Math.round(value * 100) / 100).replace(".", ",");
  }

  function updateCosts(
    field: "purchase" | "shipping" | "other",
    value: string,
  ) {
    const nextPurchasePrice =
      field === "purchase"
        ? parseNumber(value)
        : parseNumber(purchasePrice);
    const nextShippingCosts =
      field === "shipping"
        ? parseNumber(value)
        : parseNumber(shippingCosts);
    const nextOtherCosts =
      field === "other"
        ? parseNumber(value)
        : parseNumber(otherCosts);

    if (field === "purchase") {
      setPurchasePrice(value);
    } else if (field === "shipping") {
      setShippingCosts(value);
    } else {
      setOtherCosts(value);
    }

    const shouldApplyTargets =
      !initialProduct ||
      settings.pricing.mode === "automatic";

    if (!shouldApplyTargets) {
      return;
    }

    const next = calculatePricing(
      {
        supplierPurchasePrice: nextPurchasePrice,
        shippingCosts: nextShippingCosts,
        otherCosts: nextOtherCosts,
        brandMarkup: parseNumber(brandMarkup),
        retailerMarkup: parseNumber(retailerMarkup),
      },
      "targets",
      settings.pricing,
    );

    setSalesPrice(displayNumber(next.salesPrice));
    setRecommendedRetailPrice(
      displayNumber(next.recommendedRetailPrice),
    );
  }

  function applyCompanyPricingTargets() {
    const next = calculatePricing(
      {
        supplierPurchasePrice: parseNumber(purchasePrice),
        shippingCosts: parseNumber(shippingCosts),
        otherCosts: parseNumber(otherCosts),
        brandMarkup: settings.pricing.brandMarkup,
        retailerMarkup: settings.pricing.retailerMarkup,
      },
      "targets",
      settings.pricing,
    );

    setBrandMarkup(
      displayNumber(settings.pricing.brandMarkup),
    );
    setRetailerMarkup(
      displayNumber(settings.pricing.retailerMarkup),
    );
    setSalesPrice(displayNumber(next.salesPrice));
    setRecommendedRetailPrice(
      displayNumber(next.recommendedRetailPrice),
    );
  }

  function updateFromBrandMarkup(value: string) {
    setBrandMarkup(value);
    const next = calculatePricing({
      supplierPurchasePrice: parseNumber(purchasePrice),
      shippingCosts: parseNumber(shippingCosts),
      otherCosts: parseNumber(otherCosts),
      brandMarkup: parseNumber(value),
      retailerMarkup: parseNumber(retailerMarkup),
    }, "brand-markup", settings.pricing);
    setSalesPrice(displayNumber(next.salesPrice));
    setRecommendedRetailPrice(displayNumber(next.recommendedRetailPrice));
  }

  function updateFromSalesPrice(value: string) {
    setSalesPrice(value);
    const next = calculatePricing({
      supplierPurchasePrice: parseNumber(purchasePrice),
      shippingCosts: parseNumber(shippingCosts),
      otherCosts: parseNumber(otherCosts),
      salesPrice: parseNumber(value),
      retailerMarkup: parseNumber(retailerMarkup),
    }, "sales-price", settings.pricing);
    setBrandMarkup(displayNumber(next.brandMarkup));
    setRecommendedRetailPrice(displayNumber(next.recommendedRetailPrice));
  }

  function updateFromRetailerMarkup(value: string) {
    setRetailerMarkup(value);
    const next = calculatePricing({
      supplierPurchasePrice: parseNumber(purchasePrice),
      shippingCosts: parseNumber(shippingCosts),
      otherCosts: parseNumber(otherCosts),
      salesPrice: parseNumber(salesPrice),
      retailerMarkup: parseNumber(value),
    }, "retailer-markup", settings.pricing);
    setRecommendedRetailPrice(displayNumber(next.recommendedRetailPrice));
  }

  function updateFromRetailPrice(value: string) {
    setRecommendedRetailPrice(value);
    const next = calculatePricing({
      supplierPurchasePrice: parseNumber(purchasePrice),
      shippingCosts: parseNumber(shippingCosts),
      otherCosts: parseNumber(otherCosts),
      salesPrice: parseNumber(salesPrice),
      recommendedRetailPrice: parseNumber(value),
    }, "retail-price", settings.pricing);
    setRetailerMarkup(displayNumber(next.retailerMarkup));
  }

  const [selectedColors, setSelectedColors] =
    useState<string[]>(
      initialProduct?.colors ?? [],
    );

  const [selectedSizes, setSelectedSizes] =
    useState<string[]>(
      initialProduct?.sizes ?? [],
    );

  const [stockByVariant, setStockByVariant] =
    useState<Record<string, number>>(() => {
      if (!initialProduct) {
        return {};
      }

      return Object.fromEntries(
        initialProduct.variants.map((variant) => [
          getVariantKey(
            variant.color,
            variant.size,
          ),
          variant.physicalStock,
        ]),
      );
    });

  const [error, setError] = useState("");

  useEffect(() => {
    const collectionValues = getCollections()
      .filter((item) => item.status !== "Gearchiveerd")
      .map((item) => item.code);

    const categoryValues = getCategories()
      .filter((item) => item.isActive)
      .map((item) => item.name);

    const supplierValues = getSuppliers()
      .filter((item) => item.status === "Actief")
      .map((item) => item.companyName);

    const activeColors = getColors().filter(
      (item) => item.isActive,
    );

    const activeSizes = getSizes().filter(
      (item) => item.isActive,
    );

    setCollections(collectionValues);
    setCategories(categoryValues);
    setSuppliers(supplierValues);
    setColorOptions(activeColors);
    setSizeOptions(activeSizes);

    if (!initialProduct) {
      setCollection(
        (current) =>
          current || collectionValues[0] || "",
      );
      setCategory(
        (current) =>
          current || categoryValues[0] || "",
      );
      setSupplier(
        (current) =>
          current || supplierValues[0] || "",
      );
    }
  }, [initialProduct]);

  const variantRows = useMemo(
    () =>
      selectedColors.flatMap((color) =>
        selectedSizes.map((size) => ({
          key: getVariantKey(color, size),
          color,
          size,
        })),
      ),
    [selectedColors, selectedSizes],
  );

  function toggleColor(color: string) {
    setSelectedColors((current) =>
      current.includes(color)
        ? current.filter((item) => item !== color)
        : [...current, color],
    );
  }

  function toggleSize(size: string) {
    setSelectedSizes((current) =>
      current.includes(size)
        ? current.filter((item) => item !== size)
        : [...current, size],
    );
  }

  function changeVariantStock(
    key: string,
    value: string,
  ) {
    const parsed = Math.max(
      0,
      Number.parseInt(value || "0", 10) || 0,
    );

    setStockByVariant((current) => ({
      ...current,
      [key]: parsed,
    }));
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setError("");

    const normalizedCode = code
      .trim()
      .toUpperCase();

    if (!normalizedCode || !name.trim()) {
      setError(
        "Vul minimaal een artikelcode en artikelnaam in.",
      );
      return;
    }

    if (!collection || !category || !supplier) {
      setError(
        "Selecteer een collectie, categorie en leverancier.",
      );
      return;
    }

    if (
      selectedColors.length === 0 ||
      selectedSizes.length === 0
    ) {
      setError(
        "Selecteer minimaal één kleur en één maat.",
      );
      return;
    }

    const codeExists = getStoredProducts().some(
      (product) =>
        product.id !== initialProduct?.id &&
        product.code.toLowerCase() ===
          normalizedCode.toLowerCase(),
    );

    if (codeExists) {
      setError(
        "Deze artikelcode bestaat al. Gebruik een unieke artikelcode.",
      );
      return;
    }

    onSubmit({
      code: normalizedCode,
      name: name.trim(),
      collection,
      category,
      supplier,
      status,
      vatCode,
      brand: brand.trim(),
      material: material.trim(),
      garmentType: garmentType.trim(),
      fit: fit.trim(),
      colorFamily: colorFamily.trim(),
      seasonType,
      countryOfOrigin:
        countryOfOrigin.trim(),
      description: description.trim(),
      purchasePrice: parseNumber(purchasePrice),
      wholesalePrice: parseNumber(salesPrice),
      shippingCosts: parseNumber(shippingCosts),
      otherCosts: parseNumber(otherCosts),
      totalCost: pricing.totalCost,
      brandMarkup: parseNumber(brandMarkup),
      recommendedRetailPrice: parseNumber(recommendedRetailPrice),
      retailerMarkup: parseNumber(retailerMarkup),
      colors: selectedColors,
      sizes: selectedSizes,
      stockByVariant,
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <section className={styles.layout}>
        <div className={styles.mainColumn}>
          <article className="content-card">
            <div className="content-card-header">
              <div>
                <h2 className="content-card-title">
                  Algemene informatie
                </h2>

                <p className="content-card-description">
                  De belangrijkste gegevens van het artikel.
                </p>
              </div>
            </div>

            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span>
                  Artikelcode
                  <strong>*</strong>
                </span>

                <input
                  type="text"
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value)
                  }
                />
              </label>

              <label className={styles.field}>
                <span>
                  Artikelnaam
                  <strong>*</strong>
                </span>

                <input
                  type="text"
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                />
              </label>

              <label className={styles.field}>
                <span>Collectie</span>

                <select
                  value={collection}
                  onChange={(event) =>
                    setCollection(
                      event.target.value,
                    )
                  }
                >
                  {collections.map((item) => (
                    <option key={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span>Categorie</span>

                <select
                  value={category}
                  onChange={(event) =>
                    setCategory(event.target.value)
                  }
                >
                  {categories.map((item) => (
                    <option key={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span>Leverancier</span>

                <select
                  value={supplier}
                  onChange={(event) =>
                    setSupplier(event.target.value)
                  }
                >
                  {suppliers.map((item) => (
                    <option key={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span>Status</span>

                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(
                      event.target
                        .value as ProductStatus,
                    )
                  }
                >
                  <option>Concept</option>
                  <option>Actief</option>
                  <option>Inactief</option>
                </select>
              </label>

              <label className={styles.field}>
                <span>BTW-code verkoop NL</span>

                <select
                  value={vatCode}
                  onChange={(event) =>
                    setVatCode(
                      event.target.value as VatCode,
                    )
                  }
                >
                  {articleVatCodes.map((item) => (
                    <option
                      key={item.code}
                      value={item.code}
                    >
                      {item.code} · {item.description}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span>Merk</span>

                <input
                  type="text"
                  value={brand}
                  onChange={(event) =>
                    setBrand(event.target.value)
                  }
                />
              </label>

              <label className={styles.field}>
                <span>Land van oorsprong</span>

                <input
                  type="text"
                  value={countryOfOrigin}
                  onChange={(event) =>
                    setCountryOfOrigin(
                      event.target.value,
                    )
                  }
                />
              </label>

              <label
                className={`${styles.field} ${styles.fullWidth}`}
              >
                <span>Materiaal</span>

                <input
                  type="text"
                  value={material}
                  onChange={(event) =>
                    setMaterial(event.target.value)
                  }
                />
              </label>

              <label
                className={`${styles.field} ${styles.fullWidth}`}
              >
                <span>Omschrijving</span>

                <textarea
                  value={description}
                  onChange={(event) =>
                    setDescription(
                      event.target.value,
                    )
                  }
                  rows={4}
                />
              </label>
            </div>
          </article>

          <article className="content-card">
            <div className="content-card-header">
              <div>
                <h2 className="content-card-title">Pricing Engine</h2>
                <p className="content-card-description">Pas een markup of prijs aan; het gekoppelde veld rekent direct mee.</p>
              </div>
              <button type="button" className="button button-secondary" onClick={applyCompanyPricingTargets}>Bedrijfstargets toepassen</button>
            </div>

            <div className={styles.pricingSections}>
              <section className={styles.pricingBlock}>
                <div className={styles.pricingBlockHeader}><span>Kostprijs</span><strong>{new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(pricing.totalCost)}</strong></div>
                <div className={styles.pricingGrid}>
                  <label className={styles.field}><span>Inkoopprijs leverancier</span><div className={styles.currencyInput}><span>€</span><input type="text" value={purchasePrice} onChange={(event) => updateCosts("purchase", event.target.value)} /></div></label>
                  <label className={styles.field}><span>Verzendkosten</span><div className={styles.currencyInput}><span>€</span><input type="text" value={shippingCosts} onChange={(event) => updateCosts("shipping", event.target.value)} /></div></label>
                  <label className={styles.field}><span>Overige kosten</span><div className={styles.currencyInput}><span>€</span><input type="text" value={otherCosts} onChange={(event) => updateCosts("other", event.target.value)} /></div></label>
                  <div className={styles.calculatedField}><span>Totale kostprijs</span><strong>{new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(pricing.totalCost)}</strong></div>
                </div>
              </section>

              <section className={styles.pricingBlock}>
                <div className={styles.pricingBlockHeader}><span>Verkoop aan winkels</span><strong>excl. btw</strong></div>
                <div className={styles.pricingGrid}>
                  <label className={styles.field}><span>Markup merk</span><div className={styles.markupInput}><input type="text" value={brandMarkup} onChange={(event) => updateFromBrandMarkup(event.target.value)} /><span>×</span></div></label>
                  <label className={styles.field}><span>Verkoopprijs</span><div className={styles.currencyInput}><span>€</span><input type="text" value={salesPrice} onChange={(event) => updateFromSalesPrice(event.target.value)} /></div></label>
                  <div className={styles.calculatedField}><span>Marge</span><strong>{new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(pricing.ownMarginAmount)}</strong></div>
                  <div className={styles.calculatedField}><span>Margepercentage</span><strong>{pricing.ownMarginPercentage.toLocaleString("nl-NL")}%</strong></div>
                </div>
              </section>

              <section className={styles.pricingBlock}>
                <div className={styles.pricingBlockHeader}><span>Adviesverkoopprijs</span><strong>incl. {pricing.vatPercentage}% btw</strong></div>
                <div className={styles.pricingGrid}>
                  <label className={styles.field}><span>Markup retailer</span><div className={styles.markupInput}><input type="text" value={retailerMarkup} onChange={(event) => updateFromRetailerMarkup(event.target.value)} /><span>×</span></div></label>
                  <label className={styles.field}><span>Adviesverkoopprijs</span><div className={styles.currencyInput}><span>€</span><input type="text" value={recommendedRetailPrice} onChange={(event) => updateFromRetailPrice(event.target.value)} /></div></label>
                  <div className={styles.calculatedField}><span>Retailermarge excl. btw</span><strong>{new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(pricing.retailerMarginAmount)}</strong></div>
                  <div className={styles.calculatedField}><span>Retailermargepercentage</span><strong>{pricing.retailerMarginPercentage.toLocaleString("nl-NL")}%</strong></div>
                </div>
              </section>
            </div>
          </article>

          <article className="content-card">
            <div className="content-card-header">
              <div>
                <h2 className="content-card-title">
                  Kleuren
                </h2>

                <p className="content-card-description">
                  Beheer kleuren via Instellingen → Stamgegevens.
                </p>
              </div>
            </div>

            <div className={styles.optionGrid}>
              {colorOptions.map((color) => (
                <label
                  key={color.id}
                  className={`${styles.optionCard} ${
                    selectedColors.includes(
                      color.name,
                    )
                      ? styles.optionCardSelected
                      : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedColors.includes(
                      color.name,
                    )}
                    onChange={() =>
                      toggleColor(color.name)
                    }
                  />

                  <span>{color.name}</span>
                </label>
              ))}
            </div>
          </article>

          <article className="content-card">
            <div className="content-card-header">
              <div>
                <h2 className="content-card-title">
                  Maten
                </h2>

                <p className="content-card-description">
                  Beheer maten via Instellingen → Stamgegevens.
                </p>
              </div>
            </div>

            <div className={styles.optionGrid}>
              {sizeOptions.map((size) => (
                <label
                  key={size.id}
                  className={`${styles.optionCard} ${
                    selectedSizes.includes(
                      size.name,
                    )
                      ? styles.optionCardSelected
                      : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedSizes.includes(
                      size.name,
                    )}
                    onChange={() =>
                      toggleSize(size.name)
                    }
                  />

                  <span>{size.name}</span>
                </label>
              ))}
            </div>
          </article>

          <article className="content-card">
            <div className="content-card-header">
              <div>
                <h2 className="content-card-title">
                  Varianten en beginvoorraad
                </h2>

                <p className="content-card-description">
                  Alle maat-kleurcombinaties worden automatisch gegenereerd.
                </p>
              </div>
            </div>

            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Kleur</th>
                    <th>Maat</th>
                    <th className="table-number">
                      Beginvoorraad
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {variantRows.map((variant) => (
                    <tr key={variant.key}>
                      <td className="table-primary">
                        {variant.color}
                      </td>

                      <td>{variant.size}</td>

                      <td className="table-number">
                        <input
                          className={
                            styles.stockInput
                          }
                          type="number"
                          min="0"
                          value={
                            stockByVariant[
                              variant.key
                            ] ?? 0
                          }
                          onChange={(event) =>
                            changeVariantStock(
                              variant.key,
                              event.target.value,
                            )
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </div>

        <aside className={styles.sideColumn}>
          <article className="content-card">
            <div className="content-card-header">
              <div>
                <h2 className="content-card-title">
                  Samenvatting
                </h2>
              </div>
            </div>

            <dl className={styles.summaryList}>
              <div>
                <dt>Artikel</dt>
                <dd>{name || "—"}</dd>
              </div>
              <div>
                <dt>Collectie</dt>
                <dd>{collection || "—"}</dd>
              </div>
              <div>
                <dt>Kleuren</dt>
                <dd>{selectedColors.length}</dd>
              </div>
              <div>
                <dt>Maten</dt>
                <dd>{selectedSizes.length}</dd>
              </div>
              <div>
                <dt>Varianten</dt>
                <dd>{variantRows.length}</dd>
              </div>
            </dl>
          </article>
        </aside>
      </section>

      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}

      <div className={styles.formActions}>
        <Link
          href={
            initialProduct
              ? `/artikelen/${initialProduct.id}`
              : "/artikelen"
          }
          className="button button-secondary"
        >
          Annuleren
        </Link>

        <button
          className="button button-primary"
          type="submit"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
