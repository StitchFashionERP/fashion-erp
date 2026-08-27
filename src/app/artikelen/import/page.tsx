"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { AppIcon } from "@/components/ui/app-icon";
import { PageHeader } from "@/components/ui/page-header";
import {
  addProduct,
  generateArticleNumber,
  getStoredProducts,
  type ProductInput,
} from "@/lib/articles";
import { getPricingDefaults } from "@/lib/company-settings";
import { calculatePricing } from "@/lib/pricing-engine";
import { resolveColor } from "@/lib/master-data";
import { validateImportMasterData } from "@/lib/import-validation";
import { parseCsv, parseXlsx } from "./xlsx-parser";
import styles from "./article-import.module.css";

type Row = Record<string, string | number>;
type Step = 1 | 2 | 3 | 4;
type RowStatus = "ready" | "completed" | "error";

type ImportResult = {
  added: number;
  skipped: number;
  completed: number;
  errors: string[];
  completions: Record<string, number>;
};

type PreviewRow = {
  rowNumber: number;
  name: string;
  color: string;
  size: string;
  collection: string;
  garmentType: string;
  articleCode: string;
  ean: string;
  status: RowStatus;
  messages: string[];
  completions: string[];
};

const fields = [
  ["code", "Artikelnummer", false, ["artikelnummer", "article number", "sku", "product code"]],
  ["productName", "Productnaam", true, ["productnaam", "product name", "naam"]],
  ["brand", "Merk", false, ["merk", "brand"]],
  ["collection", "Collectie", false, ["collectie", "collection", "season", "seizoen"]],
  ["garmentType", "Artikeltype", false, ["artikeltype", "product type", "garment type", "type", "categorie", "category"]],
  ["color", "Kleur", true, ["kleur", "color", "colour"]],
  ["colorCode", "Kleurcode", false, ["kleurcode", "color code"]],
  ["size", "Maat", true, ["maat", "size"]],
  ["supplier", "Leverancier", false, ["leverancier", "supplier"]],
  ["supplierSku", "Leveranciersartikelnummer", false, ["leveranciersartikelnummer", "supplier sku"]],
  ["purchasePrice", "Inkoopprijs", false, ["inkoopprijs", "purchase price", "cost"]],
  ["salesPrice", "Verkoopprijs", false, ["verkoopprijs", "sales price"]],
  ["markup", "Markup", false, ["markup", "factor"]],
  ["vat", "BTW-percentage", false, ["btw-percentage", "btw", "vat"]],
  ["ean", "EAN", false, ["ean", "barcode", "gtin"]],
  ["stock", "Voorraad", false, ["voorraad", "stock"]],
  ["stockLocation", "Voorraadlocatie", false, ["voorraadlocatie", "location"]],
  ["active", "Actief", false, ["actief", "active", "status"]],
  ["description", "Omschrijving", false, ["omschrijving", "description"]],
  ["imageUrl", "Afbeeldings-URL", false, ["afbeeldings-url", "image url", "afbeelding"]],
] as const;

const norm = (value: string) =>
  value
    .toLowerCase()
    .replace(/\*/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const text = (
  row: Row,
  mapping: Record<string, string>,
  key: string,
) => String(row[mapping[key]] ?? "").trim();

const normalizedCode = (value: string) => value.trim().toUpperCase();
const normalizedEan = (value: string) => value.replace(/\s+/g, "");

function parseNumber(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return { value: 0, valid: true };
  }

  const normalized =
    trimmed.includes(",")
      ? trimmed.replace(/\./g, "").replace(",", ".")
      : trimmed;

  const parsed = Number(normalized);

  return {
    value: Number.isFinite(parsed) ? parsed : 0,
    valid: Number.isFinite(parsed),
  };
}

function truthy(value: string) {
  return !["nee", "no", "false", "0", "inactief"].includes(norm(value));
}

function incrementCounter(
  current: Record<string, number>,
  key: string,
) {
  current[key] = (current[key] ?? 0) + 1;
}

function buildPreview(
  rows: Row[],
  mapping: Record<string, string>,
): PreviewRow[] {
  const products = getStoredProducts();
  const usedCodes = new Set(
    products.map((product) => normalizedCode(product.code)),
  );
  const usedEans = new Set(
    products.flatMap((product) =>
      product.variants
        .map((variant) => variant.ean)
        .filter((ean): ean is string => Boolean(ean))
        .map(normalizedEan),
    ),
  );

  return rows.map((row, index) => {
    const messages: string[] = [];
    const completions: string[] = [];

    const name = text(row, mapping, "productName");
    const color = text(row, mapping, "color");
    const size = text(row, mapping, "size");
    const collection = text(row, mapping, "collection");
    const garmentType = text(row, mapping, "garmentType");
    const requestedCode = normalizedCode(text(row, mapping, "code"));
    const ean = normalizedEan(text(row, mapping, "ean"));

    const masterDataValidation =
      validateImportMasterData({
        brand: text(row, mapping, "brand"),
        color,
        size,
        category: text(row, mapping, "category"),
        productType: text(row, mapping, "garmentType"),
        supplier: text(row, mapping, "supplier"),
        collection,
      });

    if (!masterDataValidation.valid) {
      messages.push(...masterDataValidation.errors);
    }

    if (!name) messages.push("Productnaam ontbreekt.");
    if (!color) messages.push("Kleur ontbreekt.");
    if (!size) messages.push("Maat ontbreekt.");

    for (const field of ["purchasePrice", "salesPrice", "markup", "stock"]) {
      const rawValue = text(row, mapping, field);
      if (!parseNumber(rawValue).valid) {
        messages.push(`${field} bevat geen geldig getal.`);
      }
    }

    let articleCode = requestedCode;

    if (requestedCode) {
      if (usedCodes.has(requestedCode)) {
        messages.push(`Artikelcode ${requestedCode} bestaat al of staat dubbel in het bestand.`);
      } else {
        usedCodes.add(requestedCode);
      }
    } else {
      articleCode = generateArticleNumber({
        collectionCode: collection,
        productTypeCode: garmentType,
        existingCodes: Array.from(usedCodes),
      });
      usedCodes.add(normalizedCode(articleCode));
      completions.push(
        collection
          ? garmentType
            ? `Artikelcode automatisch gegenereerd: ${articleCode}.`
            : `Artikeltype ontbrak; XX gebruikt in ${articleCode}.`
          : garmentType
            ? `Collectie ontbrak; XXXX gebruikt in ${articleCode}.`
            : `Collectie en artikeltype ontbraken; XXXXXX gebruikt in ${articleCode}.`,
      );
    }

    if (!collection) {
      completions.push("Collectie automatisch aangevuld met XXXX.");
    }

    if (!garmentType) {
      completions.push("Artikeltype automatisch aangevuld met XX.");
    }

    if (!text(row, mapping, "brand")) {
      completions.push("Merk automatisch aangevuld met Onbekend.");
    }

    if (ean) {
      if (usedEans.has(ean)) {
        messages.push(`EAN ${ean} bestaat al of staat dubbel in het bestand.`);
      } else {
        usedEans.add(ean);
      }
    }

    return {
      rowNumber: index + 2,
      name,
      color,
      size,
      collection: collection || "XXXX",
      garmentType: garmentType || "XX",
      articleCode,
      ean,
      status:
        messages.length > 0
          ? "error"
          : completions.length > 0
            ? "completed"
            : "ready",
      messages,
      completions: Array.from(new Set(completions)),
    };
  });
}

export default function ArticleImportPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>(1);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);

  const missingMappings = useMemo(
    () =>
      fields.filter(
        ([key, , required]) => required && !mapping[key],
      ),
    [mapping],
  );

  const previewRows = useMemo(
    () => buildPreview(rows, mapping),
    [rows, mapping],
  );

  const stats = useMemo(
    () => ({
      total: previewRows.length,
      ready: previewRows.filter((row) => row.status === "ready").length,
      completed: previewRows.filter((row) => row.status === "completed").length,
      errors: previewRows.filter((row) => row.status === "error").length,
    }),
    [previewRows],
  );

  const completionSummary = useMemo(() => {
    const summary: Record<string, number> = {};

    previewRows.forEach((row) => {
      if (!text(rows[row.rowNumber - 2], mapping, "collection")) {
        incrementCounter(summary, "Collectie → XXXX");
      }

      if (!text(rows[row.rowNumber - 2], mapping, "garmentType")) {
        incrementCounter(summary, "Artikeltype → XX");
      }

      if (!text(rows[row.rowNumber - 2], mapping, "code")) {
        incrementCounter(summary, "Artikelcode gegenereerd");
      }

      if (!text(rows[row.rowNumber - 2], mapping, "brand")) {
        incrementCounter(summary, "Merk → Onbekend");
      }
    });

    return summary;
  }, [previewRows, rows, mapping]);

  async function handleFile(file?: File) {
    if (!file) return;

    const extension = file.name.split(".").pop()?.toLowerCase();

    if (extension !== "xlsx" && extension !== "csv") {
      setError("Gebruik een Excel-bestand (.xlsx) of CSV-bestand (.csv).");
      return;
    }

    try {
      const parsed =
        extension === "csv"
          ? parseCsv(await file.text())
          : await parseXlsx(file);

      if (!parsed.length) {
        throw new Error("Het bestand bevat geen regels.");
      }

      const newHeaders = Object.keys(parsed[0]);
      const automaticMapping: Record<string, string> = {};

      fields.forEach(([key, , , aliases]) => {
        const match = newHeaders.find((header) =>
          aliases.some((alias) => norm(alias) === norm(header)),
        );

        if (match) {
          automaticMapping[key] = match;
        }
      });

      setFileName(file.name);
      setRows(parsed);
      setHeaders(newHeaders);
      setMapping(automaticMapping);
      setError("");
      setResult(null);
      setStep(2);
    } catch {
      setError(
        "Het bestand kon niet worden gelezen. Controleer het sjabloon en probeer opnieuw.",
      );
    }
  }

  async function runImport() {
    setImporting(true);
    setError("");
    setProgress(0);

    const errors: string[] = [];
    const completions: Record<string, number> = {};
    let added = 0;
    let skipped = 0;
    let completed = 0;

    try {
      const defaults = getPricingDefaults();

      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index];
        const preview = previewRows[index];

        if (preview.status === "error") {
          skipped += 1;
          errors.push(
            ...preview.messages.map(
              (message) => `Regel ${preview.rowNumber}: ${message}`,
            ),
          );
          continue;
        }

        const purchasePrice = parseNumber(
          text(row, mapping, "purchasePrice"),
        ).value;
        const suppliedSalesPrice = parseNumber(
          text(row, mapping, "salesPrice"),
        ).value;
        const suppliedMarkup = parseNumber(
          text(row, mapping, "markup"),
        ).value;
        const stock = parseNumber(text(row, mapping, "stock")).value;

        const pricing = calculatePricing(
          {
            supplierPurchasePrice: purchasePrice,
            brandMarkup: suppliedMarkup || defaults.brandMarkup,
            salesPrice: suppliedSalesPrice || undefined,
          },
          suppliedSalesPrice > 0 ? "sales-price" : "brand-markup",
          defaults,
        );

        const collection =
          text(row, mapping, "collection") || "XXXX";
        const garmentType =
          text(row, mapping, "garmentType") || "XX";
        const brand = text(row, mapping, "brand") || "Onbekend";
        const supplier = text(row, mapping, "supplier");
        const importedColor = text(row, mapping, "color");

        const colorMaster = resolveColor(importedColor);

        if (!colorMaster) {
          throw new Error(
            `Kleur "${importedColor}" bestaat niet in stamgegevens.`,
          );
        }

        const color = colorMaster.name;

        const size = text(row, mapping, "size");
        const ean = normalizedEan(text(row, mapping, "ean"));

        const input: ProductInput = {
          code: preview.articleCode,
          name: text(row, mapping, "productName"),
          collection,
          category: garmentType === "XX" ? "" : garmentType,
          supplier: text(row, mapping, "supplier"),
          supplierProductCode: text(row, mapping, "supplierSku"),
          status: truthy(text(row, mapping, "active"))
            ? "Actief"
            : "Inactief",
          vatCode: "2V",
          brand,
          material: "",
          garmentType: garmentType === "XX" ? "" : garmentType,
          fit: "",
          colorFamily: color,
          seasonType: "Doorlopend",
          countryOfOrigin: "",
          description: text(row, mapping, "description"),
          purchasePrice: pricing.supplierPurchasePrice,
          wholesalePrice: pricing.salesPrice,
          shippingCosts: pricing.shippingCosts,
          otherCosts: pricing.otherCosts,
          totalCost: pricing.totalCost,
          brandMarkup: pricing.brandMarkup,
          recommendedRetailPrice: pricing.recommendedRetailPrice,
          retailerMarkup: pricing.retailerMarkup,
          colors: [color],
          sizes: [size],
          importedVariants: [
            {
              color,
              size,
              stock,
              ean: ean || undefined,
              supplierVariantCode:
                text(row, mapping, "supplierSku") || undefined,
            },
          ],
        };

        await addProduct(input);
        added += 1;

        if (preview.status === "completed") {
          completed += 1;

          if (!text(row, mapping, "collection")) {
            incrementCounter(completions, "Collectie → XXXX");
          }

          if (!text(row, mapping, "garmentType")) {
            incrementCounter(completions, "Artikeltype → XX");
          }

          if (!text(row, mapping, "code")) {
            incrementCounter(completions, "Artikelcode gegenereerd");
          }

          if (!text(row, mapping, "brand")) {
            incrementCounter(completions, "Merk → Onbekend");
          }
        }

        setProgress(Math.round(((index + 1) / rows.length) * 100));

        if (index % 20 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }

      const importResult: ImportResult = {
        added,
        skipped,
        completed,
        errors,
        completions,
      };

      setResult(importResult);

      const previousHistory = JSON.parse(
        window.localStorage.getItem(
          "fashion-erp-article-import-history-v1",
        ) || "[]",
      );

      window.localStorage.setItem(
        "fashion-erp-article-import-history-v1",
        JSON.stringify(
          [
            {
              id: `import-${Date.now()}`,
              fileName,
              createdAt: new Date().toISOString(),
              ...importResult,
            },
            ...previousHistory,
          ].slice(0, 100),
        ),
      );

      setProgress(100);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Importeren is mislukt.",
      );
    } finally {
      setImporting(false);
    }
  }

  function downloadLog() {
    if (!result) return;

    const completionLines = Object.entries(result.completions).map(
      ([label, count]) => `Automatisch aangevuld;${label};${count}`,
    );

    const lines = [
      "Resultaat;Aantal",
      `Toegevoegd;${result.added}`,
      `Automatisch aangevuld;${result.completed}`,
      `Overgeslagen;${result.skipped}`,
      "",
      "Aanvulling;Waarde;Aantal",
      ...completionLines,
      "",
      ...result.errors.map(
        (item) => `Fout;${item.replaceAll(";", ",")}`,
      ),
    ];

    const blob = new Blob(["\ufeff" + lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `STiTch-importlog-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    anchor.click();

    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader
        eyebrow="Import Center"
        title="Artikelen importeren"
        description="Upload, koppel, controleer en importeer artikelgegevens veilig in STiTch."
      />

      <div className={styles.steps}>
        {["Bestand", "Kolommen koppelen", "Controleren", "Importeren"].map(
          (label, index) => (
            <span
              key={label}
              className={step === index + 1 ? styles.activeStep : ""}
            >
              {index + 1}. {label}
            </span>
          ),
        )}
      </div>

      {step === 1 && (
        <>
          <section className={styles.templateCard}>
            <div className={styles.iconBox}>
              <AppIcon name="document" size={22} />
            </div>

            <div className={styles.templateText}>
              <h2>Gebruik het STiTch Excel-sjabloon</h2>
              <p>
                Een artikelnummer mag leeg blijven. STiTch gebruikt dan
                dezelfde nummergenerator als bij handmatig aanmaken.
              </p>
              <div className={styles.requiredFields}>
                Verplicht: productnaam, kleur en maat
              </div>
            </div>

            <a
              className={styles.downloadButton}
              href="/templates/STiTch-artikelimport-template.xlsx"
              download
            >
              Excel-sjabloon downloaden
            </a>
          </section>

          <section className={styles.uploadCard}>
            <div>
              <h2>Upload het ingevulde bestand</h2>
              <p>Ondersteunde bestanden: .xlsx en .csv</p>
            </div>

            <div
              className={styles.dropZone}
              onClick={() => inputRef.current?.click()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                void handleFile(event.dataTransfer.files[0]);
              }}
            >
              <input
                ref={inputRef}
                className={styles.fileInput}
                type="file"
                accept=".xlsx,.csv"
                onChange={(event) =>
                  void handleFile(event.target.files?.[0])
                }
              />
              <span className={styles.uploadIcon}>
                <AppIcon name="clipboard" size={22} />
              </span>
              <strong>Sleep het bestand hierheen</strong>
              <span>of klik om een bestand te kiezen</span>
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.actions}>
              <Link
                href="/instellingen/import-center"
                className={styles.secondaryButton}
              >
                Terug
              </Link>
            </div>
          </section>
        </>
      )}

      {step === 2 && (
        <section className={styles.uploadCard}>
          <div className={styles.sectionHeader}>
            <div>
              <h2>Kolommen koppelen</h2>
              <p>
                {fileName} · {rows.length} regels gevonden
              </p>
            </div>
            <button
              className={styles.textButton}
              onClick={() => setStep(1)}
            >
              Ander bestand
            </button>
          </div>

          <div className={styles.mappingTable}>
            <div className={styles.mappingHeader}>
              <div>STiTch-veld</div>
              <div>Kolom uit bestand</div>
              <div>Voorbeeld</div>
            </div>

            {fields.map(([key, label, required]) => {
              const selected = mapping[key] ?? "";

              return (
                <div className={styles.mappingRow} key={key}>
                  <div>
                    <strong>{label}</strong>
                    {required && <span className={styles.required}> *</span>}
                  </div>

                  <select
                    value={selected}
                    onChange={(event) =>
                      setMapping((current) => ({
                        ...current,
                        [key]: event.target.value,
                      }))
                    }
                  >
                    <option value="">Niet koppelen</option>
                    {headers.map((header) => (
                      <option key={header}>{header}</option>
                    ))}
                  </select>

                  <div className={styles.example}>
                    {selected
                      ? String(rows[0]?.[selected] ?? "—")
                      : "—"}
                  </div>
                </div>
              );
            })}
          </div>

          {missingMappings.length > 0 && (
            <p className={styles.error}>
              Koppel eerst:{" "}
              {missingMappings.map(([, label]) => label).join(", ")}.
            </p>
          )}

          <div className={styles.actions}>
            <button
              className={styles.secondaryButton}
              onClick={() => setStep(1)}
            >
              Terug
            </button>
            <button
              className={styles.primaryButton}
              disabled={missingMappings.length > 0}
              onClick={() => setStep(3)}
            >
              Controleren <AppIcon name="arrowRight" size={15} />
            </button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className={styles.uploadCard}>
          <div>
            <h2>Import controleren</h2>
            <p>
              Alleen echte fouten blokkeren de import. Ontbrekende collectie,
              artikeltype, artikelcode en merk vult STiTch automatisch aan.
            </p>
          </div>

          <div className={styles.summary}>
            <div>
              <strong>{stats.total}</strong>
              <span>Regels</span>
            </div>
            <div>
              <strong>{stats.ready}</strong>
              <span>Volledig</span>
            </div>
            <div>
              <strong>{stats.completed}</strong>
              <span>Aangevuld</span>
            </div>
            <div>
              <strong>{stats.errors}</strong>
              <span>Echte fouten</span>
            </div>
          </div>

          {Object.keys(completionSummary).length > 0 && (
            <div className={styles.completionBox}>
              <strong>Automatisch aan te vullen</strong>
              <div className={styles.completionList}>
                {Object.entries(completionSummary).map(([label, count]) => (
                  <span key={label}>
                    {label}: <strong>{count}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className={styles.previewWrap}>
            <table className={styles.preview}>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Regel</th>
                  <th>Artikelcode</th>
                  <th>Productnaam</th>
                  <th>Collectie</th>
                  <th>Type</th>
                  <th>Kleur</th>
                  <th>Maat</th>
                  <th>EAN</th>
                </tr>
              </thead>

              <tbody>
                {previewRows.slice(0, 50).map((row) => (
                  <tr key={row.rowNumber}>
                    <td>
                      <span
                        className={
                          row.status === "error"
                            ? styles.bad
                            : row.status === "completed"
                              ? styles.warn
                              : styles.ok
                        }
                        title={[...row.messages, ...row.completions].join(" ")}
                      >
                        {row.status === "error"
                          ? "Fout"
                          : row.status === "completed"
                            ? "Aangevuld"
                            : "Gereed"}
                      </span>
                    </td>
                    <td>{row.rowNumber}</td>
                    <td>
                      <strong>{row.articleCode || "—"}</strong>
                    </td>
                    <td>{row.name || "—"}</td>
                    <td>{row.collection}</td>
                    <td>{row.garmentType}</td>
                    <td>{row.color || "—"}</td>
                    <td>{row.size || "—"}</td>
                    <td>{row.ean || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {previewRows.length > 50 && (
            <p className={styles.previewNote}>
              De eerste 50 van {previewRows.length} regels worden getoond.
            </p>
          )}

          {stats.errors > 0 && (
            <div className={styles.errorList}>
              {previewRows
                .filter((row) => row.status === "error")
                .slice(0, 12)
                .flatMap((row) =>
                  row.messages.map((message) => (
                    <div key={`${row.rowNumber}-${message}`}>
                      Regel {row.rowNumber}: {message}
                    </div>
                  )),
                )}
            </div>
          )}

          <div className={styles.actions}>
            <button
              className={styles.secondaryButton}
              onClick={() => setStep(2)}
            >
              Terug
            </button>
            <button
              className={styles.primaryButton}
              disabled={stats.errors > 0}
              onClick={() => setStep(4)}
            >
              Naar importeren <AppIcon name="arrowRight" size={15} />
            </button>
          </div>
        </section>
      )}

      {step === 4 && (
        <section className={styles.completeCard}>
          {!result ? (
            <>
              <span className={styles.completeIcon}>
                <AppIcon name="clipboard" size={28} />
              </span>
              <h2>{rows.length} artikelen klaarzetten</h2>
              <p>
                STiTch gebruikt dezelfde artikelnummergenerator als bij
                handmatig aanmaken. Ontbrekende codes worden zichtbaar
                aangevuld met XXXX en XX.
              </p>

              {importing && (
                <div className={styles.progressTrack}>
                  <div
                    className={styles.progressBar}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}

              {importing && (
                <div className={styles.progressLabel}>
                  {progress}% voltooid
                </div>
              )}

              {error && <p className={styles.error}>{error}</p>}

              <div className={styles.actions}>
                <button
                  className={styles.secondaryButton}
                  disabled={importing}
                  onClick={() => setStep(3)}
                >
                  Terug
                </button>
                <button
                  className={styles.primaryButton}
                  disabled={importing}
                  onClick={() => void runImport()}
                >
                  {importing ? "Importeren..." : "Import uitvoeren"}
                </button>
              </div>
            </>
          ) : (
            <>
              <span className={styles.completeIcon}>
                <AppIcon name="check" size={28} />
              </span>
              <h2>Import afgerond</h2>
              <p>
                {result.added} artikelen toegevoegd, {result.completed} regels
                automatisch aangevuld en {result.skipped} regels overgeslagen.
              </p>

              <div className={styles.summary}>
                <div>
                  <strong>{result.added}</strong>
                  <span>Toegevoegd</span>
                </div>
                <div>
                  <strong>{result.completed}</strong>
                  <span>Aangevuld</span>
                </div>
                <div>
                  <strong>{result.skipped}</strong>
                  <span>Overgeslagen</span>
                </div>
                <div>
                  <strong>{result.errors.length}</strong>
                  <span>Foutmeldingen</span>
                </div>
              </div>

              {Object.keys(result.completions).length > 0 && (
                <div className={styles.completionBox}>
                  <strong>Automatisch aangevuld</strong>
                  <div className={styles.completionList}>
                    {Object.entries(result.completions).map(
                      ([label, count]) => (
                        <span key={label}>
                          {label}: <strong>{count}</strong>
                        </span>
                      ),
                    )}
                  </div>
                </div>
              )}

              {result.errors.length > 0 && (
                <div className={styles.errorList}>
                  {result.errors.slice(0, 12).map((item) => (
                    <div key={item}>{item}</div>
                  ))}
                </div>
              )}

              <div className={styles.actions}>
                <button
                  className={styles.secondaryButton}
                  onClick={downloadLog}
                >
                  Importlog downloaden
                </button>
                <Link
                  className={styles.primaryButton}
                  href="/artikelen"
                >
                  Naar artikelen
                </Link>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
