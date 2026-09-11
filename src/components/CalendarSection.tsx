import { ScrollReveal, Btn } from "./ui";

const games = [
  { date: "20 Sep", day: "Dom", rival: "Soles de Culiacán", venue: "Auditorio Morelos, Cuernavaca", time: "19:00 h", home: true },
  { date: "27 Sep", day: "Dom", rival: "Rayos de Hidalgo", venue: "Arena Hidalgo, Pachuca", time: "18:00 h", home: false },
  { date: "04 Oct", day: "Dom", rival: "Aguacateros de Michoacán", venue: "Auditorio Morelos, Cuernavaca", time: "19:00 h", home: true },
  { date: "11 Oct", day: "Dom", rival: "Peñeros de Minatitlán", venue: "Auditorio Morelos, Cuernavaca", time: "17:30 h", home: true },
  { date: "18 Oct", day: "Dom", rival: "Astros de Jalisco", venue: "Guadalajara Arena, Guadalajara", time: "19:00 h", home: false },
  { date: "25 Oct", day: "Dom", rival: "Camoteros de Puebla", venue: "Auditorio Morelos, Cuernavaca", time: "19:00 h", home: true },
];

export default function CalendarSection() {
  return (
    <section id="calendario" className="bg-[#F5F3EF] py-20 lg:py-28">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-20">
        {/* Header */}
        <div className="mb-12">
          <ScrollReveal>
            <p className="font-[family-name:var(--font-playfair)] italic text-[#B4904B] text-lg mb-2">
              Liga Nacional · 2026
            </p>
          </ScrollReveal>
          <ScrollReveal delay={0.08}>
            <h2
              className="font-[family-name:var(--font-gin)] font-black uppercase text-[#07030B] leading-none"
              style={{ fontSize: "clamp(40px, 5.5vw, 80px)" }}
            >
              CALENDARIO
            </h2>
          </ScrollReveal>
        </div>

        {/* Games list */}
        <div className="flex flex-col divide-y divide-[#07030B]/10">
          {games.map((g, i) => (
            <ScrollReveal key={i} delay={i * 0.05}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-5 group">
                {/* Date block */}
                <div className="flex items-center gap-5 shrink-0">
                  <div className="w-14 text-center">
                    <p className="font-[family-name:var(--font-gin)] font-black text-[#07030B] text-2xl leading-none">
                      {g.date.split(" ")[0]}
                    </p>
                    <p className="font-[family-name:var(--font-montserrat)] text-[10px] tracking-[0.2em] uppercase text-[#07030B]/50">
                      {g.date.split(" ")[1]}
                    </p>
                  </div>
                  <span className={`font-[family-name:var(--font-montserrat)] font-semibold text-[10px] tracking-[0.15em] uppercase px-2.5 py-1 ${g.home ? "bg-[#07030B] text-[#B4904B]" : "border border-[#07030B]/30 text-[#07030B]/60"}`}>
                    {g.home ? "LOCAL" : "VISITA"}
                  </span>
                </div>

                {/* Match info */}
                <div className="flex-1 min-w-0 sm:px-6">
                  <p className="font-[family-name:var(--font-gin)] font-extrabold uppercase text-[#07030B] text-xl lg:text-2xl leading-none mb-1">
                    <span className="text-[#B4904B]">DANESES</span> vs {g.rival}
                  </p>
                  <p className="font-[family-name:var(--font-montserrat)] text-[#07030B]/55 text-xs tracking-wide">
                    {g.venue} · {g.time}
                  </p>
                </div>

                {/* CTA */}
                <Btn href="#boletos" className="shrink-0 text-[10px] px-5 py-2.5">
                  Boletos
                </Btn>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* Full schedule link */}
        <ScrollReveal delay={0.1} className="mt-8 text-center">
          <a href="#" className="font-[family-name:var(--font-montserrat)] font-semibold text-[11px] tracking-[0.2em] uppercase text-[#07030B]/60 hover:text-[#B4904B] transition-colors">
            Ver calendario completo →
          </a>
        </ScrollReveal>
      </div>
    </section>
  );
}
