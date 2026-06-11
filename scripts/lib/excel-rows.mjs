/**
 * Bezpieczny odczyt .xlsx (read-excel-file) → wiersze jak sheet_to_json.
 */
import readXlsxFile from "read-excel-file/node";

function normalizeHeader(cell) {
  return String(cell ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

/** @param {string | Buffer} input */
export async function readExcelRows(input) {
  const matrix = await readXlsxFile(input);
  if (!matrix?.length) return [];

  const [headerRow, ...dataRows] = matrix;
  const headers = headerRow.map(normalizeHeader);

  return dataRows
    .filter((row) => row.some((cell) => cell != null && String(cell).trim() !== ""))
    .map((row) => {
      const obj = {};
      for (let i = 0; i < headers.length; i++) {
        const key = headers[i] || `col_${i}`;
        obj[key] = row[i] ?? "";
      }
      return obj;
    });
}
