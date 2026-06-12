import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";
import { readExcelRows } from "./lib/excel-rows.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const rows = await readExcelRows(readFileSync(join(ROOT, "data/raw/Zeszyt1.xlsx")));

function getField(row, ...names) {
  for (const [key, val] of Object.entries(row)) {
    const nk = key.trim().toLowerCase().replace(/\s+/g, " ");
    for (const n of names) if (nk === n.trim().toLowerCase()) return val ?? "";
  }
  return "";
}

function norm(s) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function computeImportHash(row) {
  return createHash("sha256")
    .update(
      [
        row.date,
        row.type,
        row.amount,
        row.currency,
        row.source,
        row.target,
        row.details,
        row.category,
        row.subcategory,
      ]
        .map(norm)
        .join("|")
    )
    .digest("hex");
}

function parseRow(raw, i) {
  const amount = Number(getField(raw, "amount"));
  const type = String(getField(raw, "type")).trim();
  let date = getField(raw, "date");
  if (date instanceof Date) date = date.toISOString().slice(0, 10);
  else if (typeof date === "number") {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    date = new Date(epoch.getTime() + date * 86400000).toISOString().slice(0, 10);
  }
  return {
    row: i + 2,
    date,
    type,
    amount,
    currency: String(getField(raw, "currency of amount") || "PLN").trim(),
    source: String(getField(raw, "source account")).trim(),
    target: String(getField(raw, "target account")).trim(),
    details: String(getField(raw, "details")).trim(),
    category: String(getField(raw, "category")).trim(),
    subcategory: String(getField(raw, "subcategory")).trim(),
  };
}

const byHash = new Map();
for (let i = 0; i < rows.length; i++) {
  const r = parseRow(rows[i], i);
  if (!r.date || !r.type || !r.amount) continue;
  const h = computeImportHash(r);
  if (!byHash.has(h)) byHash.set(h, []);
  byHash.get(h).push(r);
}

let groups = 0;
let rowsLost = 0;
const examples = [];
for (const [, arr] of byHash) {
  if (arr.length > 1) {
    groups++;
    rowsLost += arr.length - 1;
    if (examples.length < 5) {
      examples.push(
        arr.map((x) => `w.${x.row} ${x.date} ${x.category}/${x.subcategory} ${x.amount}`).join(" | ")
      );
    }
  }
}

console.log({ collision_groups: groups, rows_lost_to_hash: rowsLost });
for (const ex of examples) console.log("Przykład:", ex);
