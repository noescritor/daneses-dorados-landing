import { ScrollReveal } from "./ui";

const staff = [
  {
    name: "Roberto Méndez",
    role: "Head Coach",
    credentials: "Medallista panamericano · 18 años de experiencia · Ex seleccionado nacional",
    img: "https://images.unsplash.com/photo-1596230948136-b2edac629ded?w=500&h=600&fit=crop&auto=format&q=80",
  },
  {
    name: "Adriana Flores",
    role: "Directora Deportiva",
    credentials: "Licenciada en Ciencias del Deporte · UNAM · Gestión deportiva profesional",
    img: "https://images.unsplash.com/photo-1620258218813-dd700da0627b?w=500&h=600&fit=crop&auto=format&q=80",
  },
  {
    name: "Carlos Vega",
    role: "Asistente Técnico",
    credentials: "Especialista en análisis de juego · Certificación FIVB Nivel 2",
    img: "https://images.unsplash.com/photo-1720731052616-3921fd9a92f6?w=500&h=600&fit=crop&auto=format&q=80",
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
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {staff.map((s, i) => (
            <ScrollReveal key={s.name} delay={i * 0.1}>
              <div className="bg-white group overflow-hidden">
                {/* Photo */}
                <div className="relative h-64 lg:h-72 overflow-hidden bg-[#1a1520]">
                  <img
                    src={s.img}
                    alt={s.name}
                    className="w-full h-full object-cover object-top filter contrast-110 brightness-95 transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#07030B]/40 to-transparent" />
                </div>

                {/* Info */}
                <div className="p-6 border-l-[3px] border-[#B4904B]">
                  <p className="font-[family-name:var(--font-montserrat)] font-semibold text-[10px] tracking-[0.25em] uppercase text-[#B4904B] mb-1">
                    {s.role}
                  </p>
                  <h3 className="font-[family-name:var(--font-gin)] font-extrabold uppercase text-[#07030B] text-2xl lg:text-3xl leading-none mb-3">
                    {s.name}
                  </h3>
                  <p className="font-[family-name:var(--font-montserrat)] text-[#07030B]/60 text-[13px] leading-relaxed">
                    {s.credentials}
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
