/**
 * Mapowanie nazw kont na domeny banków / instytucji (favicony).
 * Brak dopasowania → null → ikona fallback w UI.
 */

export interface InstitutionMatch {
  domain: string;
  label: string;
}

const INSTITUTION_RULES: { pattern: RegExp; domain: string; label: string }[] = [
  { pattern: /\bmbank\b|dm\s*mbank/i, domain: "mbank.pl", label: "mBank" },
  { pattern: /\bing\b/i, domain: "ing.pl", label: "ING" },
  { pattern: /\balior\b/i, domain: "aliorbank.pl", label: "Alior Bank" },
  { pattern: /\brevolut\b/i, domain: "revolut.com", label: "Revolut" },
  { pattern: /\bagricole\b|credit\s*agricole/i, domain: "credit-agricole.pl", label: "Credit Agricole" },
  { pattern: /\bnest\b/i, domain: "nestbank.pl", label: "Nest Bank" },
  { pattern: /\bvelo\b/i, domain: "velobank.pl", label: "VeloBank" },
  { pattern: /\bpekao\b/i, domain: "pekao.com.pl", label: "PEKAO" },
  { pattern: /\bpko\b|\bbp\b/i, domain: "pkobp.pl", label: "PKO BP" },
  { pattern: /\bsantander\b/i, domain: "santander.pl", label: "Santander" },
  { pattern: /\bmillennium\b/i, domain: "millennium.pl", label: "Millennium" },
  { pattern: /\bbos\b/i, domain: "bosbank.pl", label: "BOŚ" },
  { pattern: /\bxtb\b/i, domain: "xtb.com", label: "XTB" },
  { pattern: /\bn26\b/i, domain: "n26.com", label: "N26" },
  { pattern: /\bbnp\b/i, domain: "bnpparibas.pl", label: "BNP Paribas" },
  { pattern: /\blego\b/i, domain: "legobank.pl", label: "Lego Bank" },
  { pattern: /\bmultibank\b/i, domain: "multibank.pl", label: "MultiBank" },
  { pattern: /\bpzu\b/i, domain: "pzu.pl", label: "PZU" },
  { pattern: /\bobligac/i, domain: "obligacjeskarbowe.pl", label: "Obligacje" },
];

export function resolveInstitution(accountName: string): InstitutionMatch | null {
  const name = accountName.trim();
  if (!name) return null;
  for (const rule of INSTITUTION_RULES) {
    if (rule.pattern.test(name)) {
      return { domain: rule.domain, label: rule.label };
    }
  }
  return null;
}

/** Publiczny URL favicony (Google S2) — bez wysyłania danych użytkownika. */
export function faviconUrl(domain: string, size = 64): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`;
}
