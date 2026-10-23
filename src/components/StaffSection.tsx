import { ScrollReveal, DaneSilhouette } from "./ui";

const staff: { name: string; role: string; details: string[]; img?: string }[] = [
  {
    name: "José Alfredo Bernal Guzmán",
    role: "Entrenador Principal",
    details: ["50 años", "Lic. en Ciencias del Deporte y la Actividad Física", "Máster en Voleibol", "Entrenador de selecciones nacionales femeniles"],
    img: "/staff/alfredo-bernal.webp",
  },
  {
    name: "Eduardo Miranda Kempis",
    role: "Preparador Físico",
    details: ["Cuautla, Morelos", "32 años"],
  },
  {
    name: "Rodolfo Alan Álvarez Juárez",
    role: "Auxiliar de Entrenador",
    details: ["Ciudad de México", "Nivel FIVB 1"],
  },
  {
    name: "Luis Ángel Hernández Hernández",
    role: "Estadístico",
    details: ["Tlalnepantla, Edo. de México", "C.O. VolleyLab"],
  },
];

export default function StaffSection() {
  return (
    <section className="bg-[#E6E6E5] py-20 lg:py-24">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-20">
        {/* Header */}
        <div className="mb-12">
          <ScrollReveal>
            <p className="font-[family-name:var(--font-playfair)] italic text-[#B4904B] text-lg mb-2">
              Liderazgo técnico
            </p>
          </ScrollReveal>
          <ScrollReveal delay={0.08}>
            <h2
              className="font-[family-name:var(--font-gin)] font-black uppercase text-[#07030B] leading-none"
              style={{ fontSize: "clamp(40px, 5.5vw, 80px)" }}
            >
              CUERPO TÉCNICO
            </h2>
          </ScrollReveal>
        </div>

        {/* Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {staff.map((s, i) => (
            <ScrollReveal key={s.name} delay={i * 0.1}>
              <div className="bg-white group overflow-hidden h-full flex flex-col">
                {/* Photo (or silhouette placeholder until the real photo is available) */}
                <div className="relative h-64 lg:h-72 overflow-hidden bg-[#1a1520]">
                  {s.img ? (
                    <img
                      src={s.img}
                      alt={s.name}
                      width={640}
                      height={800}
                      className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <DaneSilhouette className="absolute inset-0 p-12 text-[#B4904B]/25" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#07030B]/40 to-transparent" />
                </div>

                {/* Info */}
                <div className="p-6 border-l-[3px] border-[#B4904B] flex-1">
                  <p className="font-[family-name:var(--font-montserrat)] font-semibold text-[10px] tracking-[0.25em] uppercase text-[#B4904B] mb-1">
                    {s.role}
                  </p>
                  <h3 className="font-[family-name:var(--font-gin)] font-extrabold uppercase text-[#07030B] text-2xl lg:text-3xl leading-none mb-3">
                    {s.name}
                  </h3>
                  <p className="font-[family-name:var(--font-montserrat)] text-[#07030B]/60 text-[13px] leading-relaxed">
                    {s.details.join(" · ")}
                  </p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
