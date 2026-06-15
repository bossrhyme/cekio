"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";

const NAV = [
  { href: "/", label: "Anasayfa" },
  { href: "/dashboard", label: "Pano" },
  { href: "/market", label: "Pazaryeri" },
  { href: "/create", label: "Çek Oluştur" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-cream/90 backdrop-blur-md">
      <div className="container-app flex h-14 items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 font-display text-lg font-bold tracking-tight">
            <span className="grid h-7 w-7 place-items-center rounded bg-accent font-bold text-white text-sm">
              ç
            </span>
            <span>çek<span className="gradient-text">io</span></span>
          </Link>
          <nav className="hidden items-center gap-0.5 md:flex">
            {NAV.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative px-3 py-1.5 text-sm transition ${
                    active ? "text-ink font-medium" : "text-muted hover:text-ink"
                  }`}
                >
                  {item.label}
                  {active && (
                    <span className="absolute inset-x-3 bottom-0 h-px bg-accent" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
        <ConnectButton showBalance={false} chainStatus="icon" accountStatus="avatar" />
      </div>

      <nav className="flex items-center border-t border-line px-4 py-1.5 md:hidden">
        {NAV.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 px-2 py-1.5 text-center text-xs font-medium transition border-b-2 ${
                active ? "border-accent text-ink" : "border-transparent text-muted"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
