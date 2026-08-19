import type { InvoiceLine } from "@/lib/invoices";

export type InvoiceArticleBlock = {
  productCode: string;
  productName: string;
  color: string;
  sizes: string[];
  quantities: Record<string, number>;
  total: number;
  unitPrice: number;
  lineTotal: number;
};

function normalizeSize(size: string) {
  return size || "—";
}

function getSortedSizes(values: string[]) {
  return [...new Set(values)]
    .filter(Boolean)
    .sort((a, b) =>
      a.localeCompare(b, "nl"),
    );
}

export function groupInvoiceLines(
  lines: InvoiceLine[],
): InvoiceArticleBlock[] {
  const groups = new Map<string, InvoiceLine[]>();

  lines.forEach((line) => {
    const key = [
      line.productCode,
      line.productName,
      line.color,
    ].join("::");

    const current = groups.get(key) ?? [];
    current.push(line);
    groups.set(key, current);
  });

  return Array.from(groups.values()).map(
    (items) => {
      const first = items[0];

      const sizes = getSortedSizes(
        items.map(
          (line) => line.size,
        ),
      );

      const quantities: Record<string, number> = {};

      sizes.forEach((size) => {
        quantities[size] = 0;
      });

      items.forEach((line) => {
        const size = normalizeSize(line.size);
        quantities[size] =
          (quantities[size] ?? 0) +
          line.quantity;
      });

      return {
        productCode:
          first.productCode,
        productName:
          first.productName,
        color:
          first.color,
        sizes,
        quantities,
        total: items.reduce(
          (sum, line) =>
            sum + line.quantity,
          0,
        ),
        unitPrice:
          first.unitPrice,
        lineTotal:
          items.reduce(
            (sum, line) =>
              sum + line.lineSubtotal,
            0,
          ),
      };
    },
  );
}
