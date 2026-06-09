export function GoalProgress() {
  const current = 847_320;
  const target = 1_000_000;
  const pct = Math.round((current / target) * 100);

  return (
    <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-primary">Cel</p>
          <h3 className="mt-1 font-semibold text-foreground">1 000 000 zł aktywów płynnych</h3>
          <p className="text-xs text-muted">Termin: czerwiec 2029</p>
        </div>
        <span className="rounded-full bg-primary px-3 py-1 text-sm font-bold text-white">{pct}%</span>
      </div>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/80">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-sm text-muted">
        <span className="font-semibold text-foreground">{current.toLocaleString("pl-PL")} zł</span>
        {" "}z {target.toLocaleString("pl-PL")} zł
      </p>
    </div>
  );
}
