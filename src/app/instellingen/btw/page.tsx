"use client";

import { PageHeader } from "@/components/ui/page-header";
import {
  vatCodes,
} from "@/lib/vat-engine";
import styles from "./vat-settings.module.css";

export default function VatSettingsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Bedrijfsinstellingen"
        title="BTW-codes"
        description="De BTW-codes die STITCH gebruikt bij artikelen, klanten, facturen en Exact-export."
      />

      <section className="content-card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Omschrijving</th>
                <th className="table-number">
                  Percentage
                </th>
                <th>Type</th>
                <th>Soort transactie</th>
              </tr>
            </thead>
            <tbody>
              {vatCodes.map((item) => (
                <tr key={item.code}>
                  <td className="table-primary">
                    {item.code}
                  </td>
                  <td>{item.description}</td>
                  <td className="table-number">
                    {item.percentage.toLocaleString(
                      "nl-NL",
                      {
                        minimumFractionDigits: 2,
                      },
                    )}
                  </td>
                  <td>{item.priceType}</td>
                  <td>{item.transactionType}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={styles.explanation}>
          <strong>Automatische verkooplogica</strong>
          <p>
            Nederland gebruikt de BTW-code van het
            artikel. Zakelijke EU-goederen gaan naar
            0VG, EU-diensten naar 0VD en leveringen
            buiten de EU naar 0VX.
          </p>
        </div>
      </section>
    </div>
  );
}
