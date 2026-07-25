"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";
import { useParams } from "next/navigation";
import {
  loadSalesOrderById,
  type SalesOrder,
} from "@/lib/sales";
import styles from "./packing-slip.module.css";

function formatDate(value: string) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("nl-NL").format(
    new Date(`${value}T12:00:00`),
  );
}

export default function PackingSlipPage() {
  const params = useParams<{ id: string }>();

  const [order, setOrder] =
    useState<SalesOrder | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void loadSalesOrderById(params.id).then(setOrder).finally(() => setLoaded(true));
  }, [params.id]);

  if (!loaded) {
    return <div>Pakbon laden...</div>;
  }

  if (!order) {
    return (
      <div>
        <h1>Verkooporder niet gevonden</h1>
        <Link href="/verkoop">
          Terug naar verkoop
        </Link>
      </div>
    );
  }

  const packingSlipNumber = order.orderNumber.replace(
    /^V/,
    "P",
  );

  return (
    <div className={styles.page}>
      <div className={styles.screenActions}>
        <Link
          href={`/verkoop/${order.id}`}
          className="button button-secondary"
        >
          Terug naar order
        </Link>

        <button
          className="button button-primary"
          type="button"
          onClick={() => window.print()}
        >
          Pakbon printen
        </button>
      </div>

      <article className={styles.document}>
        <header className={styles.header}>
          <div>
            <div className={styles.logo}>
              Fashion ERP
            </div>

            <p>
              Demo Fashion B.V.
              <br />
              Amsterdam
              <br />
              Nederland
            </p>
          </div>

          <div className={styles.documentTitle}>
            <h1>Pakbon</h1>
            <strong>{packingSlipNumber}</strong>
          </div>
        </header>

        <section className={styles.addressGrid}>
          <div>
            <h2>Afleveren aan</h2>
            <p>
              <strong>{order.customerName}</strong>
              <br />
              {order.contactPerson}
              <br />
              {order.city}
            </p>
          </div>

          <dl>
            <div>
              <dt>Ordernummer</dt>
              <dd>{order.orderNumber}</dd>
            </div>

            <div>
              <dt>Orderdatum</dt>
              <dd>{formatDate(order.orderDate)}</dd>
            </div>

            <div>
              <dt>Leverdatum</dt>
              <dd>
                {formatDate(
                  order.requestedDeliveryDate,
                )}
              </dd>
            </div>
          </dl>
        </section>

        <table className={styles.table}>
          <thead>
            <tr>
              <th>Artikel</th>
              <th>SKU</th>
              <th>Kleur</th>
              <th>Maat</th>
              <th>Aantal</th>
            </tr>
          </thead>

          <tbody>
            {order.lines.map((line) => (
              <tr key={line.id}>
                <td>
                  <strong>
                    {line.productName}
                  </strong>
                  <br />
                  <span>{line.productCode}</span>
                </td>

                <td>{line.sku}</td>
                <td>{line.color}</td>
                <td>{line.size}</td>
                <td>{line.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <footer className={styles.footer}>
          <p>
            Controleer de levering bij ontvangst.
            Neem bij afwijkingen contact op met onze
            klantenservice.
          </p>

          <p>
            {order.notes
              ? `Notitie: ${order.notes}`
              : ""}
          </p>
        </footer>
      </article>
    </div>
  );
}
