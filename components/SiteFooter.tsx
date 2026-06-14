import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-white/10">
      <div className="container-app flex flex-col items-center justify-between gap-4 py-8 text-sm text-muted sm:flex-row">
        <p>
          çek<span className="gradient-text font-semibold">io</span> — zincir üstü çek protokolü
        </p>
        <div className="flex items-center gap-5">
          <Link href="/dashboard" className="hover:text-white">
            Pano
          </Link>
          <Link href="/create" className="hover:text-white">
            Çek Oluştur
          </Link>
          <span className="pill">Base · ERC-4626</span>
        </div>
      </div>
    </footer>
  );
}
