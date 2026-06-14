import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="container-app flex flex-col items-center justify-between gap-4 py-8 text-sm text-muted sm:flex-row">
        <p>
          çek<span className="gradient-text font-semibold">io</span> — zincir üstü çek protokolü
        </p>
        <div className="flex items-center gap-5">
          <Link href="/dashboard" className="hover:text-ink">
            Pano
          </Link>
          <Link href="/create" className="hover:text-ink">
            Çek Oluştur
          </Link>
          <span className="pill">Ethereum · iTRY</span>
        </div>
      </div>
    </footer>
  );
}
