"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { PageHeader } from "@/components/ui/page-header";
import { getStoredProducts } from "@/lib/articles";
import {
  createChannelPrice,
  deleteChannelPrice,
  getChannelPrices,
  type ChannelPrice,
} from "@/lib/pricing-professional";
import styles from "./channel-prices.module.css";

export default function ChannelPricesPage() {
  const products = useMemo(
    () => getStoredProducts(),
    [],
  );
  const [items, setItems] = useState<
    ChannelPrice[]
  >([]);
  const [productId, setProductId] =
    useState("");
  const [channel, setChannel] =
    useState("Webshop");
  const [country, setCountry] =
    useState("Nederland");
  const [currency, setCurrency] =
    useState("EUR");
  const [exchangeRate, setExchangeRate] =
    useState("1");
  const [adjustment, setAdjustment] =
    useState("0");
  const [fixedPrice, setFixedPrice] =
    useState("0");
  const [validFrom, setValidFrom] =
    useState("");
  const [validUntil, setValidUntil] =
    useState("");

  function reload() {
    setItems(getChannelPrices());
  }

  useEffect(reload, []);

  function create() {
    if (!productId || !channel.trim()) return;

    createChannelPrice({
      productId,
      channel: channel.trim(),
      country: country.trim(),
      currency: currency.trim().toUpperCase(),
      exchangeRate:
        Number(exchangeRate.replace(",", ".")) ||
        1,
      adjustmentPercentage:
        Number(adjustment.replace(",", ".")) ||
        0,
      fixedPrice:
        Number(fixedPrice.replace(",", ".")) || 0,
      validFrom,
      validUntil,
      isActive: true,
    });

    reload();
  }

  return (
    <div>
      <PageHeader
        eyebrow="Pricing Engine"
        title="Kanaal- en landenprijzen"
        description="Beheer afwijkende prijzen voor webshop, marketplaces en landen."
      />

      <section className="content-card">
        <div className={styles.form}>
          <select
            value={productId}
            onChange={(event) =>
              setProductId(event.target.value)
            }
          >
            <option value="">
              Selecteer artikel
            </option>
            {products.map((product) => (
              <option
                key={product.id}
                value={product.id}
              >
                {product.code} · {product.name}
              </option>
            ))}
          </select>

          <input
            value={channel}
            onChange={(event) =>
              setChannel(event.target.value)
            }
            placeholder="Kanaal"
          />
          <input
            value={country}
            onChange={(event) =>
              setCountry(event.target.value)
            }
            placeholder="Land"
          />
          <input
            value={currency}
            onChange={(event) =>
              setCurrency(event.target.value)
            }
            placeholder="Valuta"
          />
          <input
            type="number"
            step="0.0001"
            value={exchangeRate}
            onChange={(event) =>
              setExchangeRate(event.target.value)
            }
            placeholder="Wisselkoers"
          />
          <input
            type="number"
            step="0.1"
            value={adjustment}
            onChange={(event) =>
              setAdjustment(event.target.value)
            }
            placeholder="Aanpassing %"
          />
          <input
            type="number"
            step="0.01"
            value={fixedPrice}
            onChange={(event) =>
              setFixedPrice(event.target.value)
            }
            placeholder="Vaste prijs"
          />
          <input
            type="date"
            value={validFrom}
            onChange={(event) =>
              setValidFrom(event.target.value)
            }
          />
          <input
            type="date"
            value={validUntil}
            onChange={(event) =>
              setValidUntil(event.target.value)
            }
          />

          <button
            type="button"
            className="button button-primary"
            onClick={create}
          >
            Kanaalprijs toevoegen
          </button>
        </div>
      </section>

      <section className="content-card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Artikel</th>
                <th>Kanaal</th>
                <th>Land</th>
                <th>Valuta</th>
                <th>Koers</th>
                <th>Aanpassing</th>
                <th>Vaste prijs</th>
                <th>Geldigheid</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const product = products.find(
                  (entry) =>
                    entry.id === item.productId,
                );
                return (
                  <tr key={item.id}>
                    <td className="table-primary">
                      {product
                        ? `${product.code} · ${product.name}`
                        : "Onbekend"}
                    </td>
                    <td>{item.channel}</td>
                    <td>{item.country || "—"}</td>
                    <td>{item.currency}</td>
                    <td>{item.exchangeRate}</td>
                    <td>
                      {item.adjustmentPercentage}%
                    </td>
                    <td>
                      {item.fixedPrice > 0
                        ? item.fixedPrice.toFixed(2)
                        : "—"}
                    </td>
                    <td>
                      {item.validFrom || "direct"} –{" "}
                      {item.validUntil || "onbeperkt"}
                    </td>
                    <td>
                      <button
                        type="button"
                        className={
                          styles.deleteButton
                        }
                        onClick={() => {
                          deleteChannelPrice(item.id);
                          reload();
                        }}
                      >
                        Verwijderen
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
