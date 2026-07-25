"use client";

import styles from "../suppliers.module.css";
import {
  createEmptyContact,
  type Contact,
  type SetSupplier,
  type Supplier,
} from "./types";

type Props = {
  supplier: Supplier;
  setSupplier: SetSupplier;
};

export function SupplierContactsTab({
  supplier,
  setSupplier,
}: Props) {
  function updateContact(
    contactId: string,
    updater: (contact: Contact) => Contact,
  ) {
    setSupplier((currentSupplier) => ({
      ...currentSupplier,
      contacts: currentSupplier.contacts.map((contact) =>
        contact.id === contactId ? updater(contact) : contact,
      ),
    }));
  }

  function addContact() {
    setSupplier((currentSupplier) => ({
      ...currentSupplier,
      contacts: [
        ...currentSupplier.contacts,
        createEmptyContact(),
      ],
    }));
  }

  function removeContact(contactId: string) {
    setSupplier((currentSupplier) => ({
      ...currentSupplier,
      contacts: currentSupplier.contacts.filter(
        (contact) => contact.id !== contactId,
      ),
    }));
  }

  function setPrimaryContact(contactId: string, primary: boolean) {
    setSupplier((currentSupplier) => ({
      ...currentSupplier,
      contacts: currentSupplier.contacts.map((contact) => ({
        ...contact,
        primary:
          contact.id === contactId ? primary : primary ? false : contact.primary,
      })),
    }));
  }

  function addEmail(contactId: string) {
    updateContact(contactId, (contact) => ({
      ...contact,
      emails: [...contact.emails, ""],
    }));
  }

  function updateEmail(
    contactId: string,
    emailIndex: number,
    value: string,
  ) {
    updateContact(contactId, (contact) => ({
      ...contact,
      emails: contact.emails.map((email, index) =>
        index === emailIndex ? value : email,
      ),
    }));
  }

  function removeEmail(contactId: string, emailIndex: number) {
    updateContact(contactId, (contact) => {
      const emails = contact.emails.filter(
        (_, index) => index !== emailIndex,
      );

      return {
        ...contact,
        emails: emails.length > 0 ? emails : [""],
      };
    });
  }

  function addPhone(contactId: string) {
    updateContact(contactId, (contact) => ({
      ...contact,
      phones: [...contact.phones, ""],
    }));
  }

  function updatePhone(
    contactId: string,
    phoneIndex: number,
    value: string,
  ) {
    updateContact(contactId, (contact) => ({
      ...contact,
      phones: contact.phones.map((phone, index) =>
        index === phoneIndex ? value : phone,
      ),
    }));
  }

  function removePhone(contactId: string, phoneIndex: number) {
    updateContact(contactId, (contact) => {
      const phones = contact.phones.filter(
        (_, index) => index !== phoneIndex,
      );

      return {
        ...contact,
        phones: phones.length > 0 ? phones : [""],
      };
    });
  }

  return (
    <>
      <div className={styles.sectionHeader}>
        <div>
          <h3>Contactpersonen</h3>
          <p>
            Beheer de contactpersonen en hun contactgegevens.
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

      {supplier.contacts.length === 0 ? (
        <div className={styles.emptyState}>
          Nog geen contactpersonen toegevoegd.
        </div>
      ) : (
        supplier.contacts.map((contact, contactIndex) => (
          <section
            key={contact.id}
            className={styles.card}
          >
            <div className={styles.sectionHeader}>
              <div>
                <h3>
                  Contactpersoon {contactIndex + 1}
                </h3>

                {contact.primary && (
                  <span>Primair contact</span>
                )}
              </div>

              <button
                type="button"
                className="button button-danger"
                onClick={() => removeContact(contact.id)}
              >
                Verwijderen
              </button>
            </div>

            <div className={styles.grid}>
              <label>
                <span>Voornaam</span>
                <input
                  value={contact.firstName}
                  onChange={(event) =>
                    updateContact(contact.id, (current) => ({
                      ...current,
                      firstName: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                <span>Achternaam</span>
                <input
                  value={contact.lastName}
                  onChange={(event) =>
                    updateContact(contact.id, (current) => ({
                      ...current,
                      lastName: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                <span>Functie</span>
                <input
                  value={contact.role}
                  onChange={(event) =>
                    updateContact(contact.id, (current) => ({
                      ...current,
                      role: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                <span>Afdeling</span>
                <input
                  value={contact.department}
                  onChange={(event) =>
                    updateContact(contact.id, (current) => ({
                      ...current,
                      department: event.target.value,
                    }))
                  }
                />
              </label>
            </div>

            <div>
              <div className={styles.sectionHeader}>
                <h3>E-mailadressen</h3>

                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => addEmail(contact.id)}
                >
                  + E-mailadres
                </button>
              </div>

              {contact.emails.map((email, emailIndex) => (
                <div
                  key={`${contact.id}-email-${emailIndex}`}
                  className={styles.inlineFields}
                >
                  <input
                    type="email"
                    value={email}
                    placeholder="naam@bedrijf.nl"
                    onChange={(event) =>
                      updateEmail(
                        contact.id,
                        emailIndex,
                        event.target.value,
                      )
                    }
                  />

                  <button
                    type="button"
                    className="button button-danger"
                    onClick={() =>
                      removeEmail(contact.id, emailIndex)
                    }
                  >
                    Verwijderen
                  </button>
                </div>
              ))}
            </div>

            <div>
              <div className={styles.sectionHeader}>
                <h3>Telefoonnummers</h3>

                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => addPhone(contact.id)}
                >
                  + Telefoonnummer
                </button>
              </div>

              {contact.phones.map((phone, phoneIndex) => (
                <div
                  key={`${contact.id}-phone-${phoneIndex}`}
                  className={styles.inlineFields}
                >
                  <input
                    type="tel"
                    value={phone}
                    placeholder="+31 6 12345678"
                    onChange={(event) =>
                      updatePhone(
                        contact.id,
                        phoneIndex,
                        event.target.value,
                      )
                    }
                  />

                  <button
                    type="button"
                    className="button button-danger"
                    onClick={() =>
                      removePhone(contact.id, phoneIndex)
                    }
                  >
                    Verwijderen
                  </button>
                </div>
              ))}
            </div>

            <label>
              <span>Notities</span>
              <textarea
                rows={4}
                value={contact.notes}
                onChange={(event) =>
                  updateContact(contact.id, (current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
              />
            </label>

            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={contact.primary}
                onChange={(event) =>
                  setPrimaryContact(
                    contact.id,
                    event.target.checked,
                  )
                }
              />

              <span>Instellen als primair contact</span>
            </label>
          </section>
        ))
      )}
    </>
  );
}