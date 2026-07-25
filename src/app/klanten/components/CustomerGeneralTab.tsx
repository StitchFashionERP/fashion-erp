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

export type CustomerContact = {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  email: string;
  phone: string;
  isPrimary: boolean;
};

export type CustomerGeneralForm = {
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;

  street?: string;
  houseNumber?: string;
  houseNumberAddition?: string;
  postalCode?: string;
  city: string;
  country: string;

  invoiceStreet?: string;
  invoiceHouseNumber?: string;
  invoiceHouseNumberAddition?: string;
  invoicePostalCode?: string;
  invoiceCity?: string;
  invoiceCountry?: string;

  useDifferentDeliveryAddress?: boolean;
  deliveryStreet?: string;
  deliveryHouseNumber?: string;
  deliveryHouseNumberAddition?: string;
  deliveryPostalCode?: string;
  deliveryCity?: string;
  deliveryCountry?: string;

  contacts?: CustomerContact[];

  chamberOfCommerceNumber: string;
  customerType: CustomerType;
  vatNumber: string;
  vatNumberStatus: VatNumberStatus;
  transactionNature: "Goederen" | "Diensten";
  language: RelationLanguage;

  paymentDays?: string;
  paymentDiscountPercentage?: string;
  paymentDiscountDays?: string;
  discountPercentage?: string;
  priceListId?: string;
};

type CustomerGeneralTabProps = {
  form: CustomerGeneralForm;
  updateForm: (changes: Partial<CustomerGeneralForm>) => void;
};

function createContactId() {
  return `contact-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function CustomerGeneralTab({
  form,
  updateForm,
}: CustomerGeneralTabProps) {
  const isDutchCustomer = isNetherlands(form.country);
  const contacts = form.contacts ?? [];

  function addContact() {
    updateForm({
      contacts: [
        ...contacts,
        {
          id: createContactId(),
          firstName: "",
          lastName: "",
          jobTitle: "",
          email: "",
          phone: "",
          isPrimary: contacts.length === 0,
        },
      ],
    });
  }

  function updateContact(
    contactId: string,
    changes: Partial<CustomerContact>,
  ) {
    updateForm({
      contacts: contacts.map((contact) => {
        if (contact.id !== contactId) {
          return changes.isPrimary
            ? {
                ...contact,
                isPrimary: false,
              }
            : contact;
        }

        return {
          ...contact,
          ...changes,
        };
      }),
    });
  }

  function removeContact(contactId: string) {
    const nextContacts = contacts.filter(
      (contact) => contact.id !== contactId,
    );

    if (
      nextContacts.length > 0 &&
      !nextContacts.some((contact) => contact.isPrimary)
    ) {
      nextContacts[0] = {
        ...nextContacts[0],
        isPrimary: true,
      };
    }

    updateForm({
      contacts: nextContacts,
    });
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>
        <div>
          <h3>Algemene gegevens</h3>
          <p>
            Beheer de basisgegevens en algemene contactinformatie van deze
            klant.
          </p>
        </div>
      </div>

      <div className={styles.formGrid}>
        <label>
          <span>Bedrijfsnaam</span>
          <input
            value={form.companyName}
            onChange={(event) =>
              updateForm({
                companyName: event.target.value,
              })
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
          <span>Algemene contactpersoon</span>
          <input
            value={form.contactPerson}
            onChange={(event) =>
              updateForm({
                contactPerson: event.target.value,
              })
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
            onChange={(event) =>
              updateForm({
                email: event.target.value,
              })
            }
            placeholder="info@bedrijf.nl"
            autoComplete="email"
          />
        </label>

        <label>
          <span>Algemeen telefoonnummer</span>
          <input
            type="tel"
            value={form.phone}
            onChange={(event) =>
              updateForm({
                phone: event.target.value,
              })
            }
            placeholder="+31 20 000 00 00"
            autoComplete="tel"
          />
        </label>
      </div>

      <div className={styles.sectionTitle}>
        <div>
          <h3>Bezoekadres</h3>
          <p>
            Het primaire adres van de klant.
          </p>
        </div>
      </div>

      <div className={styles.formGrid}>
        <label>
          <span>Straat</span>
          <input
            value={form.street ?? ""}
            onChange={(event) =>
              updateForm({
                street: event.target.value,
              })
            }
            placeholder="Straatnaam"
            autoComplete="address-line1"
          />
        </label>

        <label>
          <span>Huisnummer</span>
          <input
            value={form.houseNumber ?? ""}
            onChange={(event) =>
              updateForm({
                houseNumber: event.target.value,
              })
            }
            placeholder="123"
          />
        </label>

        <label>
          <span>Toevoeging</span>
          <input
            value={form.houseNumberAddition ?? ""}
            onChange={(event) =>
              updateForm({
                houseNumberAddition: event.target.value,
              })
            }
            placeholder="A"
          />
        </label>

        <label>
          <span>Postcode</span>
          <input
            value={form.postalCode ?? ""}
            onChange={(event) =>
              updateForm({
                postalCode: event.target.value.toUpperCase(),
              })
            }
            placeholder="1234 AB"
            autoComplete="postal-code"
          />
        </label>

        <label>
          <span>Plaats</span>
          <input
            value={form.city}
            onChange={(event) =>
              updateForm({
                city: event.target.value,
              })
            }
            placeholder="Amsterdam"
            autoComplete="address-level2"
          />
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
      </div>

      <div className={styles.sectionTitle}>
        <div>
          <h3>Factuuradres</h3>
          <p>
            Laat deze velden leeg wanneer het factuuradres gelijk is aan het
            bezoekadres.
          </p>
        </div>
      </div>

      <div className={styles.formGrid}>
        <label>
          <span>Straat</span>
          <input
            value={form.invoiceStreet ?? ""}
            onChange={(event) =>
              updateForm({
                invoiceStreet: event.target.value,
              })
            }
            placeholder={form.street || "Straatnaam"}
          />
        </label>

        <label>
          <span>Huisnummer</span>
          <input
            value={form.invoiceHouseNumber ?? ""}
            onChange={(event) =>
              updateForm({
                invoiceHouseNumber: event.target.value,
              })
            }
            placeholder={form.houseNumber || "123"}
          />
        </label>

        <label>
          <span>Toevoeging</span>
          <input
            value={form.invoiceHouseNumberAddition ?? ""}
            onChange={(event) =>
              updateForm({
                invoiceHouseNumberAddition: event.target.value,
              })
            }
            placeholder={form.houseNumberAddition || "A"}
          />
        </label>

        <label>
          <span>Postcode</span>
          <input
            value={form.invoicePostalCode ?? ""}
            onChange={(event) =>
              updateForm({
                invoicePostalCode: event.target.value.toUpperCase(),
              })
            }
            placeholder={form.postalCode || "1234 AB"}
          />
        </label>

        <label>
          <span>Plaats</span>
          <input
            value={form.invoiceCity ?? ""}
            onChange={(event) =>
              updateForm({
                invoiceCity: event.target.value,
              })
            }
            placeholder={form.city || "Amsterdam"}
          />
        </label>

        <label>
          <span>Land</span>
          <select
            value={form.invoiceCountry ?? form.country}
            onChange={(event) =>
              updateForm({
                invoiceCountry: event.target.value,
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
      </div>

      <div className={styles.sectionTitle}>
        <div>
          <h3>Afleveradres</h3>
          <p>
            Leg een afwijkend standaard afleveradres vast.
          </p>
        </div>
      </div>

      <div className={styles.checks}>
        <label>
          <input
            type="checkbox"
            checked={form.useDifferentDeliveryAddress ?? false}
            onChange={(event) =>
              updateForm({
                useDifferentDeliveryAddress: event.target.checked,
              })
            }
          />

          Afwijkend afleveradres gebruiken
        </label>
      </div>

      {form.useDifferentDeliveryAddress && (
        <div className={styles.formGrid}>
          <label>
            <span>Straat</span>
            <input
              value={form.deliveryStreet ?? ""}
              onChange={(event) =>
                updateForm({
                  deliveryStreet: event.target.value,
                })
              }
              placeholder="Straatnaam"
            />
          </label>

          <label>
            <span>Huisnummer</span>
            <input
              value={form.deliveryHouseNumber ?? ""}
              onChange={(event) =>
                updateForm({
                  deliveryHouseNumber: event.target.value,
                })
              }
              placeholder="123"
            />
          </label>

          <label>
            <span>Toevoeging</span>
            <input
              value={form.deliveryHouseNumberAddition ?? ""}
              onChange={(event) =>
                updateForm({
                  deliveryHouseNumberAddition: event.target.value,
                })
              }
              placeholder="A"
            />
          </label>

          <label>
            <span>Postcode</span>
            <input
              value={form.deliveryPostalCode ?? ""}
              onChange={(event) =>
                updateForm({
                  deliveryPostalCode: event.target.value.toUpperCase(),
                })
              }
              placeholder="1234 AB"
            />
          </label>

          <label>
            <span>Plaats</span>
            <input
              value={form.deliveryCity ?? ""}
              onChange={(event) =>
                updateForm({
                  deliveryCity: event.target.value,
                })
              }
              placeholder="Amsterdam"
            />
          </label>

          <label>
            <span>Land</span>
            <select
              value={form.deliveryCountry ?? form.country}
              onChange={(event) =>
                updateForm({
                  deliveryCountry: event.target.value,
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
        </div>
      )}

      <div className={styles.sectionTitle}>
        <div>
          <h3>Contactpersonen</h3>
          <p>
            Voeg meerdere contactpersonen met eigen e-mailadres en
            telefoonnummer toe.
          </p>
        </div>

        <button
          type="button"
          className="button button-secondary"
          onClick={addContact}
        >
          + Contactpersoon
        </button>
      </div>

      {contacts.length === 0 ? (
        <div className={styles.empty}>
          Nog geen extra contactpersonen toegevoegd.
        </div>
      ) : (
        <div className={styles.cards}>
          {contacts.map((contact) => (
            <div key={contact.id} className={styles.editor}>
              <div className={styles.formGrid}>
                <label>
                  <span>Voornaam</span>
                  <input
                    value={contact.firstName}
                    onChange={(event) =>
                      updateContact(contact.id, {
                        firstName: event.target.value,
                      })
                    }
                    placeholder="Voornaam"
                  />
                </label>

                <label>
                  <span>Achternaam</span>
                  <input
                    value={contact.lastName}
                    onChange={(event) =>
                      updateContact(contact.id, {
                        lastName: event.target.value,
                      })
                    }
                    placeholder="Achternaam"
                  />
                </label>

                <label>
                  <span>Functie</span>
                  <input
                    value={contact.jobTitle}
                    onChange={(event) =>
                      updateContact(contact.id, {
                        jobTitle: event.target.value,
                      })
                    }
                    placeholder="Bijv. inkoper"
                  />
                </label>

                <label>
                  <span>E-mailadres</span>
                  <input
                    type="email"
                    value={contact.email}
                    onChange={(event) =>
                      updateContact(contact.id, {
                        email: event.target.value,
                      })
                    }
                    placeholder="naam@bedrijf.nl"
                  />
                </label>

                <label>
                  <span>Telefoonnummer</span>
                  <input
                    type="tel"
                    value={contact.phone}
                    onChange={(event) =>
                      updateContact(contact.id, {
                        phone: event.target.value,
                      })
                    }
                    placeholder="+31 6 00000000"
                  />
                </label>
              </div>

              <div className={styles.editorActions}>
                <label>
                  <input
                    type="checkbox"
                    checked={contact.isPrimary}
                    onChange={(event) =>
                      updateContact(contact.id, {
                        isPrimary: event.target.checked,
                      })
                    }
                  />

                  Primair contact
                </label>

                <button
                  type="button"
                  className={styles.deleteAction}
                  onClick={() => removeContact(contact.id)}
                >
                  Verwijderen
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={styles.sectionTitle}>
        <div>
          <h3>Fiscale gegevens</h3>
          <p>
            Leg het KvK-nummer en de btw-instellingen van de klant vast.
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
            placeholder={
              isDutchCustomer ? "NL123456789B01" : "Btw-nummer"
            }
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
            <option value="Niet gecontroleerd">
              Niet gecontroleerd
            </option>
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

      <div className={styles.sectionTitle}>
        <div>
          <h3>Financiële instellingen</h3>
          <p>
            Stel betaaltermijnen, kortingen en de standaardprijslijst in.
          </p>
        </div>
      </div>

      <div className={styles.formGrid}>
        <label>
          <span>Betaaltermijn in dagen</span>
          <input
            type="number"
            min={0}
            value={form.paymentDays ?? "30"}
            onChange={(event) =>
              updateForm({
                paymentDays: event.target.value,
              })
            }
          />
        </label>

        <label>
          <span>Standaardkorting (%)</span>
          <input
            inputMode="decimal"
            value={form.discountPercentage ?? "0"}
            onChange={(event) =>
              updateForm({
                discountPercentage: event.target.value,
              })
            }
          />
        </label>

        <label>
          <span>Betalingskorting (%)</span>
          <input
            inputMode="decimal"
            value={form.paymentDiscountPercentage ?? "0"}
            onChange={(event) =>
              updateForm({
                paymentDiscountPercentage: event.target.value,
              })
            }
          />
        </label>

        <label>
          <span>Betalingskorting binnen dagen</span>
          <input
            type="number"
            min={0}
            value={form.paymentDiscountDays ?? "0"}
            onChange={(event) =>
              updateForm({
                paymentDiscountDays: event.target.value,
              })
            }
          />
        </label>

        <label>
          <span>Prijslijst</span>
          <select
            value={form.priceListId ?? "price-list-standard"}
            onChange={(event) =>
              updateForm({
                priceListId: event.target.value,
              })
            }
          >
            <option value="price-list-standard">
              Standaardprijslijst
            </option>
          </select>
        </label>
      </div>
    </div>
  );
}