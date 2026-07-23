"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { getStoredProducts } from "@/lib/articles";
import {
  getCustomers,
  type Customer,
} from "@/lib/master-data";
import { resolveSalesPrice } from "@/lib/price-lists";
import {
  createSalesOrder,
  type SalesOrderStatus,
} from "@/lib/sales";
import styles from "./new-sales-order.module.css";

type SelectableVariant = {
  productId: string;
  productCode: string;
  productName: string;
  variantId: string;
  sku: string;
  color: string;
  size: string;
  availableStock: number;
  unitPrice: number;
  recommendedRetailPrice: number;
};

export default function NewSalesOrderPage() {
  const router = useRouter();

  const [customers, setCustomers] = useState<
    Customer[]
  >([]);
  const [customerId, setCustomerId] =
    useState("");
  const [requestedDeliveryDate, setRequestedDeliveryDate] =
    useState("");
  const [status, setStatus] =
    useState<SalesOrderStatus>("Concept");
  const [notes, setNotes] = useState("");

  const [variants, setVariants] = useState<
    SelectableVariant[]
  >([]);
  const [quantities, setQuantities] = useState<
    Record<string, number>
  >({});
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const customerValues = getCustomers().filter(
      (customer) =>
        customer.status === "Actief",
    );

    setCustomers(customerValues);
    setCustomerId(customerValues[0]?.id ?? "");

    const products = getStoredProducts();

    setVariants(
      products.flatMap((product) =>
        product.variants.map((variant) => ({
          productId: product.id,
          productCode: product.code,
          productName: product.name,
          variantId: variant.id,
          sku: variant.sku,
          color: variant.color,
          size: variant.size,
          availableStock:
            variant.physicalStock -
            variant.reservedStock,
          unitPrice: variant.wholesalePrice,
          recommendedRetailPrice:
            variant.recommendedRetailPrice ||
            product.recommendedRetailPrice ||
            0,
        })),
      ),
    );
  }, []);

  const customer = customers.find(
    (item) => item.id === customerId,
  );

  const filteredVariants = useMemo(() => {
    const query = search.trim().toLowerCase();

    return variants.filter(
      (variant) =>
        !query ||
        variant.productName
          .toLowerCase()
          .includes(query) ||
        variant.productCode
          .toLowerCase()
          .includes(query) ||
        variant.sku
          .toLowerCase()
          .includes(query) ||
        variant.color
          .toLowerCase()
          .includes(query),
    );
  }, [variants, search]);

  const selectedLines = variants
    .filter(
      (variant) =>
        (quantities[variant.variantId] ?? 0) > 0,
    )
    .map((variant) => {
      const quantity = quantities[variant.variantId] ?? 0;
      const resolvedPrice = resolveSalesPrice({
        basePrice: variant.unitPrice,
        customerId: customer?.id || "",
        priceListId: customer?.priceListId || "price-list-standard",
        productId: variant.productId,
        variantId: variant.variantId,
        quantity,
      });

      return {
        ...variant,
        quantity,
        unitPrice: resolvedPrice.unitPrice,
        priceSource: resolvedPrice.sourceLabel,
      };
    });

  const totalQuantity = selectedLines.reduce(
    (total, line) =>
      total + line.quantity,
    0,
  );

  const subtotalBeforeDiscount =
    selectedLines.reduce(
      (total, line) =>
        total + line.quantity * line.unitPrice,
      0,
    );

  const discountPercentage =
    customer?.discountPercentage ?? 0;

  const discountAmount =
    subtotalBeforeDiscount *
    (discountPercentage / 100);

  const subtotal =
    subtotalBeforeDiscount - discountAmount;

  function setQuantity(
    variantId: string,
    value: string,
  ) {
    const parsed = Math.max(
      0,
      Number.parseInt(value || "0", 10) || 0,
    );

    setQuantities((current) => ({
      ...current,
      [variantId]: parsed,
    }));
  }

  function handleSave() {
    setError("");

    if (!customer) {
      setError("Selecteer een klant.");
      return;
    }

    if (selectedLines.length === 0) {
      setError(
        "Vul bij minimaal één variant een aantal in.",
      );
      return;
    }



    try {
      const order = createSalesOrder({
        customerId: customer.id,
        customerNumber:
          customer.customerNumber,
        customerName: customer.companyName,
        contactPerson:
          customer.contactPerson,
        email: customer.email,
        city: customer.city,
        requestedDeliveryDate,
        status,
        paymentDays: customer.paymentDays,
        paymentDiscountPercentage: customer.paymentDiscountPercentage,
        paymentDiscountDays: customer.paymentDiscountDays,
        discountPercentage:
          customer.discountPercentage,
        notes,
        lines: selectedLines.map((line) => ({
          productId: line.productId,
          productCode: line.productCode,
          productName: line.productName,
          variantId: line.variantId,
          sku: line.sku,
          color: line.color,
          size: line.size,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          recommendedRetailPrice:
            line.recommendedRetailPrice,
          discountPercentage:
            customer.discountPercentage,
        })),
      });

      router.push(`/verkoop/${order.id}`);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "De verkooporder kon niet worden opgeslagen.",
      );
    }
  }

  return (
    <div>
      <div className={styles.breadcrumb}>
        <Link href="/verkoop">
          Verkooporders
        </Link>
        <span>›</span>
        <span>Nieuwe verkooporder</span>
      </div>

      <PageHeader
        eyebrow="Verkoop"
        title="Nieuwe verkooporder"
        description="Selecteer een klant en voer aantallen per maat- en kleurvariant in."
      />

      <section className={styles.layout}>
        <div className={styles.mainColumn}>
          <article className="content-card">
            <div className="content-card-header">
              <div>
                <h2 className="content-card-title">
                  Ordergegevens
                </h2>
              </div>
            </div>

            <div className={styles.formGrid}>
              <label>
                <span>Klant</span>

                <select
                  value={customerId}
                  onChange={(event) =>
                    setCustomerId(
                      event.target.value,
                    )
                  }
                >
                  {customers.map((item) => (
                    <option
                      key={item.id}
                      value={item.id}
                    >
                      {item.companyName}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Gewenste leverdatum</span>

                <input
                  type="date"
                  value={requestedDeliveryDate}
                  onChange={(event) =>
                    setRequestedDeliveryDate(
                      event.target.value,
                    )
                  }
                />
              </label>

              <label>
                <span>Status</span>

                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(
                      event.target
                        .value as SalesOrderStatus,
                    )
                  }
                >
                  <option>Concept</option>
                  <option>Bevestigd</option>
                </select>
              </label>

              <label>
                <span>Betaaltermijn</span>

                <input
                  value={
                    customer
                      ? `${customer.paymentDays} dagen netto`
                      : ""
                  }
                  disabled
                />
              </label>

              <label>
                <span>Betalingskorting</span>
                <input
                  value={
                    customer && customer.paymentDiscountPercentage > 0 && customer.paymentDiscountDays > 0
                      ? `${customer.paymentDiscountPercentage}% binnen ${customer.paymentDiscountDays} dagen`
                      : "Geen"
                  }
                  disabled
                />
              </label>

              <label className={styles.fullWidth}>
                <span>Interne notitie</span>

                <textarea
                  rows={3}
                  value={notes}
                  onChange={(event) =>
                    setNotes(event.target.value)
                  }
                />
              </label>
            </div>
          </article>

          <article className="content-card">
            <div className="content-card-toolbar">
              <div className="table-search">
                <span>⌕</span>

                <input
                  type="search"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Zoek op artikel, code, SKU of kleur..."
                />
              </div>
            </div>

            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Artikel</th>
                    <th>SKU</th>
                    <th>Kleur</th>
                    <th>Maat</th>
                    <th className="table-number">
                      Beschikbaar
                    </th>
                    <th className="table-number">
                      Prijs
                    </th>
                    <th className="table-number">
                      Aantal
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredVariants.map(
                    (variant) => (
                      <tr key={variant.variantId}>
                        <td className="table-primary">
                          {variant.productName}
                        </td>

                        <td>{variant.sku}</td>
                        <td>{variant.color}</td>
                        <td>{variant.size}</td>

                        <td
                          className={`table-number ${
                            variant.availableStock <= 5
                              ? "stock-warning"
                              : ""
                          }`}
                        >
                          {variant.availableStock}
                        </td>

                        <td className="table-number">
                          {(() => {
                            const resolved = resolveSalesPrice({
                              basePrice: variant.unitPrice,
                              customerId: customer?.id || "",
                              priceListId: customer?.priceListId || "price-list-standard",
                              productId: variant.productId,
                              variantId: variant.variantId,
                              quantity: quantities[variant.variantId] ?? 1,
                            });

                            return (
                              <>
                                <strong>
                                  € {resolved.unitPrice.toLocaleString("nl-NL", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </strong>
                                <div className={styles.priceSource}>{resolved.sourceLabel}</div>
                              </>
                            );
                          })()}
                        </td>

                        <td className="table-number">
                          <input
                            className={
                              styles.quantityInput
                            }
                            type="number"
                            min="0"
                            value={
                              quantities[
                                variant.variantId
                              ] ?? 0
                            }
                            onChange={(event) =>
                              setQuantity(
                                variant.variantId,
                                event.target.value,
                              )
                            }
                          />
                        </td>
                      </tr>
                    ),
                  )}
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
                  Ordersamenvatting
                </h2>
              </div>
            </div>

            <dl className={styles.summaryList}>
              <div>
                <dt>Klant</dt>
                <dd>
                  {customer?.companyName ?? "—"}
                </dd>
              </div>

              <div>
                <dt>Orderregels</dt>
                <dd>{selectedLines.length}</dd>
              </div>

              <div>
                <dt>Aantal stuks</dt>
                <dd>{totalQuantity}</dd>
              </div>

              <div>
                <dt>Subtotaal</dt>
                <dd>
                  €{" "}
                  {subtotalBeforeDiscount.toLocaleString(
                    "nl-NL",
                    {
                      minimumFractionDigits: 2,
                    },
                  )}
                </dd>
              </div>

              <div>
                <dt>Korting</dt>
                <dd>
                  {discountPercentage.toLocaleString(
                    "nl-NL",
                  )}
                  %
                </dd>
              </div>

              <div>
                <dt>Na korting</dt>
                <dd>
                  €{" "}
                  {subtotal.toLocaleString(
                    "nl-NL",
                    {
                      minimumFractionDigits: 2,
                    },
                  )}
                </dd>
              </div>
            </dl>
          </article>
        </aside>
      </section>

      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}

      <div className={styles.actions}>
        <Link
          href="/verkoop"
          className="button button-secondary"
        >
          Annuleren
        </Link>

        <button
          className="button button-primary"
          type="button"
          onClick={handleSave}
        >
          Verkooporder opslaan
        </button>
      </div>
    </div>
  );
}
