"use client";

import Link from "next/link";
import {
  useMemo,
  useState,
} from "react";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { getStoredProducts } from "@/lib/articles";
import {
  calculatePricingScenario,
  exportPricingAnalysisCsv,
  getPricingPortfolioAnalysis,
  getPricingPortfolioSummary,
} from "@/lib/pricing-analysis";
import { getPricingDefaults } from "@/lib/company-settings";
import styles from "./pricing-analysis.module.css";

function money(value: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function number(value: number) {
  return value.toLocaleString("nl-NL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function tone(
  value: "success" | "warning" | "danger" | "neutral",
) {
  return value;
}

export default function PricingAnalysisPage() {
  const defaults = useMemo(
    () => getPricingDefaults(),
    [],
  );
  const products = useMemo(
    () => getStoredProducts(),
    [],
  );
  const rows = useMemo(
    () => getPricingPortfolioAnalysis(),
    [],
  );

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [collection, setCollection] =
    useState("all");
  const [scenarioProductId, setScenarioProductId] =
    useState(products[0]?.id ?? "");
  const [costChange, setCostChange] =
    useState("5");

  const collections = useMemo(
    () =>
      Array.from(
        new Set(
          rows.map((row) => row.collection).filter(Boolean),
        ),
      ).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((row) => {
      if (
        status !== "all" &&
        row.healthTone !== status
      ) {
        return false;
      }

      if (
        collection !== "all" &&
        row.collection !== collection
      ) {
        return false;
      }

      if (!query) return true;

      return [
        row.productCode,
        row.productName,
        row.collection,
        row.category,
        row.supplier,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [rows, search, status, collection]);

  const summary = useMemo(
    () => getPricingPortfolioSummary(filtered),
    [filtered],
  );

  const scenarioProduct = products.find(
    (product) => product.id === scenarioProductId,
  );

  const scenario = scenarioProduct
    ? calculatePricingScenario({
        supplierPurchasePrice:
          scenarioProduct.purchasePrice,
        shippingCosts: scenarioProduct.shippingCosts,
        otherCosts: scenarioProduct.otherCosts,
        brandMarkup:
          scenarioProduct.brandMarkup ||
          defaults.brandMarkup,
        retailerMarkup:
          scenarioProduct.retailerMarkup ||
          defaults.retailerMarkup,
        costChangePercentage:
          Number(costChange.replace(",", ".")) || 0,
      })
    : null;

  return (
    <div>
      <PageHeader
        eyebrow="Pricing Engine"
        title="Prijsanalyse"
        description="Analyseer kostprijzen, markups en marges over de volledige collectie."
        action={
          <button
            type="button"
            className="button button-secondary"
            onClick={() =>
              exportPricingAnalysisCsv(filtered)
            }
          >
            Exporteer CSV
          </button>
        }
      />

      <section className="article-summary-grid">
        <article className="metric-card">
          <div className="metric-label">
            Artikelen
          </div>
          <div className="metric-value">
            {summary.articleCount}
          </div>
          <div className="metric-detail">
            {summary.healthyCount} op target
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-label">
            Gem. merk-markup
          </div>
          <div className="metric-value">
            {number(summary.averageBrandMarkup)}x
          </div>
          <div className="metric-detail">
            target {number(defaults.brandMarkup)}x
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-label">
            Gem. retailer-markup
          </div>
          <div className="metric-value">
            {number(
              summary.averageRetailerMarkup,
            )}x
          </div>
          <div className="metric-detail">
            target {number(defaults.retailerMarkup)}x
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-label">
            Gem. eigen marge
          </div>
          <div className="metric-value">
            {number(
              summary.averageOwnMarginPercentage,
            )}%
          </div>
          <div className="metric-detail">
            per artikel
          </div>
        </article>
      </section>

      <section className={styles.workspace}>
        <article className="content-card">
          <div className="content-card-header">
            <div>
              <h2 className="content-card-title">
                Prijsportfolio
              </h2>
              <p className="content-card-description">
                Filter artikelen en controleer afwijkingen
                van de centrale targets.
              </p>
            </div>
          </div>

          <div className="content-card-toolbar">
            <div className="table-search">
              <span>⌕</span>
              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Zoek artikel, collectie of leverancier..."
              />
            </div>

            <select
              className={styles.select}
              value={status}
              onChange={(event) =>
                setStatus(event.target.value)
              }
            >
              <option value="all">
                Alle prijsstatussen
              </option>
              <option value="success">
                Op target
              </option>
              <option value="warning">
                Aandacht nodig
              </option>
              <option value="danger">
                Kritiek
              </option>
              <option value="neutral">
                Onvolledig
              </option>
            </select>

            <select
              className={styles.select}
              value={collection}
              onChange={(event) =>
                setCollection(event.target.value)
              }
            >
              <option value="all">
                Alle collecties
              </option>
              {collections.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
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
                  <th className="table-number">
                    Merk
                  </th>
                  <th className="table-number">
                    Retailer
                  </th>
                  <th className="table-number">
                    Eigen marge
                  </th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((row) => (
                  <tr key={row.productId}>
                    <td>
                      <Link
                        href={`/artikelen/${row.productId}`}
                        className="table-link"
                      >
                        {row.productCode}
                      </Link>
                      <div className={styles.meta}>
                        {row.productName}
                      </div>
                    </td>
                    <td>{row.collection || "—"}</td>
                    <td className="table-number">
                      {money(row.totalCost)}
                    </td>
                    <td className="table-number">
                      {money(row.salesPrice)}
                    </td>
                    <td className="table-number">
                      {money(
                        row.recommendedRetailPrice,
                      )}
                    </td>
                    <td className="table-number">
                      {number(row.brandMarkup)}x
                    </td>
                    <td className="table-number">
                      {number(row.retailerMarkup)}x
                    </td>
                    <td className="table-number">
                      {number(
                        row.ownMarginPercentage,
                      )}%
                    </td>
                    <td>
                      <StatusBadge
                        label={row.healthLabel}
                        tone={tone(row.healthTone)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <aside className={styles.sideColumn}>
          <article className="content-card">
            <div className="content-card-header">
              <div>
                <h2 className="content-card-title">
                  Portfoliostatus
                </h2>
              </div>
            </div>

            <dl className={styles.statusList}>
              <div>
                <dt>Op target</dt>
                <dd>{summary.healthyCount}</dd>
              </div>
              <div>
                <dt>Aandacht nodig</dt>
                <dd>{summary.warningCount}</dd>
              </div>
              <div>
                <dt>Kritiek</dt>
                <dd>{summary.dangerCount}</dd>
              </div>
              <div>
                <dt>Onvolledig</dt>
                <dd>{summary.incompleteCount}</dd>
              </div>
              <div>
                <dt>Gem. kostprijs</dt>
                <dd>{money(summary.averageCost)}</dd>
              </div>
              <div>
                <dt>Gem. adviesprijs</dt>
                <dd>
                  {money(summary.averageRetailPrice)}
                </dd>
              </div>
            </dl>
          </article>

          <article className="content-card">
            <div className="content-card-header">
              <div>
                <h2 className="content-card-title">
                  Kostprijsscenario
                </h2>
                <p className="content-card-description">
                  Bekijk het effect van een kostenstijging
                  bij behoud van de markups.
                </p>
              </div>
            </div>

            <div className={styles.scenarioForm}>
              <label>
                <span>Artikel</span>
                <select
                  value={scenarioProductId}
                  onChange={(event) =>
                    setScenarioProductId(
                      event.target.value,
                    )
                  }
                >
                  {products.map((product) => (
                    <option
                      key={product.id}
                      value={product.id}
                    >
                      {product.code} · {product.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Kostenmutatie</span>
                <div className={styles.percentInput}>
                  <input
                    type="number"
                    step="0.1"
                    value={costChange}
                    onChange={(event) =>
                      setCostChange(event.target.value)
                    }
                  />
                  <strong>%</strong>
                </div>
              </label>
            </div>

            {scenario && (
              <dl className={styles.scenarioResults}>
                <div>
                  <dt>Nieuwe kostprijs</dt>
                  <dd>
                    {money(scenario.scenario.totalCost)}
                  </dd>
                </div>
                <div>
                  <dt>Nieuwe verkoopprijs</dt>
                  <dd>
                    {money(
                      scenario.scenario.salesPrice,
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Verschil verkoopprijs</dt>
                  <dd>
                    {money(
                      scenario.salesPriceDifference,
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Nieuwe adviesprijs</dt>
                  <dd>
                    {money(
                      scenario.scenario
                        .recommendedRetailPrice,
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Verschil adviesprijs</dt>
                  <dd>
                    {money(
                      scenario.retailPriceDifference,
                    )}
                  </dd>
                </div>
              </dl>
            )}
          </article>
        </aside>
      </section>
    </div>
  );
}
