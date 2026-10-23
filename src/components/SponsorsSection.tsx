import { ScrollReveal } from "./ui";

// Logos en /public/sponsors (negro sobre transparente, márgenes recortados)
const sponsors = [
  { name: "Indoor Sports", file: "indoor-sports", w: 480, h: 178 },
  { name: "Universidad ESEF Cuautla", file: "universidad-esef-cuautla", w: 199, h: 192 },
  { name: "Universidad Dorados", file: "universidad-dorados", w: 188, h: 192 },
  { name: "UIMEM", file: "uimem", w: 480, h: 186 },
  { name: "Dorados Convention & Resort", file: "dorados-resort", w: 480, h: 144 },
  { name: "STEN FIT Fitness Center", file: "sten-fit", w: 405, h: 192 },
  { name: "VolleyLab", file: "volleylab", w: 480, h: 111 },
];

// Cuatro copias: el keyframe desplaza -50%, así la banda nunca queda corta en pantallas anchas
const track = [...sponsors, ...sponsors, ...sponsors, ...sponsors];

function SponsorLogo({ name, file, w, h, decorative }: (typeof sponsors)[number] & { decorative: boolean }) {
  return (
    <div
      className="flex items-center justify-center shrink-0 px-10 opacity-80 hover:opacity-100 transition-opacity duration-200"
      aria-hidden={decorative || undefined}
    >
      <img
        src={`/sponsors/${file}.webp`}
        alt={name}
        width={w}
        height={h}
        className="h-14 w-auto max-w-[176px] object-contain"
        loading="lazy"
        decoding="async"
      />
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
        <div className="marquee-track flex items-center" style={{ animationDuration: "40s" }}>
          {track.map((s, i) => (
            <SponsorLogo key={`${s.file}-${i}`} {...s} decorative={i >= sponsors.length} />
          ))}
        </div>
      </div>
    </section>
  );
}
