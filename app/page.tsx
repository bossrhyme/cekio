import Link from "next/link";

export default function LandingPage() {
  return (
    <div>
      {/* ---------------- Hero ---------------- */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid" aria-hidden />
        <div className="container-app relative grid gap-12 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-28">
          <div className="animate-fade-up">
            <span className="pill">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-tech" /> Zincir üstü çek · DeFi getirisi
            </span>
            <h1 className="mt-6 font-display text-4xl font-bold leading-[1.08] sm:text-6xl">
              Çekin güveni, <span className="gradient-text">zincirin şeffaflığı</span>.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-ink/70">
              Keşideci çek tutarını baştan kilitler — para vade boyunca getiri üretir, getiri keşideciye
              kalır, vade gününde anapara otomatik olarak alacaklıya geçer. Karşılıksız çek tarihe karışır.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/create" className="btn">
                Çek Oluştur →
              </Link>
              <Link href="#tarih" className="btn-ghost">
                Çekin hikâyesi
              </Link>
            </div>
            <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
              <MetricChip value="%40" label="Yıllık getiri" sub="APY · wiTRY" tech />
              <MetricChip value="%100" label="Teminatlı" sub="anapara kilitli" />
              <MetricChip value="On-chain" label="Otomatik ödeme" sub="Ethereum" />
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-2 text-xs text-muted">
              <span className="mr-1">Üzerinde çalışır:</span>
              {["Ethereum", "Brix wiTRY", "Aave", "Chainlink"].map((p) => (
                <span key={p} className="pill">
                  {p}
                </span>
              ))}
            </div>
          </div>

          <div className="animate-fade-up [animation-delay:120ms]">
            <ChequeMock />
          </div>
        </div>
      </section>

      {/* ---------------- Çekin tarihi (onboarding) ---------------- */}
      <section id="tarih" className="container-app py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">Çekin hikâyesi</p>
          <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">Bin yılı aşan bir güven aracı</h2>
          <p className="mt-3 text-ink/70">
            Çek; tüccarın “sözünü” taşınabilir, devredilebilir bir değere dönüştürdü. Bugün o sözü kod
            garantiliyor.
          </p>
        </div>

        <ol className="mx-auto mt-14 max-w-3xl space-y-3">
          {HISTORY.map((h, i) => (
            <li key={h.era} className="relative flex gap-5">
              <div className="flex flex-col items-center">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent-grad text-lg text-white shadow-soft">
                  {h.icon}
                </span>
                {i < HISTORY.length - 1 && <span className="mt-1 w-px flex-1 bg-line" />}
              </div>
              <div className="card card-hover mb-3 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-display text-lg font-semibold">{h.title}</h3>
                  <span className="pill">{h.era}</span>
                </div>
                <p className="mt-2 text-sm text-ink/70">{h.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------------- Mevcut sorunlar ---------------- */}
      <section className="container-app py-12">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">Bugünkü sorunlar</p>
          <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">Klasik çek iki tarafı da yoruyor</h2>
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
      </section>

      {/* ---------------- Nasıl çözüyoruz (değer) ---------------- */}
      <section className="container-app py-16">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">Çözümümüz</p>
          <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">Aynı çek, sıfır güven açığı</h2>
          <p className="mt-3 text-ink/70">Her sorunu zincir üstünde, koda gömülü bir garantiyle çözüyoruz.</p>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {VALUES.map((v) => (
            <div key={v.title} className="card card-hover">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-surface text-2xl">{v.icon}</div>
              <h3 className="mt-4 font-display text-lg font-semibold">{v.title}</h3>
              <p className="mt-2 text-sm text-ink/70">{v.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- Kimler kullanır ---------------- */}
      <section className="container-app py-16">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">Kimler için</p>
          <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">Vadeli ödemenin olduğu her yerde</h2>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {USE_CASES.map((u) => (
            <div key={u.title} className="card card-hover">
              <div className="text-2xl">{u.icon}</div>
              <h3 className="mt-3 font-display text-lg font-semibold">{u.title}</h3>
              <p className="mt-2 text-sm text-ink/70">{u.body}</p>
              <p className="mt-3 rounded-xl bg-surface px-3 py-2 text-xs text-ink/70">
                <span className="font-semibold text-accent">Örnek:</span> {u.example}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="container-app pb-24">
        <div className="card relative overflow-hidden text-center">
          <div className="absolute inset-0 bg-glow-radial" aria-hidden />
          <div className="relative py-12">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">Çekini bugün geleceğe taşı</h2>
            <p className="mx-auto mt-3 max-w-lg text-ink/70">
              Cüzdanını bağla, tutarı ve vadeyi seç. Karşılıksız çıkmayan, getiri üreten, ciro edilebilen
              bir çek dakikalar içinde hazır.
            </p>
            <Link href="/create" className="btn mt-6">
              Başla →
            </Link>
            <p className="mt-6 text-xs text-muted">
              * Anapara güvenliği, düşük riskli lend vault'ları ve getiri tamponuyla sağlanır; vault/stablecoin
              riski sıfır değildir.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

const HISTORY = [
  {
    icon: "📜",
    era: "Antik çağ",
    title: "İlk ödeme emirleri",
    body: "Mezopotamya ve antik dünyada tüccarlar, değeri taşımadan borç ve ödeme emirlerini kil tabletler ve senetlerle aktardı.",
  },
  {
    icon: "🕌",
    era: "~M.S. 9. yy",
    title: "“Sakk” — çekin kökeni",
    body: "Orta Çağ İslam ticaretinde kullanılan “sakk” (صك), bir kişiye ödeme yapılmasını sağlayan yazılı emirdi. Modern “cheque” kelimesi buradan gelir.",
  },
  {
    icon: "🏦",
    era: "17. yy",
    title: "Modern bankacılık çeki",
    body: "Londra'da bankerler matbu çekleri yaygınlaştırdı; çek, kurumsal güvene dayanan standart bir ödeme aracına dönüştü.",
  },
  {
    icon: "🧾",
    era: "20. yy",
    title: "Vadeli çek ve ticaret",
    body: "Çek, özellikle Türkiye gibi pazarlarda vadeli ticaretin bel kemiği oldu — ama karşılıksız çek kronik bir sorun olarak kaldı.",
  },
  {
    icon: "⛓️",
    era: "Bugün",
    title: "Zincir üstü çek",
    body: "çekio, çekin devredilebilir güvenini akıllı kontratlarla birleştirir: para baştan kilitli, getiri üretir, vadede otomatik ödenir.",
  },
];

function ProblemCard({
  tag,
  tone,
  items,
}: {
  tag: string;
  tone: "accent" | "gold";
  items: [string, string][];
}) {
  return (
    <div className="card">
      <span className={`pill ${tone === "accent" ? "text-accent" : "text-warn"}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        {tag}
      </span>
      <ul className="mt-5 space-y-4">
        {items.map(([t, d]) => (
          <li key={t} className="flex gap-3">
            <span className="mt-1 text-danger">✕</span>
            <div>
              <p className="font-medium">{t}</p>
              <p className="text-sm text-ink/70">{d}</p>
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
  {
    icon: "🏪",
    title: "Esnaf & tedarikçi",
    body: "Vadeli mal alım-satımında ödemeyi garantiye al, parayı atıl bırakma.",
    example: "Market, toptancıya 90 gün vadeli iTRY çek keser; tutar kilitli, toptancı vadede garantili tahsil eder.",
  },
  {
    icon: "🏢",
    title: "KOBİ & nakit akışı",
    body: "Tedarik zincirinde ödemeleri vadeye yay, güveni koruyarak likiditeyi yönet.",
    example: "Üretici, 3 ay sonra ödenecek faturayı çek olarak verir; bu sürede tutar getiri üretir.",
  },
  {
    icon: "💻",
    title: "Freelancer & ajans",
    body: "Vadeli proje ödemelerini karşılıksız kalma riski olmadan al.",
    example: "Ajans, müşteriden teslim sonrası ödenecek çek alır; tahsilat garantili, takip otomatik.",
  },
  {
    icon: "🏠",
    title: "Kira & emlak",
    body: "Depozito ve vadeli kira taahhütlerini şeffaf, garantili biçimde bağla.",
    example: "Kiracı yıllık kirayı vadeli çeklerle taahhüt eder; her ay otomatik ödenir.",
  },
  {
    icon: "🌍",
    title: "İhracat & ithalat",
    body: "Sınır ötesi vadeli ödemelerde stablecoin hız ve şeffaflığıyla güven kur.",
    example: "İhracatçı, alıcıdan 60 gün vadeli stablecoin çek alır; bankalararası gecikme olmadan tahsil.",
  },
  {
    icon: "🛒",
    title: "E-ticaret & pazaryeri",
    body: "Satıcı ödemelerini garanti altına al, bekleyen bakiyeyi getiriye dönüştür.",
    example: "Pazaryeri, satıcıya vadeli ödeme çeki düzenler; bekleme süresinde getiri birikir.",
  },
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
            250.000 <span className="text-xl text-muted">iTRY</span>
          </p>
        </div>
        <div className="mt-6 space-y-3 text-sm">
          <Row k="Vade" v="21 Eylül 2026" />
          <Row k="Lend" v="Brix wiTRY · %40 APY" tech />
          <Row k="Biriken getiri" v="8.350 iTRY" positive />
          <Row k="Alacaklı" v="0x70a9…2C8f" />
        </div>
        <div className="mt-6 h-2 overflow-hidden rounded-full bg-surface">
          <div className="h-full w-2/3 rounded-full bg-accent-grad" />
        </div>
        <p className="mt-2 text-xs text-muted">Vadeye ~%66 — getiri birikmeye devam ediyor</p>
      </div>
    </div>
  );
}

function Row({ k, v, tech, positive }: { k: string; v: string; tech?: boolean; positive?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{k}</span>
      <span className={positive ? "text-positive" : tech ? "text-tech" : "text-ink"}>{v}</span>
    </div>
  );
}

function MetricChip({ value, label, sub, tech }: { value: string; label: string; sub: string; tech?: boolean }) {
  return (
    <div className="panel-soft p-4">
      <div className={`font-display text-2xl font-bold leading-none ${tech ? "text-tech" : "text-ink"}`}>{value}</div>
      <div className="mt-2 text-xs font-semibold text-ink/80">{label}</div>
      <div className="text-[11px] text-muted">{sub}</div>
    </div>
  );
}
