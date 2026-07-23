import type {
  HelpArticle,
} from "@/lib/help-content";
import {
  findHelpArticles,
} from "@/lib/help-content";

type Snapshot = {
  generatedAt: string;
  totals: Record<string, number>;
  topCustomersYtd: Array<{
    customerName: string;
    revenue: number;
    invoiceCount: number;
  }>;
  overdueInvoices: Array<{
    invoiceNumber: string;
    customerName: string;
    dueDate: string;
    outstanding: number;
  }>;
  lowStock: Array<{
    productCode: string;
    productName: string;
    sku: string;
    color: string;
    size: string;
    stock: number;
    minimumStock: number;
  }>;
  openPurchaseOrders: Array<{
    orderNumber: string;
    supplierName: string;
    expectedDeliveryDate: string;
    status: string;
  }>;
};

function euro(value: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function articleAnswer(
  article: HelpArticle,
) {
  const steps = article.steps
    .map(
      (step, index) =>
        `${index + 1}. ${step.title}: ${step.description}`,
    )
    .join("\n");

  return {
    answer: `${article.summary}\n\n${steps}`,
    links: article.href
      ? [
          {
            label: "Open dit onderdeel",
            href: article.href,
          },
        ]
      : [],
    source:
      "STITCH-handleiding",
  };
}

export function answerLocally(
  question: string,
  snapshot: Snapshot,
) {
  const query = question
    .trim()
    .toLowerCase();

  if (
    query.includes("top") &&
    query.includes("klant")
  ) {
    const rows =
      snapshot.topCustomersYtd.length
        ? snapshot.topCustomersYtd
            .map(
              (item, index) =>
                `${index + 1}. ${item.customerName}: ${euro(item.revenue)} (${item.invoiceCount} facturen)`,
            )
            .join("\n")
        : "Er is nog geen geboekte omzet in het huidige kalenderjaar.";

    return {
      answer: `Topklanten op basis van geboekte omzet YTD:\n\n${rows}`,
      links: [
        {
          label: "Open Klanten",
          href: "/klanten",
        },
        {
          label: "Open Rapportages",
          href: "/rapportages",
        },
      ],
      source:
        "Actuele lokale STITCH-data",
    };
  }

  if (
    query.includes("vervallen") ||
    query.includes("te laat") &&
      query.includes("factuur")
  ) {
    const rows =
      snapshot.overdueInvoices.length
        ? snapshot.overdueInvoices
            .map(
              (invoice) =>
                `${invoice.invoiceNumber} · ${invoice.customerName} · vervaldatum ${invoice.dueDate} · ${euro(invoice.outstanding)}`,
            )
            .join("\n")
        : "Er zijn geen vervallen openstaande facturen.";

    return {
      answer: `${snapshot.totals.overdueInvoices || 0} vervallen facturen.\n\n${rows}`,
      links: [
        {
          label: "Open Debiteuren",
          href: "/debiteuren",
        },
      ],
      source:
        "Actuele lokale STITCH-data",
    };
  }

  if (
    query.includes("lage voorraad") ||
    query.includes("te weinig voorraad") ||
    query.includes("minimumvoorraad")
  ) {
    const rows =
      snapshot.lowStock.length
        ? snapshot.lowStock
            .slice(0, 15)
            .map(
              (item) =>
                `${item.productCode} · ${item.productName} · ${item.color}/${item.size} · voorraad ${item.stock}, minimum ${item.minimumStock}`,
            )
            .join("\n")
        : "Er zijn geen varianten op of onder de minimumvoorraad.";

    return {
      answer: `${snapshot.totals.lowStockVariants || 0} varianten staan op of onder de minimumvoorraad.\n\n${rows}`,
      links: [
        {
          label:
            "Open Voorraadoverzicht",
          href: "/voorraad",
        },
      ],
      source:
        "Actuele lokale STITCH-data",
    };
  }

  if (
    query.includes("omzet") &&
    (query.includes("ytd") ||
      query.includes("dit jaar") ||
      query.includes("jaar"))
  ) {
    return {
      answer: `De geboekte omzet YTD is ${euro(snapshot.totals.ytdRevenue || 0)} exclusief btw.`,
      links: [
        {
          label: "Open Rapportages",
          href: "/rapportages",
        },
      ],
      source:
        "Actuele lokale STITCH-data",
    };
  }

  if (
    query.includes("openstaande") &&
    query.includes("fact")
  ) {
    return {
      answer: `Er zijn ${snapshot.totals.openInvoices || 0} openstaande facturen met samen ${euro(snapshot.totals.openInvoiceAmount || 0)} openstaand.`,
      links: [
        {
          label: "Open Debiteuren",
          href: "/debiteuren",
        },
      ],
      source:
        "Actuele lokale STITCH-data",
    };
  }

  if (
    query.includes("inkooporder") &&
    (query.includes("open") ||
      query.includes("levering"))
  ) {
    const rows =
      snapshot.openPurchaseOrders.length
        ? snapshot.openPurchaseOrders
            .slice(0, 15)
            .map(
              (order) =>
                `${order.orderNumber} · ${order.supplierName} · verwacht ${order.expectedDeliveryDate} · ${order.status}`,
            )
            .join("\n")
        : "Er zijn geen open inkooporders.";

    return {
      answer: `${snapshot.totals.openPurchaseOrders || 0} open inkooporders.\n\n${rows}`,
      links: [
        {
          label: "Open Inkooporders",
          href: "/inkoop",
        },
      ],
      source:
        "Actuele lokale STITCH-data",
    };
  }

  const articles =
    findHelpArticles(question);

  if (articles.length) {
    return articleAnswer(articles[0]);
  }

  return {
    answer:
      "Ik kon hier nog geen betrouwbaar antwoord op vinden. Probeer de vraag anders te formuleren, bijvoorbeeld: “Hoe maak ik een creditfactuur?”, “Welke facturen zijn vervallen?” of “Welke artikelen hebben lage voorraad?”",
    links: [
      {
        label: "Open Helpcentrum",
        href: "/help",
      },
    ],
    source:
      "Lokale STITCH-assistent",
  };
}
