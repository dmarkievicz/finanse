import readXlsxFile from "read-excel-file/node";

/** Zgodne z docs/import-spec.md — kolejność kolumn bez nagłówka. */
export const POSITIONAL_HEADERS = [
  "Date",
  "Type",
  "Category",
  "_category_key",
  "Subcategory",
  " Amount ",
  "Currency of Amount",
  "Source Account",
  "Target Account",
  " Exchange Rate ",
  "_amount_pln",
  "Details",
] as const;

const HEADER_MARKERS = new Set([
  "date",
  "type",
  "category",
  "subcategory",
  "amount",
  "currency of amount",
  "source account",
  "target account",
  "exchange rate",
  "details",
]);

function normalizeHeader(cell: unknown): string {
  return String(cell ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeHeaderKey(cell: unknown): string {
  return normalizeHeader(cell).toLowerCase();
}

function looksLikeHeaderRow(row: unknown[]): boolean {
  if (!row?.length) return false;
  for (const cell of row) {
    if (HEADER_MARKERS.has(normalizeHeaderKey(cell))) return true;
  }
  return false;
}

function rowToObject(headers: string[], row: unknown[]): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  const len = Math.max(headers.length, row.length);
  for (let i = 0; i < len; i++) {
    const key = headers[i] || `col_${i}`;
    obj[key] = row[i] ?? "";
  }
  return obj;
}

function isNonEmptyRow(row: unknown[]): boolean {
  return row.some((cell) => cell != null && String(cell).trim() !== "");
}

export async function readExcelRowsFromBuffer(buffer: Buffer): Promise<Record<string, unknown>[]> {
  const matrix = await readXlsxFile(buffer);
  if (!matrix?.length) return [];

  const hasHeader = looksLikeHeaderRow(matrix[0]);
  const dataRows = hasHeader ? matrix.slice(1) : matrix;
  const headers = hasHeader
    ? matrix[0].map(normalizeHeader)
    : [...POSITIONAL_HEADERS];

  return dataRows.filter(isNonEmptyRow).map((row) => rowToObject(headers, row));
}
