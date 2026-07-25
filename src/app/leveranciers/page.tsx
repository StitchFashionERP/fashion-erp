"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { createClient } from "@/lib/supabase/client";
import { SupplierAddressesTab } from "./components/SupplierAddressesTab";
import { SupplierContactsTab } from "./components/SupplierContactsTab";
import { SupplierFinancialTab } from "./components/SupplierFinancialTab";
import { SupplierGeneralTab } from "./components/SupplierGeneralTab";
import { SupplierNotesTab } from "./components/SupplierNotesTab";
import {
  createEmptyAddress,
  createEmptyPaymentTerm,
  createEmptySupplier,
  createSupplierId,
  supplierTabs,
  type Address,
  type Contact,
  type PaymentTerm,
  type Supplier,
  type SupplierNote,
  type SupplierTab,
} from "./components/types";
import styles from "./suppliers.module.css";

type SupplierRow = {
  id: string;
  organization_id: string;
  supplier_number: string;
  company_name: string;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  province?: string | null;
  country_code?: string | null;
  vat_number?: string | null;
  eori_number?: string | null;
  currency?: string | null;
  moq?: number | string | null;
  mov?: number | string | null;
  lead_time_days?: number | null;
  payment_terms?: unknown;
  notes?: string | null;
  active?: boolean | null;
};

type SupplierCrmData = {
  contacts?: Contact[];
  addresses?: Address[];
  notes?: SupplierNote[];
};

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function getErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (!isRecord(error)) {
    return fallback;
  }

  const parts = [
    typeof error.message === "string"
      ? error.message
      : "",
    typeof error.details === "string"
      ? error.details
      : "",
    typeof error.hint === "string"
      ? error.hint
      : "",
    typeof error.code === "string"
      ? `Code: ${error.code}`
      : "",
  ].filter(Boolean);

  return parts.length > 0
    ? parts.join(" — ")
    : fallback;
}

function parseCrmData(
  value: string | null | undefined,
): SupplierCrmData {
  if (!value) {
    return {};
  }

  try {
    const parsedValue: unknown = JSON.parse(value);

    if (!isRecord(parsedValue)) {
      return {};
    }

    return {
      contacts: Array.isArray(parsedValue.contacts)
        ? (parsedValue.contacts as Contact[])
        : undefined,
      addresses: Array.isArray(parsedValue.addresses)
        ? (parsedValue.addresses as Address[])
        : undefined,
      notes: Array.isArray(parsedValue.notes)
        ? (parsedValue.notes as SupplierNote[])
        : undefined,
    };
  } catch {
    return {};
  }
}

function serializeCrmData(
  supplier: Supplier,
): string {
  return JSON.stringify({
    version: 1,
    contacts: supplier.contacts,
    addresses: supplier.addresses,
    notes: supplier.notes,
  });
}

function parsePaymentTerms(
  value: unknown,
): PaymentTerm[] {
  if (!Array.isArray(value) || value.length === 0) {
    return [createEmptyPaymentTerm()];
  }

  return value as PaymentTerm[];
}

function parseSupplier(
  row: SupplierRow,
): Supplier {
  const crm = parseCrmData(row.notes);

  const legacyContacts: Contact[] = [];

  const fallbackAddresses: Address[] =
    row.address || row.city
      ? [
          {
            ...createEmptyAddress(),
            label: "Hoofdadres",
            type: "Bezoekadres",
            street: row.address ?? "",
            postalCode: row.postal_code ?? "",
            city: row.city ?? "",
            province: row.province ?? "",
            country:
              row.country_code ?? "Nederland",
            email: row.email ?? "",
            phone: row.phone ?? "",
            primary: true,
          },
        ]
      : [];

  const fallbackNotes: SupplierNote[] =
    row.notes && Object.keys(crm).length === 0
      ? [
          {
            id: createSupplierId("note"),
            text: row.notes,
            createdAt: new Date().toISOString(),
          },
        ]
      : [];

  return {
    id: row.id,
    organizationId: row.organization_id,
    supplierNumber: row.supplier_number,
    companyName: row.company_name,
    email: row.email ?? "",
    phone: row.phone ?? "",
    website: row.website ?? "",
    vatNumber: row.vat_number ?? "",
    eoriNumber: row.eori_number ?? "",
    currency: row.currency ?? "EUR",
    moq:
      row.moq === null ||
      row.moq === undefined
        ? null
        : Number(row.moq),
    mov:
      row.mov === null ||
      row.mov === undefined
        ? null
        : Number(row.mov),
    leadTimeDays:
      row.lead_time_days ?? null,
    contacts:
      crm.contacts ?? legacyContacts,
    addresses:
      crm.addresses ?? fallbackAddresses,
    paymentTerms: parsePaymentTerms(
      row.payment_terms,
    ),
    notes: crm.notes ?? fallbackNotes,
    status:
      row.active === false
        ? "Inactief"
        : "Actief",
  };
}

export default function SuppliersPage() {
  const supabase = useMemo(
    () => createClient(),
    [],
  );

  const [items, setItems] = useState<Supplier[]>([]);
  const [form, setForm] = useState<Supplier>(
    createEmptySupplier(),
  );
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] =
    useState<SupplierTab>("Algemeen");
  const [search, setSearch] = useState("");
  const [organizationId, setOrganizationId] =
    useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [newNote, setNewNote] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSuppliers() {
      try {
        setError("");

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          throw new Error(
            "Je bent niet ingelogd.",
          );
        }

        const {
          data: preferences,
          error: preferencesError,
        } = await supabase
          .from("user_preferences")
          .select("active_organization_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (preferencesError) {
          throw preferencesError;
        }

        let currentOrganizationId =
          preferences?.active_organization_id ?? "";

        if (!currentOrganizationId) {
          const {
            data: membership,
            error: membershipError,
          } = await supabase
            .from("organization_members")
            .select("organization_id")
            .eq("user_id", user.id)
            .eq("active", true)
            .limit(1)
            .maybeSingle();

          if (membershipError) {
            throw membershipError;
          }

          currentOrganizationId =
            membership?.organization_id ?? "";
        }

        if (!currentOrganizationId) {
          throw new Error(
            "Geen actieve organisatie gevonden.",
          );
        }

        const {
          data,
          error: loadError,
        } = await supabase
          .from("suppliers")
          .select("*")
          .eq(
            "organization_id",
            currentOrganizationId,
          )
          .order("company_name");

        if (loadError) {
          throw loadError;
        }

        if (!cancelled) {
          setOrganizationId(
            currentOrganizationId,
          );

          setItems(
            ((data ?? []) as SupplierRow[]).map(
              parseSupplier,
            ),
          );
        }
      } catch (caughtError) {
        if (!cancelled) {
          setError(
            getErrorMessage(
              caughtError,
              "Leveranciers laden is mislukt.",
            ),
          );
        }
      }
    }

    void loadSuppliers();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return items;
    }

    return items.filter((supplier) => {
      const searchableValues = [
        supplier.supplierNumber,
        supplier.companyName,
        supplier.email,
        supplier.phone,
        supplier.vatNumber,
        supplier.eoriNumber,
        ...supplier.contacts.flatMap(
          (contact) => [
            contact.firstName,
            contact.lastName,
            contact.role,
            contact.department,
            ...contact.emails,
            ...contact.phones,
          ],
        ),
        ...supplier.addresses.flatMap(
          (address) => [
            address.label,
            address.street,
            address.houseNumber,
            address.postalCode,
            address.city,
            address.province,
            address.country,
          ],
        ),
      ];

      return searchableValues
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [items, search]);

  function nextSupplierNumber(): string {
    const highestNumber = items.reduce(
      (highest, supplier) => {
        const match =
          supplier.supplierNumber.match(/\d+$/);

        const value = Number(
          match?.[0] ?? 0,
        );

        return Math.max(highest, value);
      },
      0,
    );

    return `LEV-${String(
      highestNumber + 1,
    ).padStart(4, "0")}`;
  }

  function startCreate() {
    setForm({
      ...createEmptySupplier(),
      supplierNumber: nextSupplierNumber(),
    });
    setActiveTab("Algemeen");
    setNewNote("");
    setMessage("");
    setError("");
    setShowForm(true);
  }

  function startEdit(supplier: Supplier) {
    setForm({
      ...supplier,
      contacts: supplier.contacts.map(
        (contact) => ({
          ...contact,
          emails: [...contact.emails],
          phones: [...contact.phones],
        }),
      ),
      addresses: supplier.addresses.map(
        (address) => ({
          ...address,
        }),
      ),
      paymentTerms:
        supplier.paymentTerms.map(
          (paymentTerm) => ({
            ...paymentTerm,
          }),
        ),
      notes: supplier.notes.map((note) => ({
        ...note,
      })),
    });

    setActiveTab("Algemeen");
    setNewNote("");
    setMessage("");
    setError("");
    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function closeForm() {
    setShowForm(false);
    setForm(createEmptySupplier());
    setActiveTab("Algemeen");
    setNewNote("");
    setError("");
  }

  async function saveSupplier() {
    try {
      setError("");
      setMessage("");

      if (!organizationId) {
        throw new Error(
          "Geen actieve organisatie gevonden.",
        );
      }

      if (!form.companyName.trim()) {
        throw new Error(
          "Vul een bedrijfsnaam in.",
        );
      }

      const paymentTotal =
        form.paymentTerms.reduce(
          (total, paymentTerm) =>
            total +
            Number(
              paymentTerm.percentage || 0,
            ),
          0,
        );

      if (
        form.paymentTerms.length > 0 &&
        Math.abs(paymentTotal - 100) > 0.01
      ) {
        throw new Error(
          `Betaalafspraken moeten samen 100% zijn. Nu ${paymentTotal}%.`,
        );
      }

      const primaryAddress =
        form.addresses.find(
          (address) => address.primary,
        ) ?? form.addresses[0];

      const primaryContact =
        form.contacts.find(
          (contact) => contact.primary,
        ) ?? form.contacts[0];

      const supplierNumber =
        form.supplierNumber.trim() ||
        nextSupplierNumber();

      const email =
        primaryContact?.emails.find(
          (value) => value.trim(),
        )?.trim() ??
        form.email.trim();

      const phone =
        primaryContact?.phones.find(
          (value) => value.trim(),
        )?.trim() ??
        form.phone.trim();

      const payload = {
        organization_id: organizationId,
        supplier_number: supplierNumber,
        company_name:
          form.companyName.trim(),
        email,
        phone,
        website: form.website.trim(),
        address: [
          primaryAddress?.street,
          primaryAddress?.houseNumber,
        ]
          .filter(Boolean)
          .join(" ")
          .trim(),
        postal_code:
          primaryAddress?.postalCode.trim() ??
          "",
        city:
          primaryAddress?.city.trim() ?? "",
        province:
          primaryAddress?.province.trim() ??
          "",
        country_code:
          primaryAddress?.country.trim() ||
          "Nederland",
        vat_number:
          form.vatNumber.trim().toUpperCase(),
        eori_number:
          form.eoriNumber.trim().toUpperCase(),
        currency: form.currency,
        moq: form.moq,
        mov: form.mov,
        lead_time_days: form.leadTimeDays,
        payment_terms: form.paymentTerms,
        notes: serializeCrmData(form),
        active: form.status === "Actief",
      };

      const result = form.id
        ? await supabase
            .from("suppliers")
            .update(payload)
            .eq("id", form.id)
            .eq(
              "organization_id",
              organizationId,
            )
            .select("*")
            .single()
        : await supabase
            .from("suppliers")
            .insert(payload)
            .select("*")
            .single();

      if (result.error) {
        throw result.error;
      }

      if (!result.data) {
        throw new Error(
          "De leverancier is niet teruggekomen uit de database.",
        );
      }

      const savedSupplier = parseSupplier(
        result.data as SupplierRow,
      );

      setItems((currentItems) => {
        if (form.id) {
          return currentItems.map(
            (supplier) =>
              supplier.id === form.id
                ? savedSupplier
                : supplier,
          );
        }

        return [...currentItems, savedSupplier].sort(
          (firstSupplier, secondSupplier) =>
            firstSupplier.companyName.localeCompare(
              secondSupplier.companyName,
              "nl-NL",
            ),
        );
      });

      setForm(savedSupplier);
      setMessage("Leverancier opgeslagen.");
      setShowForm(false);
    } catch (caughtError) {
      setError(
        getErrorMessage(
          caughtError,
          "Leverancier opslaan is mislukt.",
        ),
      );
    }
  }

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Inkoop"
        title="Leveranciers"
        description="Complete leverancierskaarten met contacten, adressen, afspraken en notities."
        action={
          <button
            type="button"
            className="button button-primary"
            onClick={startCreate}
          >
            + Leverancier
          </button>
        }
      />

      {message && (
        <div className={styles.success}>
          {message}
        </div>
      )}

      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}

      {showForm && (
        <section
          className={`content-card ${styles.card}`}
        >
          <div className={styles.header}>
            <div>
              <small>
                {form.supplierNumber ||
                  "Nieuwe leverancier"}
              </small>

              <h2>
                {form.companyName ||
                  "Nieuwe leverancier"}
              </h2>
            </div>

            <button
              type="button"
              className="button button-secondary"
              onClick={closeForm}
            >
              Sluiten
            </button>
          </div>

          <div className={styles.tabs}>
            {supplierTabs.map((tab) => (
              <button
                key={tab}
                type="button"
                className={
                  activeTab === tab
                    ? styles.active
                    : ""
                }
                onClick={() =>
                  setActiveTab(tab)
                }
              >
                {tab}
              </button>
            ))}
          </div>

          <div className={styles.section}>
            {activeTab === "Algemeen" && (
              <SupplierGeneralTab
                supplier={form}
                setSupplier={setForm}
              />
            )}

            {activeTab ===
              "Contactpersonen" && (
              <SupplierContactsTab
                supplier={form}
                setSupplier={setForm}
              />
            )}

            {activeTab === "Adressen" && (
              <SupplierAddressesTab
                supplier={form}
                setSupplier={setForm}
              />
            )}

            {activeTab === "Financieel" && (
              <SupplierFinancialTab
                supplier={form}
                setSupplier={setForm}
              />
            )}

            {activeTab === "Notities" && (
              <SupplierNotesTab
                supplier={form}
                setSupplier={setForm}
                newNote={newNote}
                setNewNote={setNewNote}
              />
            )}
          </div>

          <div className={styles.footer}>
            <button
              type="button"
              className="button button-secondary"
              onClick={closeForm}
            >
              Annuleren
            </button>

            <button
              type="button"
              className="button button-primary"
              onClick={() => {
                void saveSupplier();
              }}
            >
              Leverancier opslaan
            </button>
          </div>
        </section>
      )}

      <section className="content-card">
        <div className="content-card-toolbar">
          <div className="table-search">
            <span>⌕</span>

            <input
              type="search"
              value={search}
              placeholder="Zoek leverancier, contact of adres."
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nummer</th>
                <th>Leverancier</th>
                <th>Contact</th>
                <th>Plaats</th>
                <th>BTW-nummer</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {filteredItems.map(
                (supplier) => {
                  const primaryContact =
                    supplier.contacts.find(
                      (contact) =>
                        contact.primary,
                    ) ??
                    supplier.contacts[0];

                  const primaryAddress =
                    supplier.addresses.find(
                      (address) =>
                        address.primary,
                    ) ??
                    supplier.addresses[0];

                  return (
                    <tr key={supplier.id}>
                      <td>
                        {
                          supplier.supplierNumber
                        }
                      </td>

                      <td className="table-primary">
                        {supplier.companyName}
                      </td>

                      <td>
                        {primaryContact?.emails.find(
                          Boolean,
                        ) ||
                          supplier.email ||
                          "—"}
                      </td>

                      <td>
                        {primaryAddress?.city ||
                          "—"}
                      </td>

                      <td>
                        {supplier.vatNumber ||
                          "—"}
                      </td>

                      <td>
                        <StatusBadge
                          label={
                            supplier.status
                          }
                        />
                      </td>

                      <td>
                        <button
                          type="button"
                          className={styles.link}
                          onClick={() =>
                            startEdit(supplier)
                          }
                        >
                          Bewerken
                        </button>
                      </td>
                    </tr>
                  );
                },
              )}
            </tbody>
          </table>
        </div>

        {filteredItems.length === 0 && (
          <div className={styles.emptyState}>
            Geen leveranciers gevonden.
          </div>
        )}
      </section>
    </div>
  );
}