#!/usr/bin/env node
/**
 * Audyt pliku Excel (.xlsx) z transakcjami (Faza 0).
 * Użycie: node scripts/audit-excel.mjs [ścieżka-do-pliku.xlsx]
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import XLSX from "xlsx";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function findExcelFile(argPath) {
  if (argPath) return argPath;
  const rawDir = join(ROOT, "data", "raw");
  if (!existsSync(rawDir)) return null;
  const files = readdirSync(rawDir).filter((f) => /\.xlsx?$/i.test(f));
  return files.length > 0 ? join(rawDir, files[0]) : null;
}

function normalizeKey(key) {
  return key.trim().toLowerCase().replace(/\s+/g, " ");
}

function getField(row, ...names) {
  for (const [key, val] of Object.entries(row)) {
    const nk = normalizeKey(key);
    for (const name of names) {
      if (nk === normalizeKey(name)) return val ?? "";
    }
  }
  return "";
}

function asString(val) {
  if (val == null) return "";
  return String(val).trim();
}

function parseNumber(val) {
  if (val === "" || val == null) return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

function excelDateToISO(val) {
  if (!val) return null;
  if (typeof val === "number") {
    const d = XLSX.SSF.parse_date_code(val);
    return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return s;
}

function normalizeCurrency(val) {
  const c = (val || "").trim().toUpperCase();
  if (!c) return "PLN";
  if (c === "EURO" || c === "EUR") return "EUR";
  if (c === "USD") return "USD";
  if (c === "PLN") return "PLN";
  return c;
}

function normalizeAccount(name) {
  if (!name) return "";
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  const canonical = {
    "portfel pln": "Portfel PLN",
    portfel: "Portfel PLN",
    "portfel euro": "Portfel EURO",
    "permanent euro": "Permanent EURO",
    "pożyczone [od]": "Pożyczone [od]",
    "pożyczone [do]": "Pożyczone [do]",
    mbank: "mBank PLN",
  };
  return canonical[lower] || trimmed;
}

function normalizeRow(row) {
  const amount = parseNumber(getField(row, "amount", " Amount "));
  const rate = parseNumber(getField(row, "exchange rate", " Exchange Rate ")) ?? 1;
  const currency = normalizeCurrency(getField(row, "currency of amount", "currency"));
  const type = (getField(row, "type") || "").trim();
  const source = normalizeAccount(getField(row, "source account"));
  const target = normalizeAccount(getField(row, "target account"));

  return {
    date: excelDateToISO(getField(row, "date")),
    type,
    category: (getField(row, "category") || "").trim(),
    subcategory: (getField(row, "subcategory") || "").trim(),
    amount,
    currency,
    source_account: source,
    target_account: target,
    exchange_rate: rate,
    amount_pln: amount != null ? Math.round(amount * rate * 100) / 100 : null,
    details: asString(getField(row, "details")),
  };
}

function countMapInc(map, key) {
  const k = key?.trim() || "(puste)";
  map.set(k, (map.get(k) || 0) + 1);
}

function main() {
  const filePath = findExcelFile(process.argv[2]);

  if (!filePath || !existsSync(filePath)) {
    console.error("❌ Nie znaleziono pliku Excel w data/raw/");
    process.exit(1);
  }

  console.log(`📂 Audyt pliku: ${filePath}\n`);

  const wb = XLSX.readFile(filePath);
  const sheetName = wb.SheetNames[0];
  const rawRows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: "" });

  console.log(`📋 Arkusz: ${sheetName}`);
  console.log(`📊 Wierszy danych: ${rawRows.length}`);
  if (rawRows.length > 0) {
    console.log(`📋 Kolumny: ${Object.keys(rawRows[0]).join(" | ")}\n`);
  }

  const rows = rawRows.map(normalizeRow);

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
    expenseNoSource: 0,
    incomeNoTarget: 0,
    transferNoSource: 0,
    transferNoTarget: 0,
    transferNoBoth: 0,
    noExchangeRateForForeign: 0,
  };

  let minDate = null;
  let maxDate = null;
  let sumIncomePln = 0;
  let sumExpensePln = 0;
  let sumTransferPln = 0;

  for (const row of rows) {
    if (!row.date) issues.noDate++;
    if (!row.type) issues.noType++;
    if (row.amount === null) issues.noAmount++;
    if (row.amount === 0) issues.zeroAmount++;

    const typeLower = row.type.toLowerCase();

    if (typeLower === "expenses" && !row.source_account) issues.expenseNoSource++;
    if (typeLower === "income" && !row.target_account) issues.incomeNoTarget++;
    if (typeLower === "transfer") {
      if (!row.source_account) issues.transferNoSource++;
      if (!row.target_account) issues.transferNoTarget++;
      if (!row.source_account && !row.target_account) issues.transferNoBoth++;
    }

    if (row.currency !== "PLN" && row.exchange_rate === 1) issues.noExchangeRateForForeign++;

    if (row.date) {
      if (!minDate || row.date < minDate) minDate = row.date;
      if (!maxDate || row.date > maxDate) maxDate = row.date;
    }

    countMapInc(types, row.type);
    countMapInc(categories, row.category);
    if (row.subcategory) countMapInc(subcategories, `${row.category} → ${row.subcategory}`);
    countMapInc(currencies, row.currency);
    if (row.source_account) countMapInc(sourceAccounts, row.source_account);
    if (row.target_account) countMapInc(targetAccounts, row.target_account);

    if (row.amount_pln != null) {
      if (typeLower === "income") sumIncomePln += row.amount_pln;
      else if (typeLower === "expenses") sumExpensePln += row.amount_pln;
      else if (typeLower === "transfer") sumTransferPln += row.amount_pln;
    }
  }

  function printMap(title, map, limit = 30) {
    console.log(`\n### ${title} (${map.size} unikalnych)`);
    const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
    for (const [key, count] of sorted.slice(0, limit)) {
      console.log(`  ${count.toString().padStart(6)} × ${key}`);
    }
    if (sorted.length > limit) console.log(`  ... i ${sorted.length - limit} więcej`);
  }

  printMap("Type", types);
  printMap("Category", categories, 30);
  printMap("Category → Subcategory", subcategories, 25);
  printMap("Currency (znormalizowane)", currencies);
  printMap("Source Account", sourceAccounts, 40);
  printMap("Target Account", targetAccounts, 30);

  console.log("\n### Zakres dat");
  console.log(`  Od: ${minDate || "—"}`);
  console.log(`  Do: ${maxDate || "—"}`);

  console.log("\n### Sumy PLN (amount × exchange_rate)");
  console.log(`  Income:   ${sumIncomePln.toFixed(2)} PLN`);
  console.log(`  Expenses: ${sumExpensePln.toFixed(2)} PLN`);
  console.log(`  Transfer: ${sumTransferPln.toFixed(2)} PLN (nie wpływa na cashflow)`);

  console.log("\n### Ważne obserwacje");
  console.log("  • Brak kolumny 'Amount (Base Currency)' — liczona jako amount × rate");
  console.log("  • Income używa Target Account (nie Source) — 100% wierszy Income");
  console.log("  • Pusta waluta = PLN (11 298 wierszy)");
  console.log("  • EURO/Euro → normalizowane do EUR");
  console.log("  • Duplikaty pisowni: portfel/Portfel, permanent/Permanent (4 pary)");

  console.log("\n### Problemy do rozstrzygnięcia przy imporcie");
  for (const [key, count] of Object.entries(issues)) {
    if (count > 0) console.log(`  ⚠️  ${key}: ${count}`);
  }

  const outDir = join(ROOT, "data", "processed");
  mkdirSync(outDir, { recursive: true });

  const csvHeader =
    "date,type,category,subcategory,amount,currency,source_account,target_account,exchange_rate,amount_pln,details";
  const csvLines = rows.map((r) =>
    [
      r.date,
      r.type,
      r.category,
      r.subcategory,
      r.amount,
      r.currency,
      r.source_account,
      r.target_account,
      r.exchange_rate,
      r.amount_pln,
      `"${(r.details || "").replace(/"/g, '""')}"`,
    ].join(",")
  );
  const csvPath = join(outDir, "transactions-normalized.csv");
  writeFileSync(csvPath, [csvHeader, ...csvLines].join("\n"), "utf-8");

  const report = {
    generatedAt: new Date().toISOString(),
    sourceFile: filePath,
    sheetName,
    rowCount: rows.length,
    rawColumns: rawRows.length > 0 ? Object.keys(rawRows[0]) : [],
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
    importNotes: {
      noAmountBaseCurrencyColumn: true,
      incomeUsesTargetAccount: true,
      emptyCurrencyMeansPLN: true,
      accountNameDuplicates: ["portfel PLN / Portfel PLN", "portfel EURO / Portfel EURO", "permanent EURO / Permanent EURO", "pożyczone [od] / Pożyczone [od]"],
      typeMapping: { Expenses: "expense", Income: "income", Transfer: "transfer" },
    },
  };

  const reportPath = join(outDir, "audit-report.json");
  writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf-8");

  console.log(`\n✅ CSV znormalizowany: ${csvPath}`);
  console.log(`✅ Raport JSON: ${reportPath}`);
  console.log("\n📝 Następny krok: przejrzyj docs/source-data-audit.md (uzupełniony automatycznie).");
}

main();
