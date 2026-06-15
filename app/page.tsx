import Link from "next/link";

export default function LandingPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="absolute inset-0 bg-grid" aria-hidden />
        <div className="container-app relative grid gap-16 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-32">
          <div className="animate-fade-up">
            <span className="eyebrow">Zincir üstü çek · DeFi getirisi</span>
            <h1 className="mt-5 font-display text-4xl font-bold leading-[1.06] tracking-tight sm:text-6xl">
              Çekin güveni,{" "}
              <span className="gradient-text">zincirin şeffaflığı</span>.
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink/65">
              Keşideci çek tutarını baştan kilitler — para vade boyunca getiri üretir, getiri keşideciye
              kalır, vade gününde anapara otomatik olarak alacaklıya geçer. Karşılıksız çek tarihe karışır.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/create" className="btn">Çek Oluştur →</Link>
              <Link href="#tarih" className="btn-ghost">Çekin hikâyesi</Link>
            </div>
            <div className="mt-10 grid max-w-xl grid-cols-3 gap-px overflow-hidden rounded-lg border border-line bg-line">
              <MetricChip value="%40" label="Yıllık getiri" sub="APY · wiTRY" tech />
              <MetricChip value="%100" label="Teminatlı" sub="anapara kilitli" />
              <MetricChip value="On-chain" label="Otomatik ödeme" sub="Ethereum" />
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-2 text-xs text-muted">
              <span className="mr-1 font-medium text-ink/50">Üzerinde çalışır:</span>
              {["Ethereum", "Brix wiTRY", "Aave", "Chainlink"].map((p) => (
                <span key={p} className="pill">{p}</span>
              ))}
            </div>
          </div>
          <div className="animate-fade-up [animation-delay:100ms]">
            <ChequeMock />
          </div>
        </div>
      </section>

      {/* Çekin tarihi */}
      <section id="tarih" className="container-app py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">Çekin hikâyesi</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">Bin yılı aşan bir güven aracı</h2>
          <p className="mt-3 text-sm text-ink/65">
            Çek; tüccarın "sözünü" taşınabilir, devredilebilir bir değere dönüştürdü. Bugün o sözü kod garantiliyor.
          </p>
        </div>
        <ol className="mx-auto mt-14 max-w-3xl space-y-0">
          {HISTORY.map((h, i) => (
            <li key={h.era} className="relative flex gap-6">
              <div className="flex flex-col items-center">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded bg-accent-grad text-base text-white">
                  {h.icon}
                </span>
                {i < HISTORY.length - 1 && <span className="mt-1 w-px flex-1 bg-line" />}
              </div>
              <div className="card card-hover mb-3 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-display text-base font-semibold tracking-tight">{h.title}</h3>
                  <span className="pill">{h.era}</span>
                </div>
                <p className="mt-2 text-sm text-ink/65">{h.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Sorunlar */}
      <section className="border-y border-line bg-surface/50">
        <div className="container-app py-16">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">Bugünkü sorunlar</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">Klasik çek iki tarafı da yoruyor</h2>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            <ProblemCard
              tag="Çeki veren · Keşideci"
              tone="accent"
              items={[
                ["Atıl para", "Tutar vadeye kadar kasada/bankada bekler; getiri üretmez, enflasyonda erir."],
                ["Bürokrasi & itibar", "Çek defteri, banka limitleri, teminat ve itibar riski."],
                ["Manuel takip", "Vade gününü kaçırma, elden ödeme telaşı."],
              ]}
            />
            <ProblemCard
              tag="Çeki alan · Alacaklı"
              tone="gold"
              items={[
                ["Karşılıksız risk", "Vade gelince hesapta para olmayabilir — en büyük korku."],
                ["Likidite kaybı", "Vadeden önce nakit lazımsa çeki kırdırır, yüksek iskontoyla değer kaybeder."],
                ["Tahsilat & ciro", "Takip, hukuki süreç; çeki devretmek (ciro) güven ve zahmet ister."],
              ]}
            />
          </div>
        </div>
      </section>

      {/* Değer */}
      <section className="container-app py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">Çözümümüz</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">Aynı çek, sıfır güven açığı</h2>
          <p className="mt-3 text-sm text-ink/65">Her sorunu zincir üstünde, koda gömülü bir garantiyle çözüyoruz.</p>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {VALUES.map((v) => (
            <div key={v.title} className="card card-hover">
              <div className="flex h-9 w-9 items-center justify-center rounded border border-line bg-surface text-xl">{v.icon}</div>
              <h3 className="mt-4 font-display text-base font-semibold tracking-tight">{v.title}</h3>
              <p className="mt-2 text-sm text-ink/65">{v.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Use cases */}
      <section className="border-t border-line bg-surface/40">
        <div className="container-app py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">Kimler için</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">Vadeli ödemenin olduğu her yerde</h2>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {USE_CASES.map((u) => (
              <div key={u.title} className="card card-hover">
                <div className="text-2xl">{u.icon}</div>
                <h3 className="mt-3 font-display text-base font-semibold tracking-tight">{u.title}</h3>
                <p className="mt-2 text-sm text-ink/65">{u.body}</p>
                <p className="mt-3 rounded border border-line bg-surface px-3 py-2 text-xs text-ink/65">
                  <span className="font-semibold text-accent">Örnek:</span> {u.example}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-app py-24">
        <div className="relative overflow-hidden rounded-lg border border-accent/30 bg-accent/5 text-center">
          <div className="absolute inset-0 bg-glow-radial" aria-hidden />
          <div className="relative py-14 px-6">
            <p className="eyebrow">Hemen başla</p>
            <h2 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">Çekini bugün geleceğe taşı</h2>
            <p className="mx-auto mt-3 max-w-lg text-sm text-ink/65">
              Cüzdanını bağla, tutarı ve vadeyi seç. Karşılıksız çıkmayan, getiri üreten, ciro edilebilen
              bir çek dakikalar içinde hazır.
            </p>
            <Link href="/create" className="btn mt-7 inline-flex">Başla →</Link>
            <p className="mt-5 text-xs text-muted">
              * Anapara güvenliği, düşük riskli lend vault'ları ve getiri tamponuyla sağlanır; vault/stablecoin riski sıfır değildir.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

const HISTORY = [
  { icon: "📜", era: "Antik çağ", title: "İlk ödeme emirleri", body: "Mezopotamya ve antik dünyada tüccarlar, değeri taşımadan borç ve ödeme emirlerini kil tabletler ve senetlerle aktardı." },
  { icon: "🕌", era: "~M.S. 9. yy", title: "“Sakk” — çekin kökeni", body: "Orta Çağ İslam ticaretinde kullanılan “sakk” (صك), bir kişiye ödeme yapılmasını sağlayan yazılı emirdi. Modern “cheque” kelimesi buradan gelir." },
  { icon: "🏦", era: "17. yy", title: "Modern bankacılık çeki", body: "Londra'da bankerler matbu çekleri yaygınlaştırdı; çek, kurumsal güvene dayanan standart bir ödeme aracına dönüştü." },
  { icon: "🧾", era: "20. yy", title: "Vadeli çek ve ticaret", body: "Çek, özellikle Türkiye gibi pazarlarda vadeli ticaretin bel kemiği oldu — ama karşılıksız çek kronik bir sorun olarak kaldı." },
  { icon: "⛓️", era: "Bugün", title: "Zincir üstü çek", body: "çekio, çekin devredilebilir güvenini akıllı kontratlarla birleştirir: para baştan kilitli, getiri üretir, vadede otomatik ödenir." },
];

function ProblemCard({ tag, tone, items }: { tag: string; tone: "accent" | "gold"; items: [string, string][] }) {
  return (
    <div className="card">
      <span className={`pill ${tone === "accent" ? "text-accent border-accent/30" : "text-warn border-warn/30"}`}>
        <span className="h-1.5 w-1.5 rounded-sm bg-current" />
        {tag}
      </span>
      <ul className="mt-5 space-y-4">
        {items.map(([t, d]) => (
          <li key={t} className="flex gap-3">
            <span className="mt-px text-sm font-bold text-danger">✕</span>
            <div>
              <p className="text-sm font-semibold">{t}</p>
              <p className="text-sm text-ink/60">{d}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

const VALUES = [
  { icon: "🔒", title: "Karşılıksız çıkmaz", body: "Tutar oluşturma anında kilitlenir. Alacaklı için çekin arkası baştan doludur — risk biter." },
  { icon: "🌱", title: "Atıl para getiri üretir", body: "Kilitli anapara vade boyunca düşük riskli lend vault'larında çalışır; getiri keşideciye kalır." },
  { icon: "💸", title: "Kırdırmaya gerek yok", body: "Nakit lazımsa alacaklı çeki (NFT) anında başka birine devredebilir/satabilir — yüksek iskontolu faktoringe alternatif." },
  { icon: "🤝", title: "İzinsiz, anında ciro", body: "Çek bir NFT'dir; devir tek işlemle, keşideciye sormadan, güvenli biçimde olur." },
  { icon: "⏱️", title: "Otomatik vade ödemesi", body: "Vade gününde Chainlink keeper anaparayı alacaklıya gönderir; kimse takip etmek zorunda kalmaz." },
  { icon: "🔍", title: "Tam şeffaflık", body: "Tutar, vade, taraflar ve getiri zincir üstünde herkesçe doğrulanabilir; ihtilaf en aza iner." },
];

const USE_CASES = [
  { icon: "🏪", title: "Esnaf & tedarikçi", body: "Vadeli mal alım-satımında ödemeyi garantiye al, parayı atıl bırakma.", example: "Market, toptancıya 90 gün vadeli iTRY çek keser; tutar kilitli, toptancı vadede garantili tahsil eder." },
  { icon: "🏢", title: "KOBİ & nakit akışı", body: "Tedarik zincirinde ödemeleri vadeye yay, güveni koruyarak likiditeyi yönet.", example: "Üretici, 3 ay sonra ödenecek faturayı çek olarak verir; bu sürede tutar getiri üretir." },
  { icon: "💻", title: "Freelancer & ajans", body: "Vadeli proje ödemelerini karşılıksız kalma riski olmadan al.", example: "Ajans, müşteriden teslim sonrası ödenecek çek alır; tahsilat garantili, takip otomatik." },
  { icon: "🏠", title: "Kira & emlak", body: "Depozito ve vadeli kira taahhütlerini şeffaf, garantili biçimde bağla.", example: "Kiracı yıllık kirayı vadeli çeklerle taahhüt eder; her ay otomatik ödenir." },
  { icon: "🌍", title: "İhracat & ithalat", body: "Sınır ötesi vadeli ödemelerde stablecoin hız ve şeffaflığıyla güven kur.", example: "İhracatçı, alıcıdan 60 gün vadeli stablecoin çek alır; bankalararası gecikme olmadan tahsil." },
  { icon: "🛒", title: "E-ticaret & pazaryeri", body: "Satıcı ödemelerini garanti altına al, bekleyen bakiyeyi getiriye dönüştür.", example: "Pazaryeri, satıcıya vadeli ödeme çeki düzenler; bekleme süresinde getiri birikir." },
];

function ChequeMock() {
  return (
    <div className="relative mx-auto max-w-sm animate-floaty">
      <div className="absolute inset-0 translate-x-2 translate-y-2 rounded-lg border border-line bg-surface" />
      <div className="relative card shadow-glow">
        <div className="mb-5 flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2">
            <span className="rounded bg-accent px-2 py-0.5 text-xs font-bold text-white">ÇEK</span>
            <span className="font-mono text-sm text-muted">#128</span>
          </div>
          <span className="pill text-positive border-positive/25">
            <span className="h-1.5 w-1.5 rounded-sm bg-positive" />
            Vade bekleniyor
          </span>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted">Tutar</p>
          <p className="mt-1 font-display text-4xl font-bold tracking-tight">
            250.000 <span className="text-lg font-medium text-muted">iTRY</span>
          </p>
        </div>
        <div className="mt-5 space-y-2.5 text-sm">
          <Row k="Vade" v="21 Eylül 2026" />
          <Row k="Lend" v="Brix wiTRY · %40 APY" tech />
          <Row k="Biriken getiri" v="+ 8.350 iTRY" positive />
          <Row k="Alacaklı" v="0x70a9…2C8f" />
        </div>
        <div className="mt-5">
          <div className="h-1.5 overflow-hidden rounded-sm bg-surface">
            <div className="h-full w-2/3 rounded-sm bg-accent-grad" />
          </div>
          <p className="mt-1.5 text-[11px] text-muted">Vadeye %66 — getiri birikmeye devam ediyor</p>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v, tech, positive }: { k: string; v: string; tech?: boolean; positive?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{k}</span>
      <span className={`font-medium ${positive ? "text-positive" : tech ? "text-tech" : "text-ink"}`}>{v}</span>
    </div>
  );
}

function MetricChip({ value, label, sub, tech }: { value: string; label: string; sub: string; tech?: boolean }) {
  return (
    <div className="bg-card px-4 py-4">
      <div className={`font-display text-2xl font-bold leading-none tracking-tight ${tech ? "text-tech" : "text-ink"}`}>{value}</div>
      <div className="mt-1.5 text-xs font-semibold text-ink/75">{label}</div>
      <div className="text-[11px] text-muted">{sub}</div>
    </div>
  );
}
