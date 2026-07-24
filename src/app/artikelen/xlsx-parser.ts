import * as XLSX from "xlsx";

export type ParsedSheet = {
  headers: string[];
  rows: Record<string, string | number>[];
};

function normalizeValue(value: unknown): string | number {
  if (typeof value === "number") return value;
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

export function parseCsv(text: string): ParsedSheet {
  const workbook = XLSX.read(text, {
    type: "string",
    raw: false,
  });

  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    return {
      headers: [],
      rows: [],
    };
  }

  return parseWorksheet(workbook.Sheets[sheetName]);
}

export async function parseXlsx(file: File): Promise<ParsedSheet> {
  const buffer = await file.arrayBuffer();

  const workbook = XLSX.read(buffer, {
    type: "array",
    raw: false,
  });

  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    return {
      headers: [],
      rows: [],
    };
  }

  return parseWorksheet(workbook.Sheets[sheetName]);
}

function parseWorksheet(sheet: XLSX.WorkSheet): ParsedSheet {
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  if (matrix.length === 0) {
    return {
      headers: [],
      rows: [],
    };
  }

  const headers = matrix[0].map((value, index) => {
    const header = String(value ?? "").trim();
    return header || `Kolom ${index + 1}`;
  });

  const rows = matrix
    .slice(1)
    .filter((row) =>
      row.some((value) => String(value ?? "").trim() !== ""),
    )
    .map((row) => {
      const parsedRow: Record<string, string | number> = {};

      headers.forEach((header, index) => {
        parsedRow[header] = normalizeValue(row[index]);
      });

      return parsedRow;
    });

  return {
    headers,
    rows,
  };
}