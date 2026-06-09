const allocation = [
  { name: "ETF", pct: 45, color: "#1e3a5f" },
  { name: "Obligacje", pct: 25, color: "#0d9488" },
  { name: "Złoto", pct: 15, color: "#f59e0b" },
  { name: "Lokaty", pct: 15, color: "#3b82f6" },
];

export function InvestmentsPanel() {
  return (
    <div className="rounded-2xl border border-border bg-gradient-to-br from-card to-amber-50/30 p-5 shadow-sm">
      <div className="mb-1 flex items-center gap-2">
        <span className="text-lg">📈</span>
        <h3 className="font-semibold text-foreground">Portfel inwestycyjny</h3>
      </div>
      <p className="mb-4 text-xs text-muted">Alokacja aktywów</p>
      <p className="text-3xl font-bold tracking-tight text-foreground">312 400 zł</p>
      <p className="mt-1 flex items-center gap-1 text-sm font-medium text-emerald-600">
        +8,1% YTD
      </p>
      <div className="mt-4 flex h-3 overflow-hidden rounded-full">
        {allocation.map((a) => (
          <div
            key={a.name}
            style={{ width: `${a.pct}%`, background: a.color }}
            title={`${a.name} ${a.pct}%`}
          />
        ))}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-2">
        {allocation.map((a) => (
          <li key={a.name} className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 rounded-full" style={{ background: a.color }} />
            <span className="text-muted">{a.name}</span>
            <span className="font-medium text-foreground">{a.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
