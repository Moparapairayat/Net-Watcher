"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { usePathname } from "next/navigation";
import { useShellStore } from "@/store/ui-store";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

interface NavGroup {
  label: string;
  icon: string;
  items?: NavItem[];
  defaultOpen?: boolean;
}

const navGroups: NavGroup[] = [
  {
    label: "Diagnostics",
    icon: "DG",
    defaultOpen: true,
    items: [
      { href: "/icmp-ping", label: "ICMP Ping", icon: "IC" },
      { href: "/tcp-ping", label: "TCP Ping", icon: "TC" },
      { href: "/port-scan", label: "Port Scan", icon: "PS" },
    ],
  },
  {
    label: "Monitoring",
    icon: "MN",
    defaultOpen: true,
    items: [
      { href: "/history", label: "History", icon: "HI" },
      { href: "/alerts", label: "Alert Rules", icon: "AL" },
    ],
  },
  {
    label: "Discovery",
    icon: "DC",
    defaultOpen: true,
    items: [{ href: "/dns-lookup", label: "DNS Lookup", icon: "DN" }],
  },
  { label: "Security", icon: "SC" },
  { label: "Advanced Ops", icon: "AX" },
  { label: "Infrastructure", icon: "IF" },
  { label: "Reporting", icon: "RX" },
  { label: "Integration", icon: "IT" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useShellStore();
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    navGroups.forEach((group) => {
      if (group.defaultOpen || group.items?.some((item) => item.href === pathname)) {
        initial.add(group.label);
      }
    });
    return initial;
  });

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  return (
    <>
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-background/60 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`fixed top-0 left-0 z-30 h-full w-64 transition-transform duration-300 lg:sticky lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar">
          <div className="px-4 py-4">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Main</span>
          </div>

          <div className="mb-1 px-2">
            <Link
              href="/"
              onClick={() => setSidebarOpen(false)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                pathname === "/"
                  ? "border border-primary/20 bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              }`}
            >
              <span className="grid h-7 w-7 place-items-center rounded-md bg-secondary text-[10px] font-bold tracking-wider text-foreground">OV</span>
              Overview
            </Link>
          </div>

          <nav className="flex-1 space-y-0.5 px-2 pb-4">
            {navGroups.map((group) => {
              const isOpen = openGroups.has(group.label);
              const hasActive = group.items?.some((item) => item.href === pathname) ?? false;
              const hasChildren = (group.items?.length ?? 0) > 0;

              return (
                <div key={group.label}>
                  <button
                    type="button"
                    onClick={() => hasChildren && toggleGroup(group.label)}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                      hasActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="grid h-7 w-7 place-items-center rounded-md bg-secondary/60 text-[10px] font-bold tracking-wider">
                        {group.icon}
                      </span>
                      <span className="font-medium">{group.label}</span>
                    </span>
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? "rotate-0" : "-rotate-90"}`} />
                  </button>

                  {hasChildren && isOpen ? (
                    <div className="mt-0.5 mb-1 ml-3 space-y-0.5 border-l border-border/40 pl-4">
                      {group.items?.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setSidebarOpen(false)}
                          className={`flex w-full items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-all ${
                            pathname === item.href
                              ? "bg-primary/15 font-medium text-primary"
                              : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                          }`}
                        >
                          <span className="grid h-6 w-6 place-items-center rounded bg-secondary/40 text-[9px] font-bold tracking-wider">
                            {item.icon}
                          </span>
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}
