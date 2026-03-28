"use client";

type OverviewKpiStripProps = {
  trackedTargets: number;
  critical: number;
  warning: number;
  stable: number;
  liveStreams: number;
};

export function OverviewKpiStrip({ trackedTargets, critical, warning, stable, liveStreams }: OverviewKpiStripProps) {
  const cards = [
    { label: "Tracked Targets", value: trackedTargets, copy: "active monitoring", tone: "text-[#63ddd3]" },
    { label: "Critical", value: critical, copy: "targets", tone: "text-rose-300" },
    { label: "Warning", value: warning, copy: "targets", tone: "text-amber-200" },
    { label: "Stable", value: stable, copy: "targets", tone: "text-emerald-300" },
    { label: "Streaming", value: liveStreams, copy: "active runs", tone: "text-sky-300" },
  ];

  return (
    <div className="grid gap-3 xl:grid-cols-5">
      {cards.map((card) => (
        <section key={card.label} className="dashboard-card rounded-[1.45rem] px-4 py-3.5">
          <p className="text-[0.68rem] uppercase tracking-[0.24em] text-slate-500">{card.label}</p>
          <p className={`mt-3 text-[1.65rem] font-semibold leading-none ${card.tone}`}>{card.value}</p>
          <p className="mt-1.5 text-[0.82rem] text-slate-400">{card.copy}</p>
        </section>
      ))}
    </div>
  );
}
