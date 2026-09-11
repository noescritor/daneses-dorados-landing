import { ScrollReveal, GrainOverlay, Btn } from "./ui";

const plans = [
  {
    tier: "General",
    price: "180",
    currency: "MXN",
    desc: "Acceso a zona general con excelente visibilidad del juego completo.",
    perks: ["Acceso zona general", "Programa del partido", "Descuento en alimentos"],
    featured: false,
  },
  {
    tier: "Preferente",
    price: "350",
    currency: "MXN",
    desc: "Mejor ubicación garantizada, asientos numerados y servicio premium.",
    perks: ["Asiento numerado", "Zona preferente central", "Área VIP de acceso", "Descuento en merchandise"],
    featured: true,
  },
  {
    tier: "Abono Temporada",
    price: "1,800",
    currency: "MXN",
    desc: "Acceso ilimitado a todos los partidos de local de la temporada 2026.",
    perks: ["Todos los partidos locales", "Prioridad en renovación", "Acceso a entrenamientos", "Playera oficial", "Meet & greet con jugadores"],
    featured: false,
  },
];

export default function TicketsSection() {
  return (
    <section id="boletos" className="relative bg-[#07030B] py-20 lg:py-28 overflow-hidden">
      <GrainOverlay />

      <div className="relative z-10 max-w-[1440px] mx-auto px-6 lg:px-20">
        {/* Header */}
        <div className="mb-12 text-center lg:text-left">
          <ScrollReveal>
            <p className="font-[family-name:var(--font-playfair)] italic text-[#B4904B] text-lg mb-2">
              Temporada 2026
            </p>
          </ScrollReveal>
          <ScrollReveal delay={0.08}>
            <h2
              className="font-[family-name:var(--font-gin)] font-black uppercase text-white leading-none"
              style={{ fontSize: "clamp(48px, 7vw, 96px)" }}
            >
              BOLETOS Y ABONOS
            </h2>
          </ScrollReveal>
        </div>

        {/* Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
          {plans.map((p, i) => (
            <ScrollReveal key={p.tier} delay={i * 0.09}>
              <div
                className={`relative flex flex-col h-full p-8 transition-all duration-200 hover:-translate-y-1 ${
                  p.featured
                    ? "bg-[#B4904B] text-[#07030B]"
                    : "bg-[#0d0a11] border border-[#B4904B]/20 text-white hover:border-[#B4904B]/50"
                }`}
              >
                {p.featured && (
                  <div className="absolute -top-3 left-8">
                    <span className="font-[family-name:var(--font-montserrat)] font-bold text-[9px] tracking-[0.25em] uppercase bg-[#07030B] text-[#B4904B] px-3 py-1">
                      Más popular
                    </span>
                  </div>
                )}

                {/* Tier */}
                <p
                  className={`font-[family-name:var(--font-montserrat)] font-semibold text-[11px] tracking-[0.25em] uppercase mb-3 ${
                    p.featured ? "text-[#07030B]/70" : "text-[#B4904B]"
                  }`}
                >
                  {p.tier}
                </p>

                {/* Price */}
                <div className="flex items-baseline gap-1 mb-4">
                  <span
                    className={`font-[family-name:var(--font-gin)] font-black leading-none ${
                      p.featured ? "text-[#07030B] text-7xl" : "text-[#B4904B] text-7xl"
                    }`}
                  >
                    ${p.price}
                  </span>
                  <span className={`font-[family-name:var(--font-montserrat)] font-medium text-sm ${p.featured ? "text-[#07030B]/60" : "text-white/40"}`}>
                    {p.currency}
                  </span>
                </div>

                {/* Desc */}
                <p className={`font-[family-name:var(--font-montserrat)] text-[13px] leading-relaxed mb-6 ${p.featured ? "text-[#07030B]/75" : "text-white/55"}`}>
                  {p.desc}
                </p>

                {/* Perks */}
                <ul className="flex-1 flex flex-col gap-2.5 mb-8">
                  {p.perks.map((perk) => (
                    <li key={perk} className="flex items-center gap-3">
                      <span className={`text-sm ${p.featured ? "text-[#07030B]" : "text-[#B4904B]"}`}>✓</span>
                      <span className={`font-[family-name:var(--font-montserrat)] text-[13px] ${p.featured ? "text-[#07030B]/80" : "text-white/65"}`}>
                        {perk}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {p.featured ? (
                  <button className="w-full font-[family-name:var(--font-montserrat)] font-700 text-[11px] tracking-[0.15em] uppercase bg-[#07030B] text-[#B4904B] py-3.5 hover:bg-[#07030B]/80 transition-colors duration-150 active:scale-[0.97]">
                    Comprar ahora
                  </button>
                ) : (
                  <button className="w-full font-[family-name:var(--font-montserrat)] font-700 text-[11px] tracking-[0.15em] uppercase border border-[#B4904B]/50 text-[#B4904B] py-3.5 hover:bg-[#B4904B]/10 transition-colors duration-150 active:scale-[0.97]">
                    Seleccionar
                  </button>
                )}
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
