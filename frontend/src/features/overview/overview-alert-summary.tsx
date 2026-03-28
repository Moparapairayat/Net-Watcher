"use client";

type OverviewAlertSummaryProps = {
  critical: number;
  warning: number;
  stable: number;
};

export function OverviewAlertSummary({ critical, warning, stable }: OverviewAlertSummaryProps) {
  const peak = Math.max(critical, warning, stable, 1);
  const totalActive = critical + warning;

  const rows = [
    { label: "Critical", value: critical, bar: "bg-rose-400", tone: "text-rose-200" },
    { label: "Warning", value: warning, bar: "bg-amber-400", tone: "text-amber-200" },
    { label: "Stable", value: stable, bar: "bg-emerald-400", tone: "text-emerald-200" },
  ];

  return (
    <div className="dashboard-panel rounded-[1.5rem] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.68rem] uppercase tracking-[0.24em] text-slate-500">Incident Summary</p>
          <h3 className="mt-1.5 font-space text-[1.65rem] font-bold text-white">Alert Pressure</h3>
        </div>
        <span className={totalActive > 0 ? "dashboard-chip dashboard-chip-danger" : "dashboard-chip dashboard-chip-success"}>
          {totalActive > 0 ? `${totalActive} active` : "Clear"}
        </span>
      </div>

      <div className="mt-4 grid gap-3">
        {rows.map((row) => (
          <div key={row.label} className="grid gap-1.5">
            <div className="flex items-center justify-between gap-3">
              <span className={`text-[0.88rem] font-medium ${row.tone}`}>{row.label}</span>
              <span className="text-[0.88rem] font-semibold text-white">{row.value}</span>
            </div>
            <div className="h-2 rounded-full bg-white/6">
              <div className={`${row.bar} h-full rounded-full transition-all`} style={{ width: `${(row.value / peak) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
