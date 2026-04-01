import { AlertRule, HistoryPoint, RecentHistoryTarget } from "@/lib/types";

function createHistorySeries(baseTs: number, baseRttMs: number, offsets: number[], errorIndices: number[] = []): HistoryPoint[] {
  return offsets.map((offset, index) => {
    const point: HistoryPoint = {
      ts: baseTs - (offsets.length - index) * 15_000,
    };
    if (errorIndices.includes(index)) {
      point.error = "timeout";
      return point;
    }
    point.rtt_ms = Math.max(6, baseRttMs + offset);
    point.seq = index + 1;
    return point;
  });
}

export function buildOverviewDemoData() {
  const now = Date.now();

  const alertRules: AlertRule[] = [
    {
      id: 9001,
      name: "Public Resolver A",
      protocol: "ping",
      target: "8.8.8.8",
      recipient_email: "demo@netwatcher.local",
      consecutive_breaches: 1,
      cooldown_minutes: 30,
      notify_recovery: true,
      enabled: true,
      last_state: "healthy",
      current_breach_streak: 0,
      last_evaluated_at: new Date(now - 30_000).toISOString(),
      created_at: new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 9002,
      name: "Public Resolver B",
      protocol: "ping",
      target: "1.1.1.1",
      recipient_email: "demo@netwatcher.local",
      consecutive_breaches: 2,
      cooldown_minutes: 20,
      notify_recovery: true,
      enabled: true,
      last_state: "alert",
      current_breach_streak: 2,
      last_triggered_at: new Date(now - 90_000).toISOString(),
      last_evaluated_at: new Date(now - 20_000).toISOString(),
      created_at: new Date(now - 12 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 9003,
      name: "GitHub 443",
      protocol: "tcpping",
      target: "github.com",
      port: 443,
      recipient_email: "demo@netwatcher.local",
      consecutive_breaches: 1,
      cooldown_minutes: 15,
      notify_recovery: true,
      enabled: true,
      last_state: "healthy",
      current_breach_streak: 0,
      last_evaluated_at: new Date(now - 25_000).toISOString(),
      created_at: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 9004,
      name: "OpenAI Edge",
      protocol: "ping",
      target: "api.openai.com",
      recipient_email: "demo@netwatcher.local",
      consecutive_breaches: 1,
      cooldown_minutes: 30,
      notify_recovery: true,
      enabled: true,
      last_state: "healthy",
      current_breach_streak: 0,
      last_evaluated_at: new Date(now - 22_000).toISOString(),
      created_at: new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 9005,
      name: "Quad9",
      protocol: "ping",
      target: "9.9.9.9",
      recipient_email: "demo@netwatcher.local",
      consecutive_breaches: 1,
      cooldown_minutes: 30,
      notify_recovery: false,
      enabled: true,
      last_state: "healthy",
      current_breach_streak: 0,
      last_evaluated_at: new Date(now - 18_000).toISOString(),
      created_at: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  const historyMap = new Map<string, HistoryPoint[]>([
    ["ping:8.8.8.8:0", createHistorySeries(now, 14, [0, 1, 3, 2, 4, 2, 1, 2, 3, 2, 1, 0])],
    ["ping:1.1.1.1:0", createHistorySeries(now, 18, [2, 4, 5, 6, 12, 24, 18, 0, 0, 0, 0, 0], [7, 8])],
    ["tcpping:github.com:443", createHistorySeries(now, 28, [5, 8, 4, 7, 6, 4, 5, 6, 8, 7, 6, 5])],
    ["ping:api.openai.com:0", createHistorySeries(now, 31, [4, 5, 7, 6, 5, 4, 6, 5, 7, 9, 8, 6])],
    ["ping:9.9.9.9:0", createHistorySeries(now, 24, [2, 3, 2, 4, 3, 2, 3, 4, 3, 2, 2, 1])],
  ]);

  const recentTargets: RecentHistoryTarget[] = [
    { protocol: "ping", target: "8.8.8.8", last_sample_at: now - 4_000 },
    { protocol: "ping", target: "1.1.1.1", last_sample_at: now - 7_000 },
    { protocol: "tcpping", target: "github.com", port: 443, last_sample_at: now - 6_000 },
    { protocol: "ping", target: "api.openai.com", last_sample_at: now - 5_000 },
    { protocol: "ping", target: "9.9.9.9", last_sample_at: now - 9_000 },
  ];

  return { alertRules, recentTargets, historyMap };
}
