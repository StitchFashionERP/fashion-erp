"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import {
  createEmailAccount,
  documentTypeOptions,
  getCommunicationSettings,
  saveCommunicationSettings,
  type CommunicationDocumentType,
  type CommunicationSettings,
  type CompanyEmailAccount,
} from "@/lib/communication-settings";
import styles from "./communication-settings.module.css";

type Section = "accounts" | "documents";

const variableOptions = [
  "{{recipient_name}}",
  "{{customer_name}}",
  "{{supplier_name}}",
  "{{document_number}}",
  "{{order_number}}",
  "{{invoice_number}}",
  "{{company_name}}",
  "{{sender_name}}",
];

export default function CommunicationSettingsPage() {
  const [settings, setSettings] = useState<CommunicationSettings | null>(null);
  const [section, setSection] = useState<Section>("accounts");
  const [selectedDocument, setSelectedDocument] =
    useState<CommunicationDocumentType>("SALES_ORDER_CONFIRMATION");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSettings(getCommunicationSettings());
  }, []);

  const activeAccounts = useMemo(
    () => settings?.accounts.filter((account) => account.active) || [],
    [settings],
  );

  if (!settings) {
    return <section className="content-card">Communicatie-instellingen laden...</section>;
  }

  const documentSetting = settings.documents.find(
    (item) => item.documentType === selectedDocument,
  );

  function updateAccount(id: string, changes: Partial<CompanyEmailAccount>) {
    setSettings((current) =>
      current
        ? {
            ...current,
            accounts: current.accounts.map((account) =>
              account.id === id ? { ...account, ...changes } : account,
            ),
          }
        : current,
    );
    setSaved(false);
  }

  function addAccount() {
    setSettings((current) =>
      current
        ? { ...current, accounts: [...current.accounts, createEmailAccount()] }
        : current,
    );
    setSaved(false);
  }

  function removeAccount(id: string) {
    const account = settings!.accounts.find((item) => item.id === id);
    if (!account) return;

    if (!window.confirm(`E-mailaccount ${account.email || account.name || "zonder naam"} verwijderen?`)) {
      return;
    }

    setSettings((current) =>
      current
        ? {
            accounts: current.accounts.filter((item) => item.id !== id),
            documents: current.documents.map((document) =>
              document.senderEmailAccountId === id
                ? { ...document, senderEmailAccountId: "" }
                : document,
            ),
          }
        : current,
    );
    setSaved(false);
  }

  function updateDocument(changes: Partial<NonNullable<typeof documentSetting>>) {
    setSettings((current) =>
      current
        ? {
            ...current,
            documents: current.documents.map((document) =>
              document.documentType === selectedDocument
                ? { ...document, ...changes }
                : document,
            ),
          }
        : current,
    );
    setSaved(false);
  }

  function handleSave() {
    const invalid = settings!.accounts.find(
      (account) => account.active && (!account.name.trim() || !account.email.trim()),
    );

    if (invalid) {
      window.alert("Vul voor elk actief e-mailaccount een naam en e-mailadres in.");
      return;
    }

    setSettings(saveCommunicationSettings(settings!));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div>
      <div className={styles.breadcrumb}>
        <Link href="/instellingen">Instellingen</Link>
        <span>›</span>
        <span>Communicatie</span>
      </div>

      <PageHeader
        eyebrow="Bedrijfsinstellingen"
        title="E-mail & documenten"
        description="Beheer eigen afzenderadressen en koppel ze aan offertes, orders, pakbonnen, facturen en inkoopdocumenten."
        action={
          <button className="button button-primary" type="button" onClick={handleSave}>
            {saved ? "Opgeslagen ✓" : "Wijzigingen opslaan"}
          </button>
        }
      />

      <div className={styles.layout}>
        <aside className={`content-card ${styles.sidebar}`}>
          <button
            type="button"
            className={section === "accounts" ? styles.activeNav : styles.navButton}
            onClick={() => setSection("accounts")}
          >
            <strong>E-mailaccounts</strong>
            <span>Eigen afzenderadressen</span>
          </button>
          <button
            type="button"
            className={section === "documents" ? styles.activeNav : styles.navButton}
            onClick={() => setSection("documents")}
          >
            <strong>Documentkoppelingen</strong>
            <span>Afzender, onderwerp en tekst</span>
          </button>
        </aside>

        <main className={styles.content}>
          {section === "accounts" ? (
            <section className="content-card">
              <div className={styles.sectionHeader}>
                <div>
                  <h2>E-mailaccounts</h2>
                  <p>Voeg alle eigen e-mailadressen toe die STiTch als afzender mag gebruiken.</p>
                </div>
                <button className="button button-secondary" type="button" onClick={addAccount}>
                  + E-mailaccount
                </button>
              </div>

              {settings.accounts.length === 0 ? (
                <div className={styles.emptyState}>
                  <strong>Nog geen e-mailaccounts toegevoegd</strong>
                  <p>Voeg bijvoorbeeld orders@, facturen@ of inkoop@ toe.</p>
                  <button className="button button-primary" type="button" onClick={addAccount}>
                    Eerste e-mailaccount toevoegen
                  </button>
                </div>
              ) : (
                <div className={styles.accountList}>
                  {settings.accounts.map((account, index) => (
                    <article key={account.id} className={styles.accountCard}>
                      <div className={styles.accountTitle}>
                        <div>
                          <span className={styles.accountNumber}>Account {index + 1}</span>
                          <strong>{account.name || account.email || "Nieuw e-mailaccount"}</strong>
                        </div>
                        <div className={styles.accountActions}>
                          <label className={styles.toggleLabel}>
                            <input
                              type="checkbox"
                              checked={account.active}
                              onChange={(event) => updateAccount(account.id, { active: event.target.checked })}
                            />
                            Actief
                          </label>
                          <button className={styles.deleteButton} type="button" onClick={() => removeAccount(account.id)}>
                            Verwijderen
                          </button>
                        </div>
                      </div>

                      <div className={styles.formGrid}>
                        <label>
                          <span>Naam afzender *</span>
                          <input
                            value={account.name}
                            onChange={(event) => updateAccount(account.id, { name: event.target.value })}
                            placeholder="Bijv. Finance of STiTch Sales"
                          />
                        </label>
                        <label>
                          <span>E-mailadres *</span>
                          <input
                            type="email"
                            value={account.email}
                            onChange={(event) => updateAccount(account.id, { email: event.target.value })}
                            placeholder="facturen@bedrijf.nl"
                          />
                        </label>
                        <label className={styles.fullWidth}>
                          <span>Antwoordadres</span>
                          <input
                            type="email"
                            value={account.replyTo}
                            onChange={(event) => updateAccount(account.id, { replyTo: event.target.value })}
                            placeholder="Leeg laten om hetzelfde adres te gebruiken"
                          />
                        </label>
                        <label className={styles.fullWidth}>
                          <span>Handtekening</span>
                          <textarea
                            rows={5}
                            value={account.signature}
                            onChange={(event) => updateAccount(account.id, { signature: event.target.value })}
                            placeholder={"Met vriendelijke groet,\nFinance\nBedrijfsnaam"}
                          />
                        </label>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          ) : (
            <section className="content-card">
              <div className={styles.sectionHeader}>
                <div>
                  <h2>Documentkoppelingen</h2>
                  <p>Bepaal per document welk eigen adres en welke standaardtekst wordt gebruikt.</p>
                </div>
              </div>

              <div className={styles.documentLayout}>
                <div className={styles.documentList}>
                  {documentTypeOptions.map((option) => {
                    const linked = settings.documents.find(
                      (item) => item.documentType === option.value,
                    );
                    const account = settings.accounts.find(
                      (item) => item.id === linked?.senderEmailAccountId,
                    );

                    return (
                      <button
                        type="button"
                        key={option.value}
                        className={selectedDocument === option.value ? styles.activeDocument : styles.documentButton}
                        onClick={() => setSelectedDocument(option.value)}
                      >
                        <strong>{option.label}</strong>
                        <span>{account?.email || "Nog geen afzender"}</span>
                      </button>
                    );
                  })}
                </div>

                {documentSetting ? (
                  <div className={styles.documentEditor}>
                    <div className={styles.editorHeading}>
                      <div>
                        <span>Documentinstelling</span>
                        <h3>{documentTypeOptions.find((item) => item.value === selectedDocument)?.label}</h3>
                      </div>
                      <label className={styles.toggleLabel}>
                        <input
                          type="checkbox"
                          checked={documentSetting.includePdf}
                          onChange={(event) => updateDocument({ includePdf: event.target.checked })}
                        />
                        PDF meesturen
                      </label>
                    </div>

                    <div className={styles.formGrid}>
                      <label className={styles.fullWidth}>
                        <span>Standaard afzender</span>
                        <select
                          value={documentSetting.senderEmailAccountId}
                          onChange={(event) => updateDocument({ senderEmailAccountId: event.target.value })}
                        >
                          <option value="">Selecteer een e-mailaccount</option>
                          {activeAccounts.map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.name} — {account.email}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>Standaard CC</span>
                        <input
                          value={documentSetting.cc}
                          onChange={(event) => updateDocument({ cc: event.target.value })}
                          placeholder="Meerdere adressen scheiden met komma's"
                        />
                      </label>
                      <label>
                        <span>Standaard BCC</span>
                        <input
                          value={documentSetting.bcc}
                          onChange={(event) => updateDocument({ bcc: event.target.value })}
                          placeholder="Bijv. archief@bedrijf.nl"
                        />
                      </label>
                      <label className={styles.fullWidth}>
                        <span>Onderwerp</span>
                        <input
                          value={documentSetting.subject}
                          onChange={(event) => updateDocument({ subject: event.target.value })}
                        />
                      </label>
                      <label className={styles.fullWidth}>
                        <span>E-mailtekst</span>
                        <textarea
                          rows={10}
                          value={documentSetting.message}
                          onChange={(event) => updateDocument({ message: event.target.value })}
                        />
                      </label>
                    </div>

                    <div className={styles.variables}>
                      <strong>Beschikbare variabelen</strong>
                      <div>
                        {variableOptions.map((variable) => (
                          <code key={variable}>{variable}</code>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
