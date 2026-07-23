"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import { useParams } from "next/navigation";
import type {
  PublicPortalRecord,
} from "@/lib/customer-portal-types";
import styles from "./portal.module.css";

function money(value: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function date(value: string) {
  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

export default function CustomerOrderPortal() {
  const params = useParams<{
    token: string;
  }>();
  const canvasRef =
    useRef<HTMLCanvasElement>(null);

  const [code, setCode] = useState("");
  const [record, setRecord] =
    useState<PublicPortalRecord | null>(
      null,
    );
  const [error, setError] = useState("");
  const [loading, setLoading] =
    useState(false);
  const [drawing, setDrawing] =
    useState(false);
  const [hasSignature, setHasSignature] =
    useState(false);
  const [signerName, setSignerName] =
    useState("");
  const [signerEmail, setSignerEmail] =
    useState("");
  const [accepted, setAccepted] =
    useState(false);
  const [approved, setApproved] =
    useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !record) return;

    const ratio =
      window.devicePixelRatio || 1;
    const rect =
      canvas.getBoundingClientRect();

    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;

    const context =
      canvas.getContext("2d");
    if (!context) return;

    context.scale(ratio, ratio);
    context.lineWidth = 2;
    context.lineCap = "round";
    context.strokeStyle = "#071a35";
  }, [record]);

  async function verify() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/customer-portal/${params.token}/verify`,
        {
          method: "POST",
          headers: {
            "content-type":
              "application/json",
          },
          body: JSON.stringify({ code }),
        },
      );
      const payload =
        await response.json();

      if (!response.ok) {
        throw new Error(payload.error);
      }

      setRecord(payload);
      setSignerName(
        payload.order.contactPerson || "",
      );
      setSignerEmail(
        payload.order.email || "",
      );
      setApproved(
        payload.status === "Goedgekeurd",
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Verifiëren is mislukt.",
      );
    } finally {
      setLoading(false);
    }
  }

  function position(
    event:
      | React.PointerEvent<HTMLCanvasElement>,
  ) {
    const rect =
      event.currentTarget.getBoundingClientRect();

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function startDrawing(
    event: React.PointerEvent<HTMLCanvasElement>,
  ) {
    const context =
      event.currentTarget.getContext("2d");
    if (!context) return;

    const point = position(event);
    context.beginPath();
    context.moveTo(point.x, point.y);
    setDrawing(true);
    event.currentTarget.setPointerCapture(
      event.pointerId,
    );
  }

  function draw(
    event: React.PointerEvent<HTMLCanvasElement>,
  ) {
    if (!drawing) return;
    const context =
      event.currentTarget.getContext("2d");
    if (!context) return;

    const point = position(event);
    context.lineTo(point.x, point.y);
    context.stroke();
    setHasSignature(true);
  }

  function stopDrawing() {
    setDrawing(false);
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    const context =
      canvas?.getContext("2d");

    if (canvas && context) {
      context.clearRect(
        0,
        0,
        canvas.width,
        canvas.height,
      );
    }

    setHasSignature(false);
  }

  async function approve() {
    if (
      !record ||
      !canvasRef.current
    ) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/customer-portal/${params.token}/approve`,
        {
          method: "POST",
          headers: {
            "content-type":
              "application/json",
          },
          body: JSON.stringify({
            code,
            signerName,
            signerEmail,
            accepted,
            signatureDataUrl:
              canvasRef.current.toDataURL(
                "image/png",
              ),
          }),
        },
      );
      const payload =
        await response.json();

      if (!response.ok) {
        throw new Error(payload.error);
      }

      setApproved(true);
      setRecord({
        ...record,
        status: "Goedgekeurd",
        approval: payload.approval,
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Goedkeuren is mislukt.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (!record) {
    return (
      <main className={styles.portal}>
        <section className={styles.loginCard}>
          <div className={styles.brand}>
            <strong>
              Veilig orderportaal
            </strong>
            <span>
              STITCH Fashion ERP
            </span>
          </div>

          <h1>Order bekijken</h1>
          <p>
            Vul de verificatiecode uit de
            e-mail in. De link en code worden
            bewust apart gebruikt.
          </p>

          <label>
            <span>Verificatiecode</span>
            <input
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(event) =>
                setCode(
                  event.target.value.replace(
                    /\D/g,
                    "",
                  ),
                )
              }
              placeholder="000000"
              onKeyDown={(event) => {
                if (
                  event.key === "Enter"
                ) {
                  verify();
                }
              }}
            />
          </label>

          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={verify}
            disabled={
              loading || code.length !== 6
            }
          >
            {loading
              ? "Controleren..."
              : "Order openen"}
          </button>

          <small>
            Controleer altijd of het webadres
            van het vertrouwde STITCH-portaal
            is.
          </small>
        </section>
      </main>
    );
  }

  const order = record.order;
  const companyName =
    record.company.tradeName ||
    record.company.name;

  return (
    <main className={styles.portal}>
      <header className={styles.header}>
        <div className={styles.company}>
          {record.company.logoDataUrl && (
            <img
              src={record.company.logoDataUrl}
              alt={companyName}
            />
          )}
          <div>
            <strong>{companyName}</strong>
            <span>
              Orderbevestiging
            </span>
          </div>
        </div>

        <div className={styles.status}>
          {approved
            ? "Goedgekeurd"
            : "Wacht op akkoord"}
        </div>
      </header>

      <div className={styles.actions}>
        <a
          href={`/api/customer-portal/${params.token}/pdf?code=${code}`}
          target="_blank"
          rel="noreferrer"
        >
          PDF openen
        </a>
        <button
          type="button"
          onClick={() => window.print()}
        >
          Printen
        </button>
      </div>

      <section className={styles.orderCard}>
        <div className={styles.orderHeading}>
          <div>
            <span>Ordernummer</span>
            <strong>
              {order.orderNumber}
            </strong>
          </div>
          <div>
            <span>Orderdatum</span>
            <strong>
              {date(order.orderDate)}
            </strong>
          </div>
          <div>
            <span>Gewenste levering</span>
            <strong>
              {date(
                order.requestedDeliveryDate,
              )}
            </strong>
          </div>
          <div>
            <span>Klant</span>
            <strong>
              {order.customerName}
            </strong>
          </div>
        </div>

        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>Artikel</th>
                <th>SKU</th>
                <th>Kleur</th>
                <th>Maat</th>
                <th>Aantal</th>
                <th>Prijs</th>
                <th>Totaal</th>
              </tr>
            </thead>
            <tbody>
              {order.lines.map(
                (line, index) => (
                  <tr
                    key={`${line.sku}-${index}`}
                  >
                    <td>
                      <strong>
                        {line.productCode}
                      </strong>
                      <span>
                        {line.productName}
                      </span>
                    </td>
                    <td>{line.sku}</td>
                    <td>{line.color}</td>
                    <td>{line.size}</td>
                    <td>{line.quantity}</td>
                    <td>
                      {money(line.unitPrice)}
                    </td>
                    <td>
                      {money(line.lineTotal)}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.bottom}>
          <div className={styles.notes}>
            <strong>Opmerkingen</strong>
            <p>
              {order.notes ||
                "Geen opmerkingen."}
            </p>
          </div>

          <dl className={styles.totals}>
            <div>
              <dt>Subtotaal</dt>
              <dd>{money(order.subtotal)}</dd>
            </div>
            <div>
              <dt>BTW</dt>
              <dd>{money(order.vat)}</dd>
            </div>
            <div>
              <dt>Totaal</dt>
              <dd>{money(order.total)}</dd>
            </div>
          </dl>
        </div>
      </section>

      {approved ? (
        <section className={styles.approved}>
          <h2>Order is goedgekeurd</h2>
          <p>
            Ondertekend door{" "}
            <strong>
              {record.approval?.signerName}
            </strong>{" "}
            op{" "}
            {record.approval?.approvedAt
              ? new Intl.DateTimeFormat(
                  "nl-NL",
                  {
                    dateStyle: "long",
                    timeStyle: "short",
                  },
                ).format(
                  new Date(
                    record.approval
                      .approvedAt,
                  ),
                )
              : "—"}
            .
          </p>
          {record.approval
            ?.signatureDataUrl && (
            <img
              src={
                record.approval
                  .signatureDataUrl
              }
              alt="Handtekening"
            />
          )}
        </section>
      ) : (
        <section className={styles.signing}>
          <h2>Order goedkeuren</h2>
          <p>
            Neem eerst rustig de order en PDF
            door. Goedkeuren kan ook later,
            zolang de toegang geldig blijft.
          </p>

          <div className={styles.formGrid}>
            <label>
              <span>Naam ondertekenaar</span>
              <input
                value={signerName}
                onChange={(event) =>
                  setSignerName(
                    event.target.value,
                  )
                }
              />
            </label>

            <label>
              <span>E-mailadres</span>
              <input
                type="email"
                value={signerEmail}
                onChange={(event) =>
                  setSignerEmail(
                    event.target.value,
                  )
                }
              />
            </label>
          </div>

          <div className={styles.signature}>
            <div>
              <strong>Handtekening</strong>
              <button
                type="button"
                onClick={clearSignature}
              >
                Wissen
              </button>
            </div>
            <canvas
              ref={canvasRef}
              onPointerDown={startDrawing}
              onPointerMove={draw}
              onPointerUp={stopDrawing}
              onPointerCancel={stopDrawing}
            />
          </div>

          <label className={styles.accept}>
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) =>
                setAccepted(
                  event.target.checked,
                )
              }
            />
            <span>
              Ik heb de orderbevestiging
              gecontroleerd en ga akkoord met
              de inhoud, prijzen en
              leverafspraken.
            </span>
          </label>

          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          <button
            type="button"
            className={styles.approveButton}
            disabled={
              loading ||
              !accepted ||
              !hasSignature ||
              !signerName.trim() ||
              !signerEmail.trim()
            }
            onClick={approve}
          >
            {loading
              ? "Goedkeuring opslaan..."
              : "Order definitief goedkeuren"}
          </button>
        </section>
      )}

      <footer className={styles.footer}>
        <span>
          Beveiligd orderportaal van{" "}
          {companyName}
        </span>
        <span>
          Document-ID:{" "}
          {record.documentHash.slice(0, 12)}
        </span>
      </footer>
    </main>
  );
}
