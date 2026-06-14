import Link from "next/link";

export default function LandingPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid" aria-hidden />
        <div className="container-app relative grid gap-12 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-28">
          <div className="animate-fade-up">
            <span className="pill">
              <span className="h-1.5 w-1.5 rounded-full bg-positive" /> Base · ERC-4626 · Chainlink Automation
            </span>
            <h1 className="mt-6 font-display text-4xl font-bold leading-[1.1] sm:text-6xl">
              Çek artık <span className="gradient-text">karşılıksız çıkmaz</span>.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted">
              Keşideci çek tutarını baştan kilitler — para vade boyunca lend platformlarında çalışır,
              getiri keşideciye gider, vade tarihinde anapara otomatik olarak alacaklıya geçer. Her şey
              zincir üstünde, şeffaf ve ciro edilebilir.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/create" className="btn">
                Çek Oluştur →
              </Link>
              <Link href="/dashboard" className="btn-ghost">
                Panoyu Aç
              </Link>
            </div>
            <dl className="mt-12 grid max-w-md grid-cols-3 gap-6">
              {[
                ["%4–8", "lend getirisi (APY)"],
                ["100%", "anapara kilitli"],
                ["0", "karşılıksız risk*"],
              ].map(([v, l]) => (
                <div key={l}>
                  <dt className="font-display text-2xl font-bold">{v}</dt>
                  <dd className="mt-1 text-xs text-muted">{l}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="animate-fade-up [animation-delay:120ms]">
            <ChequeMock />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="container-app py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">Nasıl çalışır</p>
          <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">Üç adımda zincir üstü çek</h2>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.title} className="card card-hover relative">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-grad font-display font-bold text-ink">
                {i + 1}
              </span>
              <h3 className="mt-4 font-display text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="container-app py-12">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card card-hover">
              <div className="text-2xl">{f.icon}</div>
              <h3 className="mt-3 font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Lend platforms */}
      <section className="container-app py-16">
        <div className="card overflow-hidden">
          <div className="flex flex-col items-center gap-2 text-center">
            <p className="eyebrow">Lend altyapısı</p>
            <h2 className="font-display text-2xl font-bold">Düşük riskli, denetlenmiş ERC-4626 vault'lar</h2>
            <p className="max-w-2xl text-sm text-muted">
              Para, beyaz listedeki en güvenli getiri vault'larından birinde çalışır. Keşideci nereye
              lend edileceğini çek oluştururken seçer.
            </p>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {PLATFORMS.map((p) => (
              <div
                key={p.name}
                className="flex flex-col items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.02] py-6"
              >
                <span className="font-display text-lg font-semibold">{p.name}</span>
                <span className="text-xs text-positive">{p.apy}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-app pb-24">
        <div className="card relative overflow-hidden text-center">
          <div className="absolute inset-0 bg-glow-radial" aria-hidden />
          <div className="relative py-12">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">İlk çekini oluştur</h2>
            <p className="mx-auto mt-3 max-w-lg text-muted">
              Cüzdanını bağla, tutarı ve vadeyi seç, lend platformunu belirle. Gerisini protokol halleder.
            </p>
            <Link href="/create" className="btn mt-6">
              Başla →
            </Link>
            <p className="mt-6 text-xs text-muted">
              * Anapara güvenliği, beyaz listedeki düşük riskli vault'lar ve getiri tamponuyla sağlanır;
              stablecoin/vault riski sıfır değildir.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

const STEPS = [
  {
    title: "Çeki oluştur ve fonla",
    body: "Keşideci tutarı, vadeyi, alacaklıyı ve lend platformunu seçer. Tutar kilitlenip vault'a yatırılır; çek alacaklıya NFT olarak basılır.",
  },
  {
    title: "Para çalışır, getiri birikir",
    body: "Kilitli anapara vade boyunca ERC-4626 vault'ta getiri üretir. Biriken getiri keşidecinindir.",
  },
  {
    title: "Vadede otomatik ödeme",
    body: "Vade tarihinde Chainlink keeper anaparayı alacaklının cüzdanına gönderir, getiriyi keşideciye aktarır.",
  },
];

const FEATURES = [
  { icon: "🔒", title: "Karşılıksız çıkmaz", body: "Tutar oluşturma anında kilitlenir; çekin arkası baştan doludur." },
  { icon: "📈", title: "Atıl para getiri üretir", body: "Vade boyunca düşük riskli lend vault'larında çalışır, getiri keşideciye gider." },
  { icon: "🤝", title: "İzinsiz ciro", body: "Çek bir NFT'dir; alacaklı keşideciye sormadan başka birine devredebilir." },
  { icon: "⏱️", title: "Otomatik vade ödemesi", body: "Chainlink Automation vade tarihinde ödemeyi kendiliğinden tamamlar." },
  { icon: "🔍", title: "Tam şeffaflık", body: "Tutar, vade, taraflar ve getiri zincir üstünde herkesçe doğrulanabilir." },
  { icon: "🛡️", title: "Güvenlik öncelikli", body: "ReentrancyGuard, vault beyaz listesi, Ownable2Step ve duraklatma mekanizması." },
];

const PLATFORMS = [
  { name: "Aave v3", apy: "~5% APY" },
  { name: "Morpho", apy: "~6.8% APY" },
  { name: "Yearn v3", apy: "~5.5% APY" },
  { name: "Sky sUSDS", apy: "~4.5% APY" },
];

function ChequeMock() {
  return (
    <div className="relative mx-auto max-w-md animate-floaty">
      <div className="card shadow-glow">
        <div className="flex items-center justify-between">
          <span className="pill">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Çek #128
          </span>
          <span className="pill text-positive">Vade bekleniyor</span>
        </div>
        <div className="mt-6">
          <p className="text-sm text-muted">Tutar</p>
          <p className="font-display text-4xl font-bold">
            25.000 <span className="text-xl text-muted">USDC</span>
          </p>
        </div>
        <div className="mt-6 space-y-3 text-sm">
          <Row k="Vade" v="21 Eylül 2026" />
          <Row k="Lend" v="Aave v3 · %5.2 APY" accent />
          <Row k="Biriken getiri" v="312,40 USDC" positive />
          <Row k="Alacaklı" v="0x70a9…2C8f" />
        </div>
        <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-2/3 rounded-full bg-accent-grad" />
        </div>
        <p className="mt-2 text-xs text-muted">Vadeye ~%66 — getiri birikmeye devam ediyor</p>
      </div>
    </div>
  );
}

function Row({ k, v, accent, positive }: { k: string; v: string; accent?: boolean; positive?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{k}</span>
      <span className={positive ? "text-positive" : accent ? "text-accent-soft" : "text-white"}>{v}</span>
    </div>
  );
}
