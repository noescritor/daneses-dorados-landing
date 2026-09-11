import { useRef } from "react";
import { useInView } from "framer-motion";
import { ScrollReveal, useCountUp } from "./ui";

const stats = [
  { value: 2019, suffix: "", label: "Fundación" },
  { value: 2026, suffix: "", label: "Temporada" },
  { value: 8, suffix: "", label: "Títulos regionales" },
  { value: 312, suffix: "+", label: "Seguidores en arena" },
];

function StatCard({ value, suffix, label, delay }: { value: number; suffix: string; label: string; delay: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const count = useCountUp(value, inView, 1.6);

  return (
    <ScrollReveal delay={delay}>
      <div
        ref={ref}
        className="bg-[#07030B] p-6 lg:p-8 border-l-[3px] border-[#B4904B] flex flex-col justify-between min-h-[140px] group hover:border-l-[4px] transition-all duration-200"
      >
        <p className="font-[family-name:var(--font-gin)] font-black text-[#B4904B] text-[52px] lg:text-[64px] leading-none tracking-tight">
          {count.toLocaleString()}{suffix}
        </p>
        <p className="font-[family-name:var(--font-montserrat)] font-semibold text-white/60 text-xs tracking-[0.2em] uppercase mt-3">
          {label}
        </p>
      </div>
    </ScrollReveal>
  );
}

export default function ConceptSection() {
  return (
    <section className="bg-[#E6E6E5] py-20 lg:py-28">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-20">
        <div className="grid lg:grid-cols-[340px_1fr] gap-12 lg:gap-20 items-start">

          {/* Left: text */}
          <div>
            <ScrollReveal>
              <p className="font-[family-name:var(--font-playfair)] italic text-[#B4904B] text-lg mb-3">
                Quiénes somos
              </p>
            </ScrollReveal>
            <ScrollReveal delay={0.08}>
              <h2
                className="font-[family-name:var(--font-gin)] font-black uppercase text-[#07030B] leading-none mb-6"
                style={{ fontSize: "clamp(42px, 6vw, 80px)" }}
              >
                EL ESPÍRITU<br />DEL GRAN DANÉS
              </h2>
            </ScrollReveal>
            <ScrollReveal delay={0.14}>
              <div className="w-14 h-[3px] bg-[#B4904B] mb-7" />
            </ScrollReveal>
            <ScrollReveal delay={0.18}>
              <p className="font-[family-name:var(--font-montserrat)] text-[#07030B]/75 text-[15px] leading-relaxed mb-4">
                Daneses Dorados Morelos es el equipo de voleibol profesional que representa al estado de Morelos en la Liga Nacional de Voleibol. Fundado sobre los valores del Gran Danés — nobleza, fuerza y determinación — competimos cada temporada con una plantilla de élite.
              </p>
            </ScrollReveal>
            <ScrollReveal delay={0.22}>
              <p className="font-[family-name:var(--font-montserrat)] text-[#07030B]/75 text-[15px] leading-relaxed mb-8">
                Nuestro juego combina la potencia ofensiva con una defensa implacable. En la arena, somos uno. Fuera de ella, somos embajadores del deporte morelense.
              </p>
            </ScrollReveal>
            <ScrollReveal delay={0.28}>
              <div className="flex gap-6 text-center">
                {["Fuerza", "Orgullo", "Equipo"].map((v) => (
                  <div key={v}>
                    <p className="font-[family-name:var(--font-gin)] font-extrabold uppercase text-[#07030B] text-base tracking-[0.1em]">
                      {v}
                    </p>
                    <div className="w-full h-px bg-[#B4904B] mt-1" />
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>

          {/* Right: stat cards */}
          <div className="grid grid-cols-2 gap-4">
            {stats.map((s, i) => (
              <StatCard key={s.label} {...s} delay={i * 0.08} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
