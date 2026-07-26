"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";
import { PageHeader } from "@/components/ui/page-header";
import {
  loadCompanySettings,
  resetCompanySettings,
  saveCompanySettings,
  type CompanySettings,
  type PriceMode,
  type PriceRounding,
} from "@/lib/company-settings";
import { migrateProductsToPricingSettings } from "@/lib/articles";
import { getCountries, subscribeToMasterData } from "@/lib/master-data";
import styles from "./company-settings.module.css";

type Section =
  | "company"
  | "pricing"
  | "numbering"
  | "documents"
  | "sales"
  | "purchasing";

const sections: Array<{
  id: Section;
  label: string;
  description: string;
}> = [
  {
    id: "company",
    label: "Bedrijfsgegevens",
    description: "Adres, contact- en bankgegevens",
  },
  {
    id: "pricing",
    label: "Prijsinstellingen",
    description: "Markups, btw en afronding",
  },
  {
    id: "numbering",
    label: "Nummerreeksen",
    description: "Voorvoegsels voor documenten",
  },
  {
    id: "documents",
    label: "Documenten",
    description: "Voettekst en getoonde gegevens",
  },
  {
    id: "sales",
    label: "Verkoop",
    description: "Standaarden voor verkooporders",
  },
  {
    id: "purchasing",
    label: "Inkoop",
    description: "Standaarden voor inkooporders",
  },
];

function parseNumber(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}


function readLogoFile(
  file: File,
  callback: (dataUrl: string) => void,
) {
  const reader = new FileReader();

  reader.onload = () => {
    callback(String(reader.result || ""));
  };

  reader.readAsDataURL(file);
}

export default function CompanySettingsPage() {
  const [settings, setSettings] =
    useState<CompanySettings | null>(null);
  const [activeSection, setActiveSection] =
    useState<Section>("company");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [migrationMessage, setMigrationMessage] =
    useState("");
  const [countries, setCountries] = useState(() => getCountries());

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      try {
        setLoadError("");
        const loadedSettings = await loadCompanySettings();

        if (!cancelled) {
          setSettings(loadedSettings);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Bedrijfsinstellingen laden is mislukt.",
          );
        }
      }
    }

    void loadSettings();

    const unsubscribe = subscribeToMasterData(() =>
      setCountries(getCountries()),
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  if (loadError) {
    return (
      <section className="content-card">
        <div className={styles.errorNotification}>
          <strong>Bedrijfsinstellingen konden niet worden geladen.</strong>
          <span>{loadError}</span>
        </div>
      </section>
    );
  }

  if (!settings) {
    return (
      <section className="content-card">
        Bedrijfsinstellingen uit Supabase laden...
      </section>
    );
  }

  function updateGroup<K extends keyof CompanySettings>(
    group: K,
    changes: Partial<CompanySettings[K]>,
  ) {
    setSettings((current) =>
      current
        ? {
            ...current,
            [group]: {
              ...current[group],
              ...changes,
            },
          }
        : current,
    );

    setSaved(false);
  }

  async function handleSave() {
    try {
      setSaving(true);
      setLoadError("");
      const savedSettings = await saveCompanySettings(settings!);
      setSettings(savedSettings);
      setSaved(true);

      window.setTimeout(() => {
        setSaved(false);
      }, 2800);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Bedrijfsinstellingen opslaan is mislukt.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handlePricingMigration() {
    try {
      setSaving(true);
      setLoadError("");
      await saveCompanySettings(settings!);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Prijsinstellingen opslaan is mislukt.",
      );
      setSaving(false);
      return;
    }

    const result = migrateProductsToPricingSettings(true);

    setMigrationMessage(
      result.migratedProducts > 0
        ? `${result.migratedProducts} van ${result.totalProducts} artikelen zijn aangevuld met de centrale prijsinstellingen.`
        : `Alle ${result.totalProducts} artikelen beschikken al over volledige prijsgegevens.`,
    );

    window.setTimeout(() => {
      setMigrationMessage("");
    }, 4200);

    setSaving(false);
  }

  async function handleReset() {
    if (
      !window.confirm(
        "Weet je zeker dat je alle bedrijfsinstellingen wilt terugzetten naar de standaardwaarden?",
      )
    ) {
      return;
    }

    try {
      setSaving(true);
      setLoadError("");
      const resetSettings = await resetCompanySettings();
      setSettings(resetSettings);
      setSaved(true);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Standaardinstellingen herstellen is mislukt.",
      );
    } finally {
      setSaving(false);
    }
  }

  const brandExampleCost = 20;
  const brandExamplePrice =
    brandExampleCost * settings.pricing.brandMarkup;
  const retailerExampleExVat =
    brandExamplePrice * settings.pricing.retailerMarkup;
  const retailerExampleInclVat =
    retailerExampleExVat *
    (1 + settings.pricing.vatPercentage / 100);

  return (
    <div>
      <div className={styles.breadcrumb}>
        <Link href="/instellingen">Instellingen</Link>
        <span>›</span>
        <span>Bedrijfsinstellingen</span>
      </div>

      <PageHeader
        eyebrow="Beheer"
        title="Bedrijfsinstellingen"
        description="Beheer centrale bedrijfslogica zonder wijzigingen in de code."
        action={
          <div className="button-group">
            <button
              type="button"
              className="button button-secondary"
              onClick={handleReset}
              disabled={saving}
            >
              Standaard herstellen
            </button>

            <button
              type="button"
              className="button button-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Opslaan..." : "Instellingen opslaan"}
            </button>
          </div>
        }
      />

      {saved && (
        <div className={styles.notification}>
          <span>✓</span>
          Bedrijfsinstellingen zijn opgeslagen.
        </div>
      )}

      {migrationMessage && (
        <div className={styles.notification}>
          <span>✓</span>
          {migrationMessage}
        </div>
      )}

      <section className={styles.workspace}>
        <aside className={styles.navigation}>
          <div className={styles.navigationHeader}>
            <span>Instellingen</span>
            <strong>Bedrijf</strong>
          </div>

          <nav>
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                className={
                  activeSection === section.id
                    ? styles.activeNavigationItem
                    : undefined
                }
                onClick={() => setActiveSection(section.id)}
              >
                <strong>{section.label}</strong>
                <span>{section.description}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className={styles.content}>
          {activeSection === "company" && (
            <section className="content-card">
              <div className="content-card-header">
                <div>
                  <h2 className="content-card-title">
                    Bedrijfsgegevens
                  </h2>
                  <p className="content-card-description">
                    Deze gegevens worden later gebruikt op documenten en in e-mails.
                  </p>
                </div>
              </div>

              <div className={styles.logoWorkspace}>
                <div className={styles.logoPreview}>
                  {settings.company.logoDataUrl ? (
                    <img
                      src={settings.company.logoDataUrl}
                      alt="Bedrijfslogo"
                    />
                  ) : (
                    <div className={styles.logoPlaceholder}>
                      Bedrijfslogo
                    </div>
                  )}
                </div>

                <div className={styles.logoControls}>
                  <strong>Bedrijfslogo</strong>
                  <p>
                    Dit logo wordt gebruikt in de accountweergave en op
                    facturen, creditfacturen, pakbonnen, orderbevestigingen
                    en inkooporders.
                  </p>

                  <div className="button-group">
                    <label className="button button-secondary">
                      Logo uploaden
                      <input
                        className={styles.hiddenFileInput}
                        type="file"
                        accept="image/png,image/jpeg"
                        onChange={(event) => {
                          const file = event.target.files?.[0];

                          if (file) {
                            readLogoFile(file, (logoDataUrl) =>
                              updateGroup("company", {
                                logoDataUrl,
                              }),
                            );
                          }
                        }}
                      />
                    </label>

                    {settings.company.logoDataUrl && (
                      <button
                        type="button"
                        className="button button-secondary"
                        onClick={() =>
                          updateGroup("company", {
                            logoDataUrl: "",
                          })
                        }
                      >
                        Logo verwijderen
                      </button>
                    )}
                  </div>

                  <small>
                    Gebruik bij voorkeur een PNG of JPG met transparante of
                    witte achtergrond.
                  </small>
                </div>
              </div>

              <div className={styles.formGrid}>
                <label>
                  <span>Bedrijfsnaam</span>
                  <input
                    value={settings.company.name}
                    onChange={(event) =>
                      updateGroup("company", {
                        name: event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  <span>Handelsnaam</span>
                  <input
                    value={settings.company.tradeName}
                    onChange={(event) =>
                      updateGroup("company", {
                        tradeName: event.target.value,
                      })
                    }
                  />
                </label>

                <label className={styles.fullWidth}>
                  <span>Adres</span>
                  <input
                    value={settings.company.address}
                    onChange={(event) =>
                      updateGroup("company", {
                        address: event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  <span>Postcode</span>
                  <input
                    value={settings.company.postalCode}
                    onChange={(event) =>
                      updateGroup("company", {
                        postalCode: event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  <span>Plaats</span>
                  <input
                    value={settings.company.city}
                    onChange={(event) =>
                      updateGroup("company", {
                        city: event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  <span>Land</span>
                  <select
                    value={settings.company.country}
                    onChange={(event) =>
                      updateGroup("company", {
                        country: event.target.value,
                      })
                    }
                  >
                    {countries
                      .filter((country) => country.isActive)
                      .map((country) => (
                        <option key={country.id} value={country.name}>
                          {country.name}
                        </option>
                      ))}
                  </select>
                </label>

                <label>
                  <span>E-mailadres</span>
                  <input
                    type="email"
                    value={settings.company.email}
                    onChange={(event) =>
                      updateGroup("company", {
                        email: event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  <span>Telefoonnummer</span>
                  <input
                    value={settings.company.phone}
                    onChange={(event) =>
                      updateGroup("company", {
                        phone: event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  <span>Website</span>
                  <input
                    value={settings.company.website}
                    onChange={(event) =>
                      updateGroup("company", {
                        website: event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  <span>KvK-nummer</span>
                  <input
                    value={
                      settings.company.chamberOfCommerceNumber
                    }
                    onChange={(event) =>
                      updateGroup("company", {
                        chamberOfCommerceNumber:
                          event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  <span>BTW-nummer</span>
                  <input
                    value={settings.company.vatNumber}
                    onChange={(event) =>
                      updateGroup("company", {
                        vatNumber: event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  <span>IBAN</span>
                  <input
                    value={settings.company.iban}
                    onChange={(event) =>
                      updateGroup("company", {
                        iban: event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  <span>BIC</span>
                  <input
                    value={settings.company.bic}
                    onChange={(event) =>
                      updateGroup("company", {
                        bic: event.target.value,
                      })
                    }
                  />
                </label>
              </div>
            </section>
          )}

          {activeSection === "pricing" && (
            <div className={styles.stack}>
              <section className="content-card">
                <div className="content-card-header">
                  <div>
                    <h2 className="content-card-title">
                      Prijsinstellingen
                    </h2>
                    <p className="content-card-description">
                      Standaardtargets voor nieuwe artikelen. Definitieve prijzen blijven overschrijfbaar.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={handlePricingMigration}
                    disabled={saving}
                  >
                    Bestaande artikelen controleren
                  </button>
                </div>

                <div className={styles.formGrid}>
                  <label>
                    <span>Standaard markup merk</span>
                    <div className={styles.inputSuffix}>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={settings.pricing.brandMarkup}
                        onChange={(event) =>
                          updateGroup("pricing", {
                            brandMarkup: parseNumber(
                              event.target.value,
                            ),
                          })
                        }
                      />
                      <span>x</span>
                    </div>
                  </label>

                  <label>
                    <span>Standaard markup retailer</span>
                    <div className={styles.inputSuffix}>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={settings.pricing.retailerMarkup}
                        onChange={(event) =>
                          updateGroup("pricing", {
                            retailerMarkup: parseNumber(
                              event.target.value,
                            ),
                          })
                        }
                      />
                      <span>x</span>
                    </div>
                  </label>

                  <label>
                    <span>BTW-percentage</span>
                    <div className={styles.inputSuffix}>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={settings.pricing.vatPercentage}
                        onChange={(event) =>
                          updateGroup("pricing", {
                            vatPercentage: parseNumber(
                              event.target.value,
                            ),
                          })
                        }
                      />
                      <span>%</span>
                    </div>
                  </label>

                  <label>
                    <span>Commerciële afronding</span>
                    <select
                      value={settings.pricing.rounding}
                      onChange={(event) =>
                        updateGroup("pricing", {
                          rounding: event.target
                            .value as PriceRounding,
                        })
                      }
                    >
                      <option value="none">Niet afronden</option>
                      <option value="0.50">Eindigen op ,50</option>
                      <option value="0.95">Eindigen op ,95</option>
                      <option value="1.00">Hele euro</option>
                    </select>
                  </label>

                  <label className={styles.fullWidth}>
                    <span>Prijsmodus</span>
                    <select
                      value={settings.pricing.mode}
                      onChange={(event) =>
                        updateGroup("pricing", {
                          mode: event.target.value as PriceMode,
                        })
                      }
                    >
                      <option value="automatic">
                        Automatisch herberekenen
                      </option>
                      <option value="semi-automatic">
                        Semi-automatisch: voorstel tonen
                      </option>
                      <option value="manual">
                        Handmatig: alleen markups controleren
                      </option>
                    </select>
                  </label>
                </div>
              </section>

              <section className={styles.previewCard}>
                <div>
                  <span>Rekenvoorbeeld</span>
                  <h3>Kostprijs € 20,00</h3>
                  <p>
                    Dit voorbeeld laat zien hoe de huidige standaardtargets doorwerken.
                  </p>
                </div>

                <div className={styles.previewValues}>
                  <div>
                    <span>Verkoopprijs excl. btw</span>
                    <strong>
                      € {brandExamplePrice.toFixed(2).replace(".", ",")}
                    </strong>
                    <small>
                      merk-markup {settings.pricing.brandMarkup.toFixed(2)}x
                    </small>
                  </div>

                  <div>
                    <span>Adviesverkoopprijs incl. btw</span>
                    <strong>
                      € {retailerExampleInclVat.toFixed(2).replace(".", ",")}
                    </strong>
                    <small>
                      retailer-markup {settings.pricing.retailerMarkup.toFixed(2)}x + {settings.pricing.vatPercentage}% btw
                    </small>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeSection === "numbering" && (
            <section className="content-card">
              <div className="content-card-header">
                <div>
                  <h2 className="content-card-title">
                    Nummerreeksen
                  </h2>
                  <p className="content-card-description">
                    Voorvoegsels voor nieuwe artikelen en documenten.
                  </p>
                </div>
              </div>

              <div className={styles.formGrid}>
                <label>
                  <span>Artikelen</span>
                  <input
                    value={settings.numbering.articlePrefix}
                    onChange={(event) =>
                      updateGroup("numbering", {
                        articlePrefix: event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  <span>Verkooporders</span>
                  <input
                    value={settings.numbering.salesOrderPrefix}
                    onChange={(event) =>
                      updateGroup("numbering", {
                        salesOrderPrefix: event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  <span>Inkooporders</span>
                  <input
                    value={settings.numbering.purchaseOrderPrefix}
                    onChange={(event) =>
                      updateGroup("numbering", {
                        purchaseOrderPrefix: event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  <span>Facturen</span>
                  <input
                    value={settings.numbering.invoicePrefix}
                    onChange={(event) =>
                      updateGroup("numbering", {
                        invoicePrefix: event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  <span>Inkoopontvangsten</span>
                  <input
                    value={settings.numbering.receiptPrefix}
                    onChange={(event) =>
                      updateGroup("numbering", {
                        receiptPrefix: event.target.value,
                      })
                    }
                  />
                </label>
              </div>
            </section>
          )}

          {activeSection === "documents" && (
            <section className="content-card">
              <div className="content-card-header">
                <div>
                  <h2 className="content-card-title">
                    Documentinstellingen
                  </h2>
                  <p className="content-card-description">
                    Centrale instellingen voor orderbevestigingen, pakbonnen, inkooporders en facturen.
                  </p>
                </div>
              </div>

              <div className={styles.switchList}>
                <label>
                  <input
                    type="checkbox"
                    checked={settings.documents.showCompanyDetails}
                    onChange={(event) =>
                      updateGroup("documents", {
                        showCompanyDetails: event.target.checked,
                      })
                    }
                  />
                  <div>
                    <strong>Bedrijfsgegevens tonen</strong>
                    <span>Toon adres en contactgegevens op documenten.</span>
                  </div>
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={settings.documents.showBankDetails}
                    onChange={(event) =>
                      updateGroup("documents", {
                        showBankDetails: event.target.checked,
                      })
                    }
                  />
                  <div>
                    <strong>Bankgegevens tonen</strong>
                    <span>Toon IBAN en BIC waar relevant.</span>
                  </div>
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={settings.documents.showVatNumber}
                    onChange={(event) =>
                      updateGroup("documents", {
                        showVatNumber: event.target.checked,
                      })
                    }
                  />
                  <div>
                    <strong>BTW-nummer tonen</strong>
                    <span>Neem het BTW-nummer op in de documentfooter.</span>
                  </div>
                </label>
              </div>

              <div className={styles.formGrid}>
                <label className={styles.fullWidth}>
                  <span>Documentfooter</span>
                  <textarea
                    value={settings.documents.footerText}
                    onChange={(event) =>
                      updateGroup("documents", {
                        footerText: event.target.value,
                      })
                    }
                  />
                </label>

                <label className={styles.fullWidth}>
                  <span>Betalingstekst</span>
                  <textarea
                    value={settings.documents.paymentText}
                    onChange={(event) =>
                      updateGroup("documents", {
                        paymentText: event.target.value,
                      })
                    }
                  />
                </label>
              </div>
            </section>
          )}

          {activeSection === "sales" && (
            <section className="content-card">
              <div className="content-card-header">
                <div>
                  <h2 className="content-card-title">
                    Verkoopinstellingen
                  </h2>
                  <p className="content-card-description">
                    Standaarden voor nieuwe verkooporders.
                  </p>
                </div>
              </div>

              <div className={styles.formGrid}>
                <label>
                  <span>Standaard betalingstermijn</span>
                  <div className={styles.inputSuffix}>
                    <input
                      type="number"
                      min="0"
                      value={settings.sales.defaultPaymentDays}
                      onChange={(event) =>
                        updateGroup("sales", {
                          defaultPaymentDays: parseNumber(
                            event.target.value,
                          ),
                        })
                      }
                    />
                    <span>dagen</span>
                  </div>
                </label>
              </div>

              <div className={styles.switchList}>
                <label>
                  <input
                    type="checkbox"
                    checked={settings.sales.reserveStockOnConfirmation}
                    onChange={(event) =>
                      updateGroup("sales", {
                        reserveStockOnConfirmation:
                          event.target.checked,
                      })
                    }
                  />
                  <div>
                    <strong>Voorraad reserveren bij bevestiging</strong>
                    <span>
                      Uit laten voor voororders; voorraad wordt dan pas via allocatie gereserveerd.
                    </span>
                  </div>
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={settings.sales.automaticallyCreateInvoice}
                    onChange={(event) =>
                      updateGroup("sales", {
                        automaticallyCreateInvoice:
                          event.target.checked,
                      })
                    }
                  />
                  <div>
                    <strong>Automatisch factuurconcept maken</strong>
                    <span>Maak na verzending automatisch een conceptfactuur.</span>
                  </div>
                </label>
              </div>
            </section>
          )}

          {activeSection === "purchasing" && (
            <section className="content-card">
              <div className="content-card-header">
                <div>
                  <h2 className="content-card-title">
                    Inkoopinstellingen
                  </h2>
                  <p className="content-card-description">
                    Standaarden voor nieuwe inkooporders.
                  </p>
                </div>
              </div>

              <div className={styles.formGrid}>
                <label>
                  <span>Standaard betalingstermijn</span>
                  <div className={styles.inputSuffix}>
                    <input
                      type="number"
                      min="0"
                      value={settings.purchasing.defaultPaymentDays}
                      onChange={(event) =>
                        updateGroup("purchasing", {
                          defaultPaymentDays: parseNumber(
                            event.target.value,
                          ),
                        })
                      }
                    />
                    <span>dagen</span>
                  </div>
                </label>

                <label>
                  <span>Standaard valuta</span>
                  <select
                    value={settings.purchasing.defaultCurrency}
                    onChange={(event) =>
                      updateGroup("purchasing", {
                        defaultCurrency: event.target.value,
                      })
                    }
                  >
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                  </select>
                </label>
              </div>
            </section>
          )}
        </main>
      </section>

      <div className={styles.bottomBar}>
        <div>
          <strong>Bedrijfsinstellingen</strong>
          <span>
            Wijzigingen gelden pas nadat je ze hebt opgeslagen.
          </span>
        </div>

        <button
          type="button"
          className="button button-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Opslaan..." : "Opslaan"}
        </button>
      </div>
    </div>
  );
}
