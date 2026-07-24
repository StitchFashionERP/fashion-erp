export type CommunicationDocumentType =
  | "QUOTATION"
  | "SALES_ORDER_CONFIRMATION"
  | "PACKING_SLIP"
  | "INVOICE"
  | "CREDIT_NOTE"
  | "PAYMENT_REMINDER"
  | "PURCHASE_ORDER"
  | "GOODS_RECEIPT"
  | "RETURN"
  | "QUALITY";

export type CompanyEmailAccount = {
  id: string;
  name: string;
  email: string;
  replyTo: string;
  signature: string;
  active: boolean;
};

export type DocumentEmailSetting = {
  documentType: CommunicationDocumentType;
  senderEmailAccountId: string;
  subject: string;
  message: string;
  cc: string;
  bcc: string;
  includePdf: boolean;
};

export type CommunicationSettings = {
  accounts: CompanyEmailAccount[];
  documents: DocumentEmailSetting[];
};

export const communicationSettingsChangedEvent =
  "stitch-communication-settings-changed";

const storageKey = "stitch-communication-settings-v1";

export const documentTypeOptions: Array<{
  value: CommunicationDocumentType;
  label: string;
  description: string;
}> = [
  { value: "QUOTATION", label: "Offerte", description: "Verkoopofferte aan een klant" },
  { value: "SALES_ORDER_CONFIRMATION", label: "Orderbevestiging", description: "Bevestiging van een verkooporder" },
  { value: "PACKING_SLIP", label: "Pakbon", description: "Pakbon of leverdocument" },
  { value: "INVOICE", label: "Factuur", description: "Verkoopfactuur aan een klant" },
  { value: "CREDIT_NOTE", label: "Creditfactuur", description: "Creditnota aan een klant" },
  { value: "PAYMENT_REMINDER", label: "Betalingsherinnering", description: "Herinnering voor een openstaande factuur" },
  { value: "PURCHASE_ORDER", label: "Inkooporder", description: "Bestelling aan een leverancier" },
  { value: "GOODS_RECEIPT", label: "Goederenontvangst", description: "Bevestiging van ontvangen goederen" },
  { value: "RETURN", label: "Retour", description: "Retourmelding aan klant of leverancier" },
  { value: "QUALITY", label: "Kwaliteitsmelding", description: "Kwaliteitsvraag of klacht" },
];

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function defaultDocumentSetting(
  documentType: CommunicationDocumentType,
): DocumentEmailSetting {
  const option = documentTypeOptions.find((item) => item.value === documentType);
  const label = option?.label || "Document";

  return {
    documentType,
    senderEmailAccountId: "",
    subject: `${label} {{document_number}} - {{company_name}}`,
    message:
      `Beste {{recipient_name}},\n\nIn de bijlage vind je ${label.toLowerCase()} {{document_number}}.\n\nMet vriendelijke groet,\n{{sender_name}}`,
    cc: "",
    bcc: "",
    includePdf: true,
  };
}

export const defaultCommunicationSettings: CommunicationSettings = {
  accounts: [],
  documents: documentTypeOptions.map((option) =>
    defaultDocumentSetting(option.value),
  ),
};

function normalizeSettings(
  input: Partial<CommunicationSettings> | null | undefined,
): CommunicationSettings {
  const accounts = Array.isArray(input?.accounts)
    ? input!.accounts.map((account) => ({
        id: account.id || createId("mail"),
        name: account.name || "",
        email: account.email || "",
        replyTo: account.replyTo || "",
        signature: account.signature || "",
        active: account.active !== false,
      }))
    : [];

  const inputDocuments = Array.isArray(input?.documents)
    ? input!.documents
    : [];

  const documents = documentTypeOptions.map((option) => {
    const current = inputDocuments.find(
      (item) => item.documentType === option.value,
    );

    return {
      ...defaultDocumentSetting(option.value),
      ...current,
      documentType: option.value,
    };
  });

  return { accounts, documents };
}

export function getCommunicationSettings(): CommunicationSettings {
  if (typeof window === "undefined") {
    return defaultCommunicationSettings;
  }

  try {
    const stored = window.localStorage.getItem(storageKey);
    return stored
      ? normalizeSettings(JSON.parse(stored) as Partial<CommunicationSettings>)
      : defaultCommunicationSettings;
  } catch {
    return defaultCommunicationSettings;
  }
}

export function saveCommunicationSettings(
  settings: CommunicationSettings,
): CommunicationSettings {
  const normalized = normalizeSettings(settings);

  if (typeof window !== "undefined") {
    window.localStorage.setItem(storageKey, JSON.stringify(normalized));
    window.dispatchEvent(
      new CustomEvent(communicationSettingsChangedEvent, {
        detail: normalized,
      }),
    );
  }

  return normalized;
}

export function createEmailAccount(): CompanyEmailAccount {
  return {
    id: createId("mail"),
    name: "",
    email: "",
    replyTo: "",
    signature: "",
    active: true,
  };
}

export function getDocumentEmailSetting(
  documentType: CommunicationDocumentType,
): DocumentEmailSetting {
  return (
    getCommunicationSettings().documents.find(
      (item) => item.documentType === documentType,
    ) || defaultDocumentSetting(documentType)
  );
}

export function getEmailAccountById(
  accountId: string,
): CompanyEmailAccount | null {
  return (
    getCommunicationSettings().accounts.find(
      (account) => account.id === accountId,
    ) || null
  );
}
