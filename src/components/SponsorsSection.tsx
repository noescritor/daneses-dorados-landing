import { ScrollReveal } from "./ui";

const sponsors = [
  { name: "Cerveza Sol", width: 90 },
  { name: "BBVA México", width: 72 },
  { name: "Telcel", width: 68 },
  { name: "Bimbo", width: 64 },
  { name: "Coca-Cola", width: 88 },
  { name: "Cemex", width: 76 },
  { name: "Grupo Modelo", width: 100 },
  { name: "Liverpool", width: 70 },
  { name: "Gobierno Morelos", width: 110 },
];

function SponsorLogo({ name, width }: { name: string; width: number }) {
  return (
    <div
      className="flex items-center justify-center shrink-0 px-10 opacity-40 hover:opacity-80 transition-opacity duration-200 grayscale hover:grayscale-0"
      style={{ minWidth: `${width + 80}px` }}
    >
      <div
        className="font-[family-name:var(--font-barlow)] font-extrabold uppercase text-[#07030B] tracking-[0.1em] text-xl"
        style={{ width }}
        aria-label={name}
      >
        {name}
      </div>
    </div>
  );
}

export default function SponsorsSection() {
  return (
    <section id="patrocinadores" className="bg-[#E6E6E5] py-16 lg:py-20 overflow-hidden">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-20 mb-10">
        <ScrollReveal>
          <div className="flex items-center gap-6">
            <p className="font-[family-name:var(--font-montserrat)] font-semibold text-[10px] tracking-[0.3em] uppercase text-[#07030B]/40 shrink-0">
              Patrocinadores oficiales
            </p>
            <div className="flex-1 h-px bg-[#07030B]/15" />
          </div>
        </ScrollReveal>
      </div>

      {/* Marquee */}
      <div className="relative flex overflow-hidden">
        <div className="marquee-track flex items-center">
          {[...sponsors, ...sponsors].map((s, i) => (
            <SponsorLogo key={`${s.name}-${i}`} name={s.name} width={s.width} />
          ))}
        </div>
      </div>
    </section>
  );
}
