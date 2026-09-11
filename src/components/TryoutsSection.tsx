import { useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { ScrollReveal } from "./ui";

const reqs = [
  "Hombres de 18 a 32 años",
  "Altura mínima: 185 cm (líberos: 175 cm)",
  "Disponibilidad completa para entrenamientos y partidos",
  "Experiencia en voleibol nivel competitivo (Liga estatal o superior)",
  "Certificado médico vigente",
  "Sin lesiones activas",
];

export default function TryoutsSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const prefersReduced = useReducedMotion();
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <section id="tryouts" ref={ref} className="relative overflow-hidden">
      {/* Wipe animation: black → gold background */}
      <div className="absolute inset-0 bg-[#07030B]" />
      <motion.div
        className="absolute inset-0 bg-[#B4904B]"
        initial={{ clipPath: "inset(0 100% 0 0)" }}
        animate={inView ? { clipPath: prefersReduced ? "inset(0 0% 0 0)" : "inset(0 0% 0 0)" } : {}}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
      />

      <div className="relative z-10 py-20 lg:py-28">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-20">
          <div className="grid lg:grid-cols-[1fr_420px] gap-12 lg:gap-20 items-start">

            {/* Left */}
            <div>
              <ScrollReveal>
                <p className="font-[family-name:var(--font-playfair)] italic text-[#07030B]/70 text-lg mb-2">
                  Únete al equipo
                </p>
              </ScrollReveal>
              <ScrollReveal delay={0.07}>
                <h2
                  className="font-[family-name:var(--font-gin)] font-black uppercase text-[#07030B] leading-none mb-6"
                  style={{ fontSize: "clamp(48px, 7vw, 100px)" }}
                >
                  PRUEBAS<br />2026
                </h2>
              </ScrollReveal>
              <ScrollReveal delay={0.12}>
                <div className="w-16 h-1 bg-[#07030B] mb-7" />
              </ScrollReveal>

              {/* Dates */}
              <ScrollReveal delay={0.16}>
                <div className="flex gap-6 mb-8">
                  {[
                    { day: "05", month: "OCT", label: "Día 1" },
                    { day: "06", month: "OCT", label: "Día 2" },
                  ].map((d) => (
                    <div key={d.day} className="bg-[#07030B] px-5 py-4 text-center">
                      <p className="font-[family-name:var(--font-gin)] font-black text-[#B4904B] text-4xl leading-none">{d.day}</p>
                      <p className="font-[family-name:var(--font-montserrat)] font-bold text-white text-xs tracking-[0.2em] uppercase">{d.month} 2026</p>
                      <p className="font-[family-name:var(--font-montserrat)] text-white/50 text-[10px] tracking-[0.15em] uppercase mt-1">{d.label} · 9:00 h</p>
                    </div>
                  ))}
                </div>
              </ScrollReveal>

              <ScrollReveal delay={0.2}>
                <p className="font-[family-name:var(--font-montserrat)] font-semibold text-[10px] tracking-[0.2em] uppercase text-[#07030B]/70 mb-3">
                  Requisitos
                </p>
              </ScrollReveal>
              <ul className="flex flex-col gap-2">
                {reqs.map((r, i) => (
                  <ScrollReveal key={r} delay={0.22 + i * 0.04}>
                    <li className="flex items-start gap-3">
                      <span className="mt-0.5 font-[family-name:var(--font-gin)] font-black text-[#07030B] text-base leading-none">—</span>
                      <span className="font-[family-name:var(--font-montserrat)] text-[#07030B]/80 text-sm leading-snug">{r}</span>
                    </li>
                  </ScrollReveal>
                ))}
              </ul>

              <ScrollReveal delay={0.42}>
                <p className="font-[family-name:var(--font-montserrat)] text-[#07030B]/65 text-xs mt-6">
                  Sede: Auditorio Morelos, Cuernavaca · Presentarse 30 min antes
                </p>
              </ScrollReveal>
            </div>

            {/* Right: form */}
            <ScrollReveal delay={0.18}>
              <div className="bg-[#07030B] p-8 lg:p-10">
                <p className="font-[family-name:var(--font-gin)] font-extrabold uppercase text-white text-2xl mb-6">
                  REGÍSTRATE
                </p>

                {sent ? (
                  <div className="text-center py-10">
                    <p className="font-[family-name:var(--font-gin)] font-black text-[#B4904B] text-2xl uppercase mb-2">¡Registrado!</p>
                    <p className="font-[family-name:var(--font-montserrat)] text-white/60 text-sm">Recibirás un correo de confirmación con los detalles.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {[
                      { label: "Nombre completo", type: "text", placeholder: "Juan García Morales" },
                      { label: "Correo electrónico", type: "email", placeholder: "juan@ejemplo.com" },
                      { label: "Teléfono", type: "tel", placeholder: "+52 777 000 0000" },
                      { label: "Posición", type: "text", placeholder: "Opuesto / Punta / Líbero..." },
                    ].map((f) => (
                      <div key={f.label}>
                        <label className="block font-[family-name:var(--font-montserrat)] font-semibold text-[10px] tracking-[0.2em] uppercase text-white/50 mb-1.5">
                          {f.label}
                        </label>
                        <input
                          type={f.type}
                          placeholder={f.placeholder}
                          required
                          className="w-full bg-white/5 border border-white/10 text-white placeholder:text-white/25 font-[family-name:var(--font-montserrat)] text-sm px-4 py-3 focus:outline-none focus:border-[#B4904B]/60 transition-colors"
                        />
                      </div>
                    ))}

                    <div>
                      <label className="block font-[family-name:var(--font-montserrat)] font-semibold text-[10px] tracking-[0.2em] uppercase text-white/50 mb-1.5">
                        Altura (cm)
                      </label>
                      <input
                        type="number"
                        placeholder="190"
                        min={150}
                        max={230}
                        required
                        className="w-full bg-white/5 border border-white/10 text-white placeholder:text-white/25 font-[family-name:var(--font-montserrat)] text-sm px-4 py-3 focus:outline-none focus:border-[#B4904B]/60 transition-colors"
                      />
                    </div>

                    <button
                      type="submit"
                      className="mt-2 w-full font-[family-name:var(--font-montserrat)] font-700 text-[11px] tracking-[0.15em] uppercase bg-[#B4904B] text-[#07030B] py-4 hover:brightness-110 transition-all duration-150 active:scale-[0.97]"
                    >
                      Enviar registro
                    </button>
                  </form>
                )}
              </div>
            </ScrollReveal>

          </div>
        </div>
      </div>
    </section>
  );
}
