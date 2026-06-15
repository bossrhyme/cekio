import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line bg-surface/50">
      <div className="container-app flex flex-col items-center justify-between gap-4 py-6 text-sm text-muted sm:flex-row">
        <p className="font-display font-semibold">
          çek<span className="gradient-text">io</span>
          <span className="ml-2 font-sans font-normal text-muted/70">— zincir üstü çek protokolü</span>
        </p>
        <div className="flex items-center gap-5">
          <Link href="/dashboard" className="hover:text-ink transition">Pano</Link>
          <Link href="/create" className="hover:text-ink transition">Çek Oluştur</Link>
          <span className="pill">Ethereum · iTRY</span>
        </div>
      </div>
    </footer>
  );
}
