"use client";

import type { Supplier, SetSupplier } from "./types";
import styles from "../suppliers.module.css";

type SupplierGeneralTabProps = {
  supplier: Supplier;
  setSupplier: SetSupplier;
};

export function SupplierGeneralTab({
  supplier,
  setSupplier,
}: SupplierGeneralTabProps) {
  function updateSupplier(
    changes: Partial<Supplier>,
  ) {
    setSupplier((currentSupplier) => ({
      ...currentSupplier,
      ...changes,
    }));
  }

  return (
    <div className={styles.tabContent}>
      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>
            Leveranciersnummer
          </span>

          <input
            className={styles.input}
            value={supplier.supplierNumber}
            placeholder="Wordt automatisch aangemaakt"
            onChange={(event) =>
              updateSupplier({
                supplierNumber:
                  event.target.value,
              })
            }
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>
            Bedrijfsnaam *
          </span>

          <input
            className={styles.input}
            value={supplier.companyName}
            onChange={(event) =>
              updateSupplier({
                companyName: event.target.value,
              })
            }
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>
            Algemeen e-mailadres
          </span>

          <input
            className={styles.input}
            type="email"
            value={supplier.email}
            onChange={(event) =>
              updateSupplier({
                email: event.target.value,
              })
            }
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>
            Algemeen telefoonnummer
          </span>

          <input
            className={styles.input}
            value={supplier.phone}
            onChange={(event) =>
              updateSupplier({
                phone: event.target.value,
              })
            }
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>
            Website
          </span>

          <input
            className={styles.input}
            type="url"
            value={supplier.website}
            placeholder="https://"
            onChange={(event) =>
              updateSupplier({
                website: event.target.value,
              })
            }
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>
            BTW-nummer
          </span>

          <input
            className={styles.input}
            value={supplier.vatNumber}
            onChange={(event) =>
              updateSupplier({
                vatNumber:
                  event.target.value.toUpperCase(),
              })
            }
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>
            EORI-nummer
          </span>

          <input
            className={styles.input}
            value={supplier.eoriNumber}
            onChange={(event) =>
              updateSupplier({
                eoriNumber:
                  event.target.value.toUpperCase(),
              })
            }
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>
            Valuta
          </span>

          <select
            className={styles.input}
            value={supplier.currency}
            onChange={(event) =>
              updateSupplier({
                currency: event.target.value,
              })
            }
          >
            <option value="EUR">EUR — Euro</option>
            <option value="GBP">
              GBP — Britse pond
            </option>
            <option value="USD">
              USD — Amerikaanse dollar
            </option>
            <option value="CHF">
              CHF — Zwitserse frank
            </option>
            <option value="SEK">
              SEK — Zweedse kroon
            </option>
            <option value="DKK">
              DKK — Deense kroon
            </option>
            <option value="NOK">
              NOK — Noorse kroon
            </option>
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>
            Status
          </span>

          <select
            className={styles.input}
            value={supplier.status}
            onChange={(event) =>
              updateSupplier({
                status: event.target.value as
                  | "Actief"
                  | "Inactief",
              })
            }
          >
            <option value="Actief">Actief</option>
            <option value="Inactief">
              Inactief
            </option>
          </select>
        </label>
      </div>
    </div>
  );
}