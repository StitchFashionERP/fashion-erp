type Row = Record<string, string | number>;

function u16(view: DataView, offset: number) { return view.getUint16(offset, true); }
function u32(view: DataView, offset: number) { return view.getUint32(offset, true); }

async function inflateRaw(data: Uint8Array) {
  const copy = new Uint8Array(data);
  const stream = new Blob([copy.buffer]).stream().pipeThrough(
    new DecompressionStream("deflate-raw"),
  );
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function unzip(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  let eocd = bytes.length - 22;
  while (eocd >= 0 && u32(view, eocd) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error("Ongeldig XLSX-bestand");

  const count = u16(view, eocd + 10);
  let cursor = u32(view, eocd + 16);
  const files = new Map<string, Uint8Array>();

  for (let index = 0; index < count; index++) {
    if (u32(view, cursor) !== 0x02014b50) throw new Error("Ongeldige ZIP-index");
    const method = u16(view, cursor + 10);
    const compressedSize = u32(view, cursor + 20);
    const nameLength = u16(view, cursor + 28);
    const extraLength = u16(view, cursor + 30);
    const commentLength = u16(view, cursor + 32);
    const localOffset = u32(view, cursor + 42);
    const name = new TextDecoder().decode(bytes.slice(cursor + 46, cursor + 46 + nameLength));

    const localNameLength = u16(view, localOffset + 26);
    const localExtraLength = u16(view, localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.slice(dataStart, dataStart + compressedSize);
    const content = method === 0 ? compressed : method === 8 ? await inflateRaw(compressed) : null;
    if (content) files.set(name, content);
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return files;
}

function text(files: Map<string, Uint8Array>, path: string) {
  const value = files.get(path);
  if (!value) return "";
  return new TextDecoder().decode(value);
}

function parseXml(xml: string) {
  return new DOMParser().parseFromString(xml, "application/xml");
}

function columnIndex(reference: string) {
  const letters = reference.replace(/\d/g, "");
  let result = 0;
  for (const letter of letters) result = result * 26 + letter.charCodeAt(0) - 64;
  return result - 1;
}

export async function parseXlsx(buffer: ArrayBuffer): Promise<Row[]> {
  const files = await unzip(buffer);
  const sharedXml = text(files, "xl/sharedStrings.xml");
  const shared = sharedXml
    ? Array.from(parseXml(sharedXml).getElementsByTagName("si")).map((node) =>
        Array.from(node.getElementsByTagName("t")).map((part) => part.textContent ?? "").join(""),
      )
    : [];

  const workbook = parseXml(text(files, "xl/workbook.xml"));
  const firstSheet = workbook.getElementsByTagName("sheet")[0];
  const relationId = firstSheet?.getAttribute("r:id") ?? "rId1";
  const relations = parseXml(text(files, "xl/_rels/workbook.xml.rels"));
  const relation = Array.from(relations.getElementsByTagName("Relationship")).find(
    (item) => item.getAttribute("Id") === relationId,
  );
  const target = relation?.getAttribute("Target") ?? "worksheets/sheet1.xml";
  const path = target.startsWith("/") ? target.slice(1) : `xl/${target.replace(/^\.\//, "")}`;
  const sheet = parseXml(text(files, path));
  const rows = Array.from(sheet.getElementsByTagName("row")).map((rowNode) => {
    const values: Array<string | number> = [];
    Array.from(rowNode.getElementsByTagName("c")).forEach((cell) => {
      const index = columnIndex(cell.getAttribute("r") ?? "A1");
      const type = cell.getAttribute("t");
      const raw = cell.getElementsByTagName("v")[0]?.textContent ?? "";
      const inline = cell.getElementsByTagName("t")[0]?.textContent ?? "";
      let value: string | number = type === "s" ? shared[Number(raw)] ?? "" : type === "inlineStr" ? inline : raw;
      if (type !== "s" && type !== "inlineStr" && raw !== "" && Number.isFinite(Number(raw))) value = Number(raw);
      values[index] = value;
    });
    return values;
  });

  const headers = (rows.shift() ?? []).map((value) => String(value ?? "").trim());
  return rows
    .filter((row) => row.some((value) => String(value ?? "").trim() !== ""))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])));
}

export function parseCsv(content: string): Row[] {
  const lines = content.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return [];
  const delimiter = lines[0].includes(";") ? ";" : ",";
  const split = (line: string) => {
    const values: string[] = [];
    let current = "";
    let quoted = false;
    for (let index = 0; index < line.length; index++) {
      const char = line[index];
      if (char === '"' && line[index + 1] === '"') { current += '"'; index++; }
      else if (char === '"') quoted = !quoted;
      else if (char === delimiter && !quoted) { values.push(current.trim()); current = ""; }
      else current += char;
    }
    values.push(current.trim());
    return values;
  };
  const headers = split(lines[0]);
  return lines.slice(1).map((line) => Object.fromEntries(headers.map((header, index) => [header, split(line)[index] ?? ""])));
}
