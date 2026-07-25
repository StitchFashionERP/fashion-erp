"use client";

import styles from "../suppliers.module.css";
import {
  createEmptyAddress,
  supplierCountries,
  type Address,
  type AddressType,
  type SetSupplier,
  type Supplier,
} from "./types";

type Props = {
  supplier: Supplier;
  setSupplier: SetSupplier;
};

const addressTypes: AddressType[] = [
  "Bezoekadres",
  "Factuuradres",
  "Afleveradres",
  "Postadres",
  "Retouradres",
  "Overig",
];

export function SupplierAddressesTab({
  supplier,
  setSupplier,
}: Props) {
  function updateAddress(
    addressId: string,
    updater: (address: Address) => Address,
  ) {
    setSupplier((currentSupplier) => ({
      ...currentSupplier,
      addresses: currentSupplier.addresses.map((address) =>
        address.id === addressId ? updater(address) : address,
      ),
    }));
  }

  function addAddress() {
    setSupplier((currentSupplier) => ({
      ...currentSupplier,
      addresses: [
        ...currentSupplier.addresses,
        createEmptyAddress(),
      ],
    }));
  }

  function removeAddress(addressId: string) {
    setSupplier((currentSupplier) => ({
      ...currentSupplier,
      addresses: currentSupplier.addresses.filter(
        (address) => address.id !== addressId,
      ),
    }));
  }

  function setPrimaryAddress(
    addressId: string,
    primary: boolean,
  ) {
    setSupplier((currentSupplier) => ({
      ...currentSupplier,
      addresses: currentSupplier.addresses.map((address) => ({
        ...address,
        primary:
          address.id === addressId
            ? primary
            : primary
              ? false
              : address.primary,
      })),
    }));
  }

  return (
    <>
      <div className={styles.sectionHeader}>
        <div>
          <h3>Adressen</h3>
          <p>
            Beheer bezoek-, factuur-, lever- en retouradressen.
          </p>
        </div>

        <button
          type="button"
          className="button button-secondary"
          onClick={addAddress}
        >
          + Adres
        </button>
      </div>

      {supplier.addresses.length === 0 ? (
        <div className={styles.emptyState}>
          Nog geen adressen toegevoegd.
        </div>
      ) : (
        supplier.addresses.map((address, addressIndex) => (
          <section
            key={address.id}
            className={styles.card}
          >
            <div className={styles.sectionHeader}>
              <div>
                <h3>Adres {addressIndex + 1}</h3>

                {address.primary && (
                  <span>Primair adres</span>
                )}
              </div>

              <button
                type="button"
                className="button button-danger"
                onClick={() => removeAddress(address.id)}
              >
                Verwijderen
              </button>
            </div>

            <div className={styles.grid}>
              <label>
                <span>Naam of omschrijving</span>

                <input
                  value={address.label}
                  placeholder="Bijvoorbeeld magazijn Rotterdam"
                  onChange={(event) =>
                    updateAddress(address.id, (current) => ({
                      ...current,
                      label: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                <span>Adrestype</span>

                <select
                  value={address.type}
                  onChange={(event) =>
                    updateAddress(address.id, (current) => ({
                      ...current,
                      type: event.target.value as AddressType,
                    }))
                  }
                >
                  {addressTypes.map((addressType) => (
                    <option
                      key={addressType}
                      value={addressType}
                    >
                      {addressType}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Straat</span>

                <input
                  value={address.street}
                  onChange={(event) =>
                    updateAddress(address.id, (current) => ({
                      ...current,
                      street: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                <span>Huisnummer en toevoeging</span>

                <input
                  value={address.houseNumber}
                  onChange={(event) =>
                    updateAddress(address.id, (current) => ({
                      ...current,
                      houseNumber: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                <span>Postcode</span>

                <input
                  value={address.postalCode}
                  onChange={(event) =>
                    updateAddress(address.id, (current) => ({
                      ...current,
                      postalCode: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                <span>Plaats</span>

                <input
                  value={address.city}
                  onChange={(event) =>
                    updateAddress(address.id, (current) => ({
                      ...current,
                      city: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                <span>Provincie of regio</span>

                <input
                  value={address.province}
                  onChange={(event) =>
                    updateAddress(address.id, (current) => ({
                      ...current,
                      province: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                <span>Land</span>

                <select
                  value={address.country}
                  onChange={(event) =>
                    updateAddress(address.id, (current) => ({
                      ...current,
                      country: event.target.value,
                    }))
                  }
                >
                  {supplierCountries.map((country) => (
                    <option
                      key={country}
                      value={country}
                    >
                      {country}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>E-mailadres locatie</span>

                <input
                  type="email"
                  value={address.email}
                  onChange={(event) =>
                    updateAddress(address.id, (current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                <span>Telefoonnummer locatie</span>

                <input
                  type="tel"
                  value={address.phone}
                  onChange={(event) =>
                    updateAddress(address.id, (current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                />
              </label>
            </div>

            <label>
              <span>Leveringsinstructies</span>

              <textarea
                rows={4}
                value={address.instructions}
                placeholder="Bijvoorbeeld melden bij receptie of lossen aan achterzijde"
                onChange={(event) =>
                  updateAddress(address.id, (current) => ({
                    ...current,
                    instructions: event.target.value,
                  }))
                }
              />
            </label>

            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={address.primary}
                onChange={(event) =>
                  setPrimaryAddress(
                    address.id,
                    event.target.checked,
                  )
                }
              />

              <span>Instellen als primair adres</span>
            </label>
          </section>
        ))
      )}
    </>
  );
}