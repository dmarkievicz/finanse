const accounts = [
  { name: "mBank PLN", value: 42_500, pct: 85 },
  { name: "Portfel PLN", value: 3_200, pct: 25 },
  { name: "Revolut EUR", value: 8_100, pct: 45, note: "≈ PLN" },
  { name: "LOKATY PLN", value: 95_000, pct: 100 },
  { name: "XTB", value: 31_200, pct: 70, note: "≈ PLN" },
];

export function AccountBalances() {
  const max = Math.max(...accounts.map((a) => a.value));

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="font-semibold text-foreground">Salda kont</h3>
        <p className="text-xs text-muted">Przeliczone na PLN</p>
      </div>
      <ul className="space-y-3">
        {accounts.map((a) => (
          <li key={a.name}>
            <div className="mb-1 flex justify-between text-sm">
              <span className="font-medium text-foreground">{a.name}</span>
              <span className="text-muted">
                {a.value.toLocaleString("pl-PL")} zł{a.note ? ` ${a.note}` : ""}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all"
                style={{ width: `${(a.value / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
