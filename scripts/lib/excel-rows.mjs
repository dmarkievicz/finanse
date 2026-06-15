import { readFile } from "fs/promises";
import { readExcelRowsFromBuffer, POSITIONAL_HEADERS } from "../../src/lib/import/excel-rows.ts";

export { POSITIONAL_HEADERS };

/** @param {Buffer | string} source — bufor lub ścieżka do pliku .xlsx */
export async function readExcelRows(source) {
  const buffer = Buffer.isBuffer(source) ? source : await readFile(source);
  return readExcelRowsFromBuffer(buffer);
}
