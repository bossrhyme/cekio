"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/dashboard", label: "Çeklerim" },
  { href: "/dashboard/activity", label: "Tekliflerim & İlanlarım" },
];

export function ProfileTabs() {
  const pathname = usePathname();
  return (
    <div className="mb-8 inline-flex rounded-full border border-line bg-card p-1">
      {TABS.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`rounded-full px-4 py-1.5 text-sm transition ${
              active ? "bg-accent-grad text-white" : "text-muted hover:text-ink"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
