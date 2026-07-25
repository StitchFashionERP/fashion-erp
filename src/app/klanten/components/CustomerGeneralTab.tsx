"use client";

import {
  commonCountries,
  isNetherlands,
  viesCheckUrl,
  type CustomerType,
  type VatNumberStatus,
} from "@/lib/vat-engine";
import {
  relationLanguages,
  type RelationLanguage,
} from "@/lib/language";

import styles from "../customers.module.css";

export type CustomerGeneralForm = {
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  chamberOfCommerceNumber: string;
  customerType: CustomerType;
  vatNumber: string;
  vatNumberStatus: VatNumberStatus;
  transactionNature: "Goederen" | "Diensten";
  language: RelationLanguage;
};

type CustomerGeneralTabProps = {
  form: CustomerGeneralForm;
  updateForm: (changes: Partial<CustomerGeneralForm>) => void;
};

export function CustomerGeneralTab({
  form,
  updateForm,
}: CustomerGeneralTabProps) {
  const isDutchCustomer = isNetherlands(form.country);

  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>
        <div>
          <h3>Algemene gegevens</h3>
          <p>
            Beheer de basisgegevens, contactinformatie en fiscale instellingen
            van deze klant.
          </p>
        </div>
      </div>

      <div className={styles.formGrid}>
        <label>
          <span>Bedrijfsnaam</span>
          <input
            value={form.companyName}
            onChange={(event) =>
              updateForm({ companyName: event.target.value })
            }
            placeholder="Bedrijfsnaam"
            autoComplete="organization"
          />
        </label>

        <label>
          <span>Type klant</span>
          <select
            value={form.customerType}
            onChange={(event) =>
              updateForm({
                customerType: event.target.value as CustomerType,
              })
            }
          >
            <option value="Zakelijk">Zakelijk</option>
            <option value="Particulier">Particulier</option>
          </select>
        </label>

        <label>
          <span>Taal</span>
          <select
            value={form.language}
            onChange={(event) =>
              updateForm({
                language: event.target.value as RelationLanguage,
              })
            }
          >
            {relationLanguages.map((language) => (
              <option key={language} value={language}>
                {language}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Land</span>
          <select
            value={form.country}
            onChange={(event) =>
              updateForm({
                country: event.target.value,
                vatNumberStatus: "Niet gecontroleerd",
              })
            }
          >
            {commonCountries.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Algemene contactpersoon</span>
          <input
            value={form.contactPerson}
            onChange={(event) =>
              updateForm({ contactPerson: event.target.value })
            }
            placeholder="Voor- en achternaam"
            autoComplete="name"
          />
        </label>

        <label>
          <span>Algemeen e-mailadres</span>
          <input
            type="email"
            value={form.email}
            onChange={(event) => updateForm({ email: event.target.value })}
            placeholder="naam@bedrijf.nl"
            autoComplete="email"
          />
        </label>

        <label>
          <span>Algemeen telefoonnummer</span>
          <input
            type="tel"
            value={form.phone}
            onChange={(event) => updateForm({ phone: event.target.value })}
            placeholder="+31 20 000 00 00"
            autoComplete="tel"
          />
        </label>

        <label>
          <span>Plaats</span>
          <input
            value={form.city}
            onChange={(event) => updateForm({ city: event.target.value })}
            placeholder="Amsterdam"
            autoComplete="address-level2"
          />
        </label>
      </div>

      <div className={styles.sectionTitle}>
        <div>
          <h3>Fiscale gegevens</h3>
          <p>
            Leg het KvK-nummer en de btw-instellingen van de klant vast. Er is
            geen automatische KvK-koppeling.
          </p>
        </div>
      </div>

      <div className={styles.formGrid}>
        {isDutchCustomer && (
          <label>
            <span>KvK-nummer</span>
            <input
              inputMode="numeric"
              value={form.chamberOfCommerceNumber}
              onChange={(event) =>
                updateForm({
                  chamberOfCommerceNumber: event.target.value
                    .replace(/\D/g, "")
                    .slice(0, 8),
                })
              }
              placeholder="12345678"
            />
          </label>
        )}

        <label>
          <span>Btw-nummer</span>
          <input
            value={form.vatNumber}
            onChange={(event) =>
              updateForm({
                vatNumber: event.target.value.toUpperCase(),
                vatNumberStatus: "Niet gecontroleerd",
              })
            }
            placeholder={isDutchCustomer ? "NL123456789B01" : "Btw-nummer"}
            autoCapitalize="characters"
          />
        </label>

        <label>
          <span>Status btw-controle</span>
          <select
            value={form.vatNumberStatus}
            onChange={(event) =>
              updateForm({
                vatNumberStatus: event.target.value as VatNumberStatus,
              })
            }
          >
            <option value="Niet gecontroleerd">Niet gecontroleerd</option>
            <option value="Geldig">Geldig</option>
            <option value="Ongeldig">Ongeldig</option>
          </select>
        </label>

        <label>
          <span>Transactietype</span>
          <select
            value={form.transactionNature}
            onChange={(event) =>
              updateForm({
                transactionNature: event.target.value as
                  | "Goederen"
                  | "Diensten",
              })
            }
          >
            <option value="Goederen">Goederen</option>
            <option value="Diensten">Diensten</option>
          </select>
        </label>

        {!isDutchCustomer && (
          <div className={styles.viesAction}>
            <span>Europese btw-controle</span>

            <a
              className="button button-secondary"
              href={viesCheckUrl}
              target="_blank"
              rel="noreferrer"
            >
              Controleer via VIES ↗
            </a>
          </div>
        )}
      </div>
    </div>
  );
}