"use client";

export type AppLanguage =
  | "nl"
  | "en"
  | "fr";

export type RelationLanguage =
  | "Nederlands"
  | "Engels"
  | "Frans";

const storageKey =
  "stitch-erp-app-language-v1";

export const languageChangedEvent =
  "stitch-app-language-changed";

export const relationLanguages: RelationLanguage[] =
  ["Nederlands", "Engels", "Frans"];

export function relationLanguageToCode(
  language?: RelationLanguage,
): AppLanguage {
  if (language === "Engels") {
    return "en";
  }

  if (language === "Frans") {
    return "fr";
  }

  return "nl";
}

export function getAppLanguage(): AppLanguage {
  if (typeof window === "undefined") {
    return "nl";
  }

  const value = window.localStorage.getItem(
    storageKey,
  );

  return value === "en" || value === "fr"
    ? value
    : "nl";
}

export function saveAppLanguage(
  language: AppLanguage,
) {
  window.localStorage.setItem(
    storageKey,
    language,
  );

  window.dispatchEvent(
    new CustomEvent(languageChangedEvent),
  );
}

const dictionary = {
  nl: {
    dashboard: "Dashboard",
    financial: "Financieel",
    sales: "Verkoop",
    inventory: "Voorraad",
    purchasing: "Inkoop",
    invoices: "Facturen",
    creditNotes: "Creditfacturen",
    debtors: "Debiteuren",
    customers: "Klanten",
    orders: "Orders",
    returns: "Retouren",
    warehouse: "Warehouse",
    products: "Artikelen",
    collections: "Collecties",
    purchaseOrders: "Inkooporders",
    receipts: "Ontvangsten",
    suppliers: "Leveranciers",
    supplyIntelligence: "Supply Intelligence",
    settings: "Bedrijfsinstellingen",
    search:
      "Zoek op klant, order, artikel, SKU of factuur...",
    administrator: "Beheerder",
  },
  en: {
    dashboard: "Dashboard",
    financial: "Financial",
    sales: "Sales",
    inventory: "Inventory",
    purchasing: "Purchasing",
    invoices: "Invoices",
    creditNotes: "Credit notes",
    debtors: "Accounts receivable",
    customers: "Customers",
    orders: "Orders",
    returns: "Returns",
    warehouse: "Warehouse",
    products: "Products",
    collections: "Collections",
    purchaseOrders: "Purchase orders",
    receipts: "Goods receipts",
    suppliers: "Suppliers",
    supplyIntelligence: "Supply Intelligence",
    settings: "Company settings",
    search:
      "Search customers, orders, products, SKUs or invoices...",
    administrator: "Administrator",
  },
  fr: {
    dashboard: "Tableau de bord",
    financial: "Finance",
    sales: "Ventes",
    inventory: "Stock",
    purchasing: "Achats",
    invoices: "Factures",
    creditNotes: "Avoirs",
    debtors: "Créances clients",
    customers: "Clients",
    orders: "Commandes",
    returns: "Retours",
    warehouse: "Entrepôt",
    products: "Articles",
    collections: "Collections",
    purchaseOrders: "Commandes d'achat",
    receipts: "Réceptions",
    suppliers: "Fournisseurs",
    supplyIntelligence: "Supply Intelligence",
    settings: "Paramètres de l'entreprise",
    search:
      "Rechercher un client, une commande, un article, un SKU ou une facture...",
    administrator: "Administrateur",
  },
} as const;

export type TranslationKey =
  keyof typeof dictionary.nl;

export function translate(
  key: TranslationKey,
  language: AppLanguage,
) {
  return dictionary[language][key];
}

export function getLocale(
  language: AppLanguage,
) {
  if (language === "en") {
    return "en-GB";
  }

  if (language === "fr") {
    return "fr-FR";
  }

  return "nl-NL";
}

export const documentTranslations = {
  nl: {
    invoice: "FACTUUR",
    creditNote: "CREDITFACTUUR",
    deliveryNote: "PAKBON",
    orderConfirmation: "ORDERBEVESTIGING",
    purchaseOrder: "INKOOPORDER",
    invoiceNumber: "Factuurnummer",
    creditNumber: "Creditnummer",
    date: "Datum",
    dueDate: "Vervaldatum",
    salesOrder: "Verkooporder",
    purchaseOrderNumber: "Inkooporder",
    customerNumber: "Debiteurnummer",
    supplierNumber: "Crediteurnummer",
    paymentCondition: "Betalingstermijn",
    status: "Status",
    vatCode: "BTW-code",
    originalInvoice: "Originele factuur",
    returnNumber: "Retour",
    quantity: "Aantal",
    subtotal: "Subtotaal",
    vat: "BTW",
    total: "Totaal",
    scanToPay: "SCAN OM TE BETALEN",
    creditOn: "CREDIT OP",
    regards: "Met vriendelijke groet",
  },
  en: {
    invoice: "INVOICE",
    creditNote: "CREDIT NOTE",
    deliveryNote: "DELIVERY NOTE",
    orderConfirmation: "ORDER CONFIRMATION",
    purchaseOrder: "PURCHASE ORDER",
    invoiceNumber: "Invoice number",
    creditNumber: "Credit note number",
    date: "Date",
    dueDate: "Due date",
    salesOrder: "Sales order",
    purchaseOrderNumber: "Purchase order",
    customerNumber: "Customer number",
    supplierNumber: "Supplier number",
    paymentCondition: "Payment terms",
    status: "Status",
    vatCode: "VAT code",
    originalInvoice: "Original invoice",
    returnNumber: "Return",
    quantity: "Quantity",
    subtotal: "Subtotal",
    vat: "VAT",
    total: "Total",
    scanToPay: "SCAN TO PAY",
    creditOn: "CREDIT FOR",
    regards: "Kind regards",
  },
  fr: {
    invoice: "FACTURE",
    creditNote: "AVOIR",
    deliveryNote: "BON DE LIVRAISON",
    orderConfirmation: "CONFIRMATION DE COMMANDE",
    purchaseOrder: "COMMANDE D'ACHAT",
    invoiceNumber: "Numéro de facture",
    creditNumber: "Numéro d'avoir",
    date: "Date",
    dueDate: "Date d'échéance",
    salesOrder: "Commande client",
    purchaseOrderNumber: "Commande d'achat",
    customerNumber: "Numéro client",
    supplierNumber: "Numéro fournisseur",
    paymentCondition: "Conditions de paiement",
    status: "Statut",
    vatCode: "Code TVA",
    originalInvoice: "Facture d'origine",
    returnNumber: "Retour",
    quantity: "Quantité",
    subtotal: "Sous-total",
    vat: "TVA",
    total: "Total",
    scanToPay: "SCANNER POUR PAYER",
    creditOn: "AVOIR SUR",
    regards: "Cordialement",
  },
} as const;
