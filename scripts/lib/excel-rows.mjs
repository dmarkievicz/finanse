/**
 * Bezpieczny odczyt .xlsx (read-excel-file) → wiersze jak sheet_to_json.
 * Obsługuje pliki z nagłówkiem (Date, Type, …) oraz eksport bez wiersza nagłówka.
 */
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
];

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

function normalizeHeader(cell) {
  return String(cell ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeHeaderKey(cell) {
  return normalizeHeader(cell).toLowerCase();
}

function looksLikeHeaderRow(row) {
  if (!row?.length) return false;
  for (const cell of row) {
    const key = normalizeHeaderKey(cell);
    if (HEADER_MARKERS.has(key)) return true;
  }
  return false;
}

function rowToObject(headers, row) {
  const obj = {};
  const len = Math.max(headers.length, row.length);
  for (let i = 0; i < len; i++) {
    const key = headers[i] || `col_${i}`;
    obj[key] = row[i] ?? "";
  }
  return obj;
}

function isNonEmptyRow(row) {
  return row.some((cell) => cell != null && String(cell).trim() !== "");
}

/** @param {string | Buffer} input */
export async function readExcelRows(input) {
  const matrix = await readXlsxFile(input);
  if (!matrix?.length) return [];

  const hasHeader = looksLikeHeaderRow(matrix[0]);
  const headerRow = hasHeader ? matrix[0] : null;
  const dataRows = hasHeader ? matrix.slice(1) : matrix;
  const headers = hasHeader
    ? headerRow.map(normalizeHeader)
    : POSITIONAL_HEADERS;

  return dataRows.filter(isNonEmptyRow).map((row) => rowToObject(headers, row));
}
