"use client";

import { OverviewDependencySnapshot } from "@/features/overview/overview-helpers";

type OverviewRuntimeDependencyPanelProps = {
  dependencies: OverviewDependencySnapshot[];
};

function dependencyTone(state: OverviewDependencySnapshot["state"]) {
  switch (state) {
    case "healthy":
      return {
        text: "text-emerald-300",
        bar: "bg-emerald-400",
      };
    case "degraded":
      return {
        text: "text-amber-200",
        bar: "bg-amber-300",
      };
    default:
      return {
        text: "text-slate-300",
        bar: "bg-slate-500",
      };
  }
}

export function OverviewRuntimeDependencyPanel({ dependencies }: OverviewRuntimeDependencyPanelProps) {
  return (
    <div className="dashboard-panel rounded-3xl p-5">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Runtime Posture</p>
      <h3 className="mt-2 font-space text-2xl font-bold text-white">Dependency Summary</h3>

      <div className="mt-5 grid gap-4">
        {dependencies.map((dependency) => {
          const tone = dependencyTone(dependency.state);
          return (
            <div key={dependency.label} className="dashboard-panel-muted rounded-2xl p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{dependency.label}</p>
                  <p className={`mt-1 text-sm ${tone.text}`}>{dependency.copy}</p>
                </div>
                <strong className={`text-sm uppercase tracking-[0.18em] ${tone.text}`}>{dependency.state}</strong>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
                <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${dependency.score}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
