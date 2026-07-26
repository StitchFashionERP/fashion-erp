import * as XLSX from "xlsx";

type ParsedRow = Record<string, string | number>;

function normalizeCellValue(value: unknown): string | number {
  if (typeof value === "number") {
    return value;
  }

  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function normalizeRows(rows: Record<string, unknown>[]): ParsedRow[] {
  return rows
    .map((row) =>
      Object.fromEntries(
        Object.entries(row).map(([key, value]) => [
          String(key).trim(),
          normalizeCellValue(value),
        ]),
      ),
    )
    .filter((row) =>
      Object.values(row).some((value) => String(value).trim() !== ""),
    );
}

export async function parseXlsx(file: File): Promise<ParsedRow[]> {
  const buffer = await file.arrayBuffer();

  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: false,
    raw: true,
  });

  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    return [];
  }

  const sheet = workbook.Sheets[firstSheetName];

  if (!sheet) {
    return [];
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: true,
  });

  return normalizeRows(rows);
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      const nextCharacter = line[index + 1];

      if (quoted && nextCharacter === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }

      continue;
    }

    if (character === delimiter && !quoted) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += character;
  }

  values.push(current.trim());

  return values;
}

function detectDelimiter(headerLine: string): string {
  const delimiters = [",", ";", "\t"];

  return delimiters.reduce(
    (best, candidate) =>
      headerLine.split(candidate).length > headerLine.split(best).length
        ? candidate
        : best,
    ";",
  );
}

export function parseCsv(csvText: string): ParsedRow[] {
  const normalizedText = csvText
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();

  if (!normalizedText) {
    return [];
  }

  const lines = normalizedText
    .split("\n")
    .filter((line) => line.trim() !== "");

  if (lines.length < 2) {
    return [];
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseCsvLine(lines[0], delimiter).map((header) =>
    header.trim(),
  );

  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line, delimiter);

    return Object.fromEntries(
      headers.map((header, index) => [
        header,
        normalizeCellValue(values[index] ?? ""),
      ]),
    );
  });

  return normalizeRows(rows);
}
