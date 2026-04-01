export type AuthUser = {
  id: number;
  name: string;
  email: string;
  email_verified_at?: string | null;
  created_at: string;
};

export type SessionResponse = {
  authenticated: boolean;
  user?: AuthUser | null;
  mode?: "authenticated" | "demo";
  read_only?: boolean;
};

export type AuthMessageResponse = {
  ok: boolean;
  message: string;
  preview_url?: string;
  preview_code?: string;
  verification_required?: boolean;
  authenticated?: boolean;
  user?: AuthUser | null;
  email?: string;
};

export type ProbeResult = {
  seq?: number;
  addr?: string;
  error?: string;
  rtt?: string;
  rtt_ms?: number;
  port?: number;
  state?: string;
};

export type ProbeSummary = {
  sent?: number;
  recv?: number;
  loss?: number;
  min?: string;
  avg?: string;
  max?: string;
  stddev?: string;
  duration?: string;
  scanned?: number;
  open?: number;
  closed?: number;
  timeout?: number;
};

export type ProbeReport = {
  protocol: string;
  target: string;
  addr?: string;
  port?: number;
  results: ProbeResult[];
  summary: ProbeSummary;
};

export type ProbeStreamEvent = {
  type: "result" | "summary" | "stopped" | "error";
  protocol?: string;
  target?: string;
  addr?: string;
  port?: number;
  ts?: number;
  result?: ProbeResult;
  summary?: ProbeSummary;
  error?: string;
};

export type HistoryPoint = {
  ts: number;
  seq?: number;
  rtt_ms?: number;
  error?: string;
};

export type RecentHistoryTarget = {
  protocol: "ping" | "tcpping";
  target: string;
  port?: number;
  last_sample_at: number;
};

export type DNSStringSection = {
  values?: string[];
  records?: { value: string; ttl: number }[];
  error?: string;
  duration_ms: number;
  resolver?: string;
  authoritative?: boolean;
};

export type DNSMXRecord = {
  host: string;
  pref: number;
  ttl: number;
};

export type DNSMXSection = {
  records?: DNSMXRecord[];
  error?: string;
  duration_ms: number;
  resolver?: string;
  authoritative?: boolean;
};

export type DNSSOARecord = {
  ns: string;
  mbox: string;
  serial: number;
  refresh: number;
  retry: number;
  expire: number;
  minttl: number;
  ttl: number;
};

export type DNSSOASection = {
  record?: DNSSOARecord | null;
  error?: string;
  duration_ms: number;
  resolver?: string;
  authoritative?: boolean;
};

export type DNSSRVRecord = {
  target: string;
  port: number;
  priority: number;
  weight: number;
  ttl: number;
};

export type DNSSRVSection = {
  records?: DNSSRVRecord[];
  error?: string;
  duration_ms: number;
  resolver?: string;
  authoritative?: boolean;
};

export type DNSCAARecord = {
  flag: number;
  tag: string;
  value: string;
  ttl: number;
};

export type DNSCAASection = {
  records?: DNSCAARecord[];
  error?: string;
  duration_ms: number;
  resolver?: string;
  authoritative?: boolean;
};

export type DNSReverseRecord = {
  address: string;
  names?: string[];
  records?: { value: string; ttl: number }[];
  error?: string;
  duration_ms: number;
  resolver?: string;
  authoritative?: boolean;
};

export type DNSReport = {
  protocol: string;
  target: string;
  kind: "host" | "ip";
  record_type: string;
  resolver: string;
  a: DNSStringSection;
  aaaa: DNSStringSection;
  cname: DNSStringSection;
  ns: DNSStringSection;
  txt: DNSStringSection;
  dmarc: DNSStringSection;
  mx: DNSMXSection;
  soa: DNSSOASection;
  srv: DNSSRVSection;
  caa: DNSCAASection;
  dnskey: DNSStringSection;
  ds: DNSStringSection;
  rrsig: DNSStringSection;
  ptr?: DNSReverseRecord[];
  analysis: {
    spf_present: boolean;
    dmarc_present: boolean;
    mx_present: boolean;
    caa_present: boolean;
    dnskey_present: boolean;
    ds_present: boolean;
    rrsig_present: boolean;
    dnssec_present: boolean;
    mail_ready: boolean;
  };
  summary: {
    addresses: number;
    reverse_lookups: number;
    total_records: number;
    duration_ms: number;
  };
};

export type AlertRule = {
  id: number;
  name: string;
  protocol: "ping" | "tcpping";
  target: string;
  port?: number | null;
  recipient_email: string;
  latency_threshold_ms?: number | null;
  loss_threshold_percent?: number | null;
  consecutive_breaches: number;
  cooldown_minutes: number;
  notify_recovery: boolean;
  enabled: boolean;
  last_state: string;
  current_breach_streak: number;
  last_triggered_at?: string | null;
  last_recovered_at?: string | null;
  last_evaluated_at?: string | null;
  created_at: string;
};

export type AlertRulePayload = {
  id?: number;
  name: string;
  protocol: "ping" | "tcpping";
  target: string;
  port?: number;
  recipient_email?: string;
  latency_threshold_ms?: number;
  loss_threshold_percent?: number;
  consecutive_breaches: number;
  cooldown_minutes: number;
  notify_on_recovery: boolean;
  enabled: boolean;
};

export type RuntimeHealthDependency = {
  enabled: boolean;
  healthy: boolean;
  driver?: string;
  error?: string;
};

export type RuntimeHealthResponse = {
  ok: boolean;
  time: string;
  database: RuntimeHealthDependency;
  redis: RuntimeHealthDependency;
  object_storage: RuntimeHealthDependency;
};
