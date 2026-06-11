const CANONICAL: Record<string, string> = {
  "portfel pln": "Portfel PLN",
  portfel: "Portfel PLN",
  "portfel euro": "Portfel EURO",
  "permanent euro": "Permanent EURO",
  mbank: "mBank PLN",
};

export function resolveAccountName(name: string): string {
  if (!name) return "";
  const lower = name.trim().toLowerCase();
  return CANONICAL[lower] ?? name.trim();
}

export function matchAccountId(
  accounts: { id: string; name: string }[],
  name: string
): string {
  const resolved = resolveAccountName(name);
  if (!resolved) return "";
  const found = accounts.find(
    (a) => a.name.toLowerCase() === resolved.toLowerCase()
  );
  return found?.id ?? "";
}
