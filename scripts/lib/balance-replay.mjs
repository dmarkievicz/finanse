/**
 * Symulacja sald kont z wierszy Excela (ta sama logika co import).
 */

const CASH_ACCOUNT = "Gotówka PLN";

function signedAmountPln(amount, rate) {
  const abs = Math.round(Math.abs(amount) * rate * 100) / 100;
  return amount < 0 ? -abs : abs;
}

const TYPE_MAP = {
  expenses: "expense",
  income: "income",
  transfer: "transfer",
  exchange: "exchange",
  adjustment: "adjustment",
  przewalutowanie: "exchange",
  korekta: "adjustment",
};

export function normalizeAccount(name) {
  if (!name) return "";
  const lower = name.trim().toLowerCase();
  const canonical = {
    "portfel pln": "Portfel PLN",
    portfel: "Portfel PLN",
    "portfel euro": "Portfel EURO",
    "permanent euro": "Permanent EURO",
    "pożyczone [od]": "Pożyczone [od]",
    "pożyczone [do]": "Pożyczone [do]",
    mbank: "mBank PLN",
  };
  return canonical[lower] || name.trim();
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

function parseNumber(val) {
  if (val === "" || val == null) return null;
  const n = Number(val);
  return Number.isNaN(n) ? null : n;
}

function excelDateToISO(val) {
  if (!val) return null;
  if (val instanceof Date) {
    return val.toISOString().slice(0, 10);
  }
  if (typeof val === "number") {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(epoch.getTime() + val * 86400000);
    return d.toISOString().slice(0, 10);
  }
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return s;
}

export function normalizeRow(raw) {
  const amount = parseNumber(getField(raw, "amount", " Amount "));
  const rate = parseNumber(getField(raw, "exchange rate", " Exchange Rate ")) ?? 1;
  const currencyRaw = String(getField(raw, "currency of amount", "currency") || "")
    .trim()
    .toUpperCase();
  const currency = !currencyRaw
    ? "PLN"
    : currencyRaw === "EURO" || currencyRaw === "EUR"
      ? "EUR"
      : currencyRaw;
  const type = String(getField(raw, "type") || "").trim();

  return {
    date: excelDateToISO(getField(raw, "date")),
    type,
    type_lower: type.toLowerCase(),
    amount,
    currency,
    source_account: normalizeAccount(String(getField(raw, "source account") || "")),
    target_account: normalizeAccount(String(getField(raw, "target account") || "")),
    exchange_rate: rate,
  };
}

export function validateRow(row) {
  const issues = [];
  const txType = TYPE_MAP[row.type_lower];
  if (!row.date) issues.push("no_date");
  if (!row.type) issues.push("no_type");
  if (row.type && !txType) issues.push("unknown_type");
  if (row.amount === null) issues.push("no_amount");

  let needsReview = false;
  let useCashAccount = false;

  if (txType === "income" && !row.target_account) needsReview = true;
  if (txType === "expense" && !row.source_account) useCashAccount = true;
  if (txType === "transfer") {
    if (!row.source_account && !row.target_account) needsReview = true;
    else if (!row.source_account || !row.target_account) needsReview = true;
  }
  if (txType === "exchange") {
    if (!row.source_account || !row.target_account) needsReview = true;
  }
  if (txType === "adjustment") {
    if (!row.source_account && !row.target_account) needsReview = true;
  }

  return {
    txType,
    hasErrors: issues.length > 0,
    needsReview,
    useCashAccount,
    canCreateEntries: issues.length === 0 && !needsReview,
  };
}

/** @returns {{ account: string, amount_pln: number }[]} */
export function entriesFromRow(row, validation) {
  if (!validation.canCreateEntries || row.amount === null) return [];

  const abs = Math.abs(row.amount);
  const pln = Math.round(abs * row.exchange_rate * 100) / 100;
  const out = [];

  if (validation.txType === "income" && row.target_account) {
    out.push({ account: row.target_account, amount_pln: pln });
  } else if (validation.txType === "expense") {
    const acc = validation.useCashAccount ? CASH_ACCOUNT : row.source_account;
    if (acc) out.push({ account: acc, amount_pln: -pln });
  } else if (validation.txType === "transfer") {
    if (row.source_account) out.push({ account: row.source_account, amount_pln: -pln });
    if (row.target_account) out.push({ account: row.target_account, amount_pln: pln });
  } else if (validation.txType === "exchange") {
    if (row.source_account) {
      out.push({
        account: row.source_account,
        amount_pln: signedAmountPln(-abs, row.exchange_rate),
      });
    }
    if (row.target_account) {
      out.push({
        account: row.target_account,
        amount_pln: signedAmountPln(abs, row.exchange_rate),
      });
    }
  } else if (validation.txType === "adjustment") {
    const acc = row.target_account || row.source_account;
    if (acc) out.push({ account: acc, amount_pln: row.amount < 0 ? -pln : pln });
  }

  return out;
}

/** @param {Record<string, unknown>[]} rawRows */
export function replayBalancesFromExcel(rawRows) {
  const balances = new Map();

  for (const raw of rawRows) {
    const row = normalizeRow(raw);
    const validation = validateRow(row);
    for (const e of entriesFromRow(row, validation)) {
      balances.set(e.account, (balances.get(e.account) ?? 0) + e.amount_pln);
    }
  }

  return balances;
}
