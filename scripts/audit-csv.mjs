#!/usr/bin/env node
/**
 * Audyt pliku CSV z transakcjami (Faza 0).
 * Użycie: node scripts/audit-csv.mjs [ścieżka-do-pliku.csv]
 * Domyślnie: data/raw/transactions.csv
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// Oczekiwane nagłówki (elastyczne dopasowanie)
const COLUMN_ALIASES = {
  date: ["date", "data", "datum"],
  type: ["type", "typ"],
  category: ["category", "kategoria"],
  subcategory: ["subcategory", "podkategoria", "sub category"],
  amount: ["amount", "kwota"],
  currency: ["currency of amount", "currency", "waluta", "currency of amount "],
  sourceAccount: ["source account", "source_account", "konto źródłowe", "source"],
  targetAccount: ["target account", "target_account", "konto docelowe", "target"],
  exchangeRate: ["exchange rate", "exchange_rate", "kurs"],
  amountPln: ["amount (base currency)", "amount base currency", "amount_pln", "kwota pln"],
  details: ["details", "szczegóły", "opis", "description"],
};

function normalizeHeader(h) {
  return h.trim().toLowerCase().replace(/\s+/g, " ");
}

function findColumnIndex(headers, aliases) {
  const normalized = headers.map(normalizeHeader);
  for (const alias of aliases) {
    const idx = normalized.indexOf(alias);
    if (idx !== -1) return idx;
  }
  return -1;
}

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((ch === "," || ch === ";") && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function detectDelimiter(firstLine) {
  const commas = (firstLine.match(/,/g) || []).length;
  const semicolons = (firstLine.match(/;/g) || []).length;
  return semicolons > commas ? ";" : ",";
}

function parseCSV(content) {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const delimiter = detectDelimiter(lines[0]);
  const split = (line) => {
    if (delimiter === ";") {
      return parseCSVLine(line.replace(/;/g, ","));
    }
    return parseCSVLine(line);
  };

  const headers = split(lines[0]);
  const rows = lines.slice(1).map((line, i) => ({
    rowNumber: i + 2,
    values: split(line),
  }));

  return { headers, rows };
}

function countMapInc(map, key) {
  const k = key?.trim() || "(puste)";
  map.set(k, (map.get(k) || 0) + 1);
}

function parseNumber(val) {
  if (!val || !val.trim()) return null;
  const cleaned = val.trim().replace(/\s/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function findCsvFile(argPath) {
  if (argPath) return argPath;

  const defaultPath = join(ROOT, "data", "raw", "transactions.csv");
  if (existsSync(defaultPath)) return defaultPath;

  const rawDir = join(ROOT, "data", "raw");
  if (existsSync(rawDir)) {
    const csvs = readdirSync(rawDir).filter((f) => f.endsWith(".csv"));
    if (csvs.length > 0) return join(rawDir, csvs[0]);
  }

  return null;
}

function main() {
  const filePath = findCsvFile(process.argv[2]);

  if (!filePath || !existsSync(filePath)) {
    console.error("❌ Nie znaleziono pliku CSV.");
    console.error("");
    console.error("Eksportuj Excel do CSV UTF-8 i zapisz jako:");
    console.error("  data/raw/transactions.csv");
    console.error("");
    console.error("Następnie uruchom ponownie:");
    console.error("  node scripts/audit-csv.mjs");
    process.exit(1);
  }

  console.log(`📂 Audyt pliku: ${filePath}\n`);

  const content = readFileSync(filePath, "utf-8");
  const { headers, rows } = parseCSV(content);

  console.log(`📊 Wierszy danych: ${rows.length}`);
  console.log(`📋 Kolumny (${headers.length}): ${headers.join(" | ")}\n`);

  const col = {};
  for (const [key, aliases] of Object.entries(COLUMN_ALIASES)) {
    col[key] = findColumnIndex(headers, aliases);
  }

  const missing = Object.entries(col)
    .filter(([, idx]) => idx === -1)
    .map(([key]) => key);

  if (missing.length > 0) {
    console.log("⚠️  Nie rozpoznano kolumn:", missing.join(", "));
    console.log("   Sprawdź nagłówki w pliku CSV.\n");
  }

  const types = new Map();
  const categories = new Map();
  const subcategories = new Map();
  const currencies = new Map();
  const sourceAccounts = new Map();
  const targetAccounts = new Map();

  const issues = {
    noDate: 0,
    noType: 0,
    noAmount: 0,
    zeroAmount: 0,
    noCurrency: 0,
    noSourceAccount: 0,
    transferNoTarget: 0,
    plnMismatch: 0,
    noExchangeRate: 0,
  };

  let minDate = null;
  let maxDate = null;
  let sumIncomePln = 0;
  let sumExpensePln = 0;
  let sumTransferPln = 0;

  for (const row of rows) {
    const v = (key) => (col[key] >= 0 ? row.values[col[key]] || "" : "");

    const date = v("date");
    const type = v("type");
    const category = v("category");
    const subcategory = v("subcategory");
    const amount = parseNumber(v("amount"));
    const currency = v("currency").toUpperCase() || "(puste)";
    const source = v("sourceAccount");
    const target = v("targetAccount");
    const rate = parseNumber(v("exchangeRate"));
    const amountPln = parseNumber(v("amountPln"));

    if (!date) issues.noDate++;
    if (!type) issues.noType++;
    if (amount === null) issues.noAmount++;
    if (amount === 0) issues.zeroAmount++;
    if (!currency || currency === "(PUSTE)") issues.noCurrency++;
    if (!source) issues.noSourceAccount++;

    const typeLower = type.toLowerCase();
    if (typeLower.includes("transfer") && !target) issues.transferNoTarget++;

    if (currency !== "PLN" && rate === null) issues.noExchangeRate++;

    if (amount !== null && rate !== null && amountPln !== null) {
      const expected = Math.abs(amount) * rate;
      if (Math.abs(expected - Math.abs(amountPln)) > 0.05) issues.plnMismatch++;
    }

    if (date) {
      if (!minDate || date < minDate) minDate = date;
      if (!maxDate || date > maxDate) maxDate = date;
    }

    countMapInc(types, type);
    countMapInc(categories, category);
    if (subcategory) countMapInc(subcategories, `${category} → ${subcategory}`);
    countMapInc(currencies, currency);
    countMapInc(sourceAccounts, source);
    if (target) countMapInc(targetAccounts, target);

    if (amountPln !== null) {
      if (typeLower.includes("income") || typeLower.includes("przychód")) {
        sumIncomePln += Math.abs(amountPln);
      } else if (typeLower.includes("expense") || typeLower.includes("wydatek")) {
        sumExpensePln += Math.abs(amountPln);
      } else if (typeLower.includes("transfer") || typeLower.includes("przelew")) {
        sumTransferPln += Math.abs(amountPln);
      }
    }
  }

  function printMap(title, map, limit = 30) {
    console.log(`\n### ${title} (${map.size} unikalnych)`);
    const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
    for (const [key, count] of sorted.slice(0, limit)) {
      console.log(`  ${count.toString().padStart(6)} × ${key}`);
    }
    if (sorted.length > limit) {
      console.log(`  ... i ${sorted.length - limit} więcej`);
    }
  }

  printMap("Type", types);
  printMap("Category", categories);
  printMap("Category → Subcategory", subcategories, 40);
  printMap("Currency", currencies);
  printMap("Source Account", sourceAccounts);
  printMap("Target Account", targetAccounts);

  console.log("\n### Zakres dat");
  console.log(`  Od: ${minDate || "—"}`);
  console.log(`  Do: ${maxDate || "—"}`);

  console.log("\n### Sumy PLN (szacunkowe wg typu)");
  console.log(`  Income:   ${sumIncomePln.toFixed(2)} PLN`);
  console.log(`  Expense:  ${sumExpensePln.toFixed(2)} PLN`);
  console.log(`  Transfer: ${sumTransferPln.toFixed(2)} PLN (nie wpływa na cashflow)`);

  console.log("\n### Problemy");
  for (const [key, count] of Object.entries(issues)) {
    if (count > 0) console.log(`  ⚠️  ${key}: ${count}`);
  }
  if (Object.values(issues).every((c) => c === 0)) {
    console.log("  ✅ Brak oczywistych problemów");
  }

  const report = {
    generatedAt: new Date().toISOString(),
    file: filePath,
    rowCount: rows.length,
    columns: headers,
    columnMapping: col,
    missingColumns: missing,
    dateRange: { from: minDate, to: maxDate },
    totalsPln: { income: sumIncomePln, expense: sumExpensePln, transfer: sumTransferPln },
    uniqueCounts: {
      types: types.size,
      categories: categories.size,
      subcategories: subcategories.size,
      currencies: currencies.size,
      sourceAccounts: sourceAccounts.size,
      targetAccounts: targetAccounts.size,
    },
    types: Object.fromEntries(types),
    categories: Object.fromEntries(categories),
    currencies: Object.fromEntries(currencies),
    sourceAccounts: Object.fromEntries(sourceAccounts),
    targetAccounts: Object.fromEntries(targetAccounts),
    issues,
  };

  const outDir = join(ROOT, "data", "processed");
  mkdirSync(outDir, { recursive: true });
  const reportPath = join(outDir, "audit-report.json");
  writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf-8");

  console.log(`\n✅ Raport JSON: ${reportPath}`);
  console.log("\n📝 Następny krok: uzupełnij docs/source-data-audit.md na podstawie tego raportu.");
}

main();
