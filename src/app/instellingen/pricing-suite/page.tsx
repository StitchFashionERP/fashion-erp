"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { PageHeader } from "@/components/ui/page-header";
import { getStoredProducts } from "@/lib/articles";
import {
  applyBulkPricing,
  createPricingScenario,
  deletePricingScenario,
  exportProfessionalPricingCsv,
  getPricingAdvice,
  getPricingScenarios,
  type PricingScenario,
} from "@/lib/pricing-professional";
import styles from "./pricing-suite.module.css";

function money(value: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export default function PricingSuitePage() {
  const [products, setProducts] = useState(
    getStoredProducts(),
  );
  const [selectedIds, setSelectedIds] = useState<
    string[]
  >([]);
  const [costChange, setCostChange] = useState("0");
  const [brandMarkup, setBrandMarkup] =
    useState("");
  const [retailerMarkup, setRetailerMarkup] =
    useState("");
  const [salesChange, setSalesChange] =
    useState("0");
  const [retailChange, setRetailChange] =
    useState("0");
  const [rounding, setRounding] =
    useState(true);
  const [message, setMessage] = useState("");
  const [scenarios, setScenarios] = useState<
    PricingScenario[]
  >([]);
  const [scenarioName, setScenarioName] =
    useState("");
  const advice = useMemo(() => getPricingAdvice(), [
    products,
  ]);

  useEffect(() => {
    setScenarios(getPricingScenarios());
  }, []);

  function toggle(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function applyBulk() {
    if (!selectedIds.length) return;

    const result = applyBulkPricing({
      productIds: selectedIds,
      costChangePercentage:
        Number(costChange.replace(",", ".")) || 0,
      brandMarkup: brandMarkup
        ? Number(brandMarkup.replace(",", "."))
        : undefined,
      retailerMarkup: retailerMarkup
        ? Number(retailerMarkup.replace(",", "."))
        : undefined,
      salesPriceChangePercentage:
        Number(salesChange.replace(",", ".")) ||
        0,
      retailPriceChangePercentage:
        Number(retailChange.replace(",", ".")) ||
        0,
      applyCommercialRounding: rounding,
      changedBy: "Daan",
    });

    setProducts(result.products);
    setMessage(
      `${result.updatedCount} artikelen bijgewerkt.`,
    );
  }

  function saveScenario() {
    if (!scenarioName.trim()) return;

    createPricingScenario({
      name: scenarioName.trim(),
      description: `Kosten ${costChange}% · verkoop ${salesChange}% · advies ${retailChange}%`,
      costChangePercentage:
        Number(costChange.replace(",", ".")) || 0,
      brandMarkup:
        Number(brandMarkup.replace(",", ".")) ||
        0,
      retailerMarkup:
        Number(
          retailerMarkup.replace(",", "."),
        ) || 0,
      rounding: rounding ? "0.95" : "none",
      createdBy: "Daan",
    });

    setScenarioName("");
    setScenarios(getPricingScenarios());
  }

  return (
    <div>
      <PageHeader
        eyebrow="Pricing Engine"
        title="Professional Pricing Suite"
        description="Bulk wijzigen, scenario's bewaren, prijsadvies bekijken en exporteren."
        action={
          <button
            type="button"
            className="button button-secondary"
            onClick={exportProfessionalPricingCsv}
          >
            Exporteer CSV
          </button>
        }
      />

      {message && (
        <div className={styles.message}>
          {message}
        </div>
      )}

      <section className={styles.workspace}>
        <article className="content-card">
          <div className="content-card-header">
            <div>
              <h2 className="content-card-title">
                Bulk prijswijziging
              </h2>
              <p className="content-card-description">
                Selecteer artikelen en pas prijzen
                centraal aan.
              </p>
            </div>
          </div>

          <div className={styles.controls}>
            <label>
              <span>Kostprijs wijziging %</span>
              <input
                type="number"
                step="0.1"
                value={costChange}
                onChange={(event) =>
                  setCostChange(event.target.value)
                }
              />
            </label>

            <label>
              <span>Merk-markup</span>
              <input
                type="number"
                step="0.01"
                placeholder="Ongewijzigd"
                value={brandMarkup}
                onChange={(event) =>
                  setBrandMarkup(event.target.value)
                }
              />
            </label>

            <label>
              <span>Retailer-markup</span>
              <input
                type="number"
                step="0.01"
                placeholder="Ongewijzigd"
                value={retailerMarkup}
                onChange={(event) =>
                  setRetailerMarkup(
                    event.target.value,
                  )
                }
              />
            </label>

            <label>
              <span>Verkoopprijs wijziging %</span>
              <input
                type="number"
                step="0.1"
                value={salesChange}
                onChange={(event) =>
                  setSalesChange(event.target.value)
                }
              />
            </label>

            <label>
              <span>Adviesprijs wijziging %</span>
              <input
                type="number"
                step="0.1"
                value={retailChange}
                onChange={(event) =>
                  setRetailChange(event.target.value)
                }
              />
            </label>

            <label className={styles.check}>
              <input
                type="checkbox"
                checked={rounding}
                onChange={(event) =>
                  setRounding(event.target.checked)
                }
              />
              Commercieel afronden
            </label>
          </div>

          <div className={styles.bulkActions}>
            <span>
              {selectedIds.length} geselecteerd
            </span>
            <button
              type="button"
              className="button button-primary"
              onClick={applyBulk}
              disabled={!selectedIds.length}
            >
              Wijzigingen toepassen
            </button>
          </div>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th />
                  <th>Artikel</th>
                  <th>Collectie</th>
                  <th className="table-number">
                    Kostprijs
                  </th>
                  <th className="table-number">
                    Verkoopprijs
                  </th>
                  <th className="table-number">
                    Adviesprijs
                  </th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(
                          product.id,
                        )}
                        onChange={() =>
                          toggle(product.id)
                        }
                      />
                    </td>
                    <td className="table-primary">
                      {product.code} · {product.name}
                    </td>
                    <td>{product.collection}</td>
                    <td className="table-number">
                      {money(product.totalCost)}
                    </td>
                    <td className="table-number">
                      {money(product.wholesalePrice)}
                    </td>
                    <td className="table-number">
                      {money(
                        product.recommendedRetailPrice,
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <aside className={styles.side}>
          <article className="content-card">
            <div className="content-card-header">
              <h2 className="content-card-title">
                Scenario bewaren
              </h2>
            </div>

            <div className={styles.scenarioForm}>
              <input
                value={scenarioName}
                onChange={(event) =>
                  setScenarioName(event.target.value)
                }
                placeholder="Bijv. SS28 kostprijs +7%"
              />
              <button
                type="button"
                className="button button-secondary"
                onClick={saveScenario}
              >
                Scenario opslaan
              </button>
            </div>

            <div className={styles.scenarioList}>
              {scenarios.map((scenario) => (
                <div key={scenario.id}>
                  <span>
                    <strong>{scenario.name}</strong>
                    <small>
                      {scenario.description}
                    </small>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      deletePricingScenario(
                        scenario.id,
                      );
                      setScenarios(
                        getPricingScenarios(),
                      );
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </article>

          <article className="content-card">
            <div className="content-card-header">
              <h2 className="content-card-title">
                Pricing Advisor
              </h2>
            </div>

            <div className={styles.adviceList}>
              {advice.slice(0, 8).map((item) => (
                <div
                  key={item.productId}
                  data-tone={item.severity}
                >
                  <strong>
                    {item.productCode} ·{" "}
                    {item.productName}
                  </strong>
                  <span>{item.headline}</span>
                  <p>{item.detail}</p>
                  <small>
                    Advies:{" "}
                    {money(
                      item.recommendedSalesPrice,
                    )}{" "}
                    /{" "}
                    {money(
                      item.recommendedRetailPrice,
                    )}
                  </small>
                </div>
              ))}
            </div>
          </article>
        </aside>
      </section>
    </div>
  );
}
