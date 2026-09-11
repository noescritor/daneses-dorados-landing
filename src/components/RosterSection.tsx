import { motion } from "framer-motion";
import { ScrollReveal, GrainOverlay, Sunburst } from "./ui";

const players = [
  { name: "Mendoza", first: "Carlos", number: 7, pos: "Opuesto", img: "photo-1729564615215-9df5ef19b971" },
  { name: "Villanueva", first: "Rodrigo", number: 3, pos: "Líbero", img: "photo-1673058577973-68b6b6d53ccd" },
  { name: "Hernández", first: "Diego", number: 11, pos: "Armador", img: "photo-1729564389462-0460255c59c1" },
  { name: "Torres", first: "Alejandro", number: 2, pos: "Central", img: "photo-1729564360311-0bfc7950f930" },
  { name: "Ramírez", first: "Mauricio", number: 14, pos: "Punta", img: "photo-1701908640393-d337f0506abf" },
  { name: "Castro", first: "Sebastián", number: 6, pos: "Central", img: "photo-1758119354171-f14f082c5e02" },
  { name: "López", first: "Fernando", number: 8, pos: "Punta", img: "photo-1786025164139-ae27c4aafa3e" },
  { name: "Morales", first: "Arturo", number: 17, pos: "Opuesto", img: "photo-1783973566213-993d8ff29c3a" },
  { name: "Gutiérrez", first: "Pablo", number: 5, pos: "Líbero", img: "photo-1729564615215-9df5ef19b971" },
  { name: "Sánchez", first: "Eduardo", number: 9, pos: "Armador", img: "photo-1673058577973-68b6b6d53ccd" },
];

function PlayerCard({ player, index }: { player: typeof players[0]; index: number }) {
  const imgUrl = `https://images.unsplash.com/${player.img}?w=400&h=520&fit=crop&auto=format&q=80`;

  return (
    <ScrollReveal delay={index * 0.06}>
      <motion.div
        className="relative group overflow-hidden bg-[#0d0a11] cursor-pointer"
        whileHover={{ scale: 1.03 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Photo */}
        <div className="relative aspect-[3/4] overflow-hidden bg-[#1a1520]">
          <img
            src={imgUrl}
            alt={`${player.first} ${player.name}`}
            className="w-full h-full object-cover object-top filter contrast-125 brightness-90 grayscale-[20%] transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          {/* Dark overlay always */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#07030B]/90 via-[#07030B]/20 to-transparent" />

          {/* Gold hover overlay */}
          <motion.div
            className="absolute inset-0 bg-[#B4904B]/20"
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          />

          {/* Number badge */}
          <div className="absolute top-3 right-3 w-9 h-9 rounded-full bg-[#B4904B] flex items-center justify-center">
            <span className="font-[family-name:var(--font-gin)] font-black text-[#07030B] text-sm leading-none">
              {player.number}
            </span>
          </div>
        </div>

        {/* Info — slides up on hover */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 p-4"
          initial={{ y: 0 }}
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <p className="font-[family-name:var(--font-gin)] font-black uppercase text-white text-2xl leading-none tracking-wide">
            {player.name}
          </p>
          <p className="font-[family-name:var(--font-gin)] font-semibold uppercase text-white/60 text-xs tracking-[0.15em] mt-1">
            {player.pos}
          </p>
          <div className="w-8 h-0.5 bg-[#B4904B] mt-2 transition-all duration-300 group-hover:w-14" />
        </motion.div>
      </motion.div>
    </ScrollReveal>
  );
}

export default function RosterSection() {
  return (
    <section id="equipo" className="relative bg-[#07030B] py-20 lg:py-28 overflow-hidden">
      <GrainOverlay />

      {/* Background sunburst */}
      <Sunburst className="absolute top-[-20%] left-[-15%] w-[60%] opacity-[0.06] z-0 pointer-events-none" />

      <div className="relative z-10 max-w-[1440px] mx-auto px-6 lg:px-20">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-14">
          <div>
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
                LA PLANTILLA
              </h2>
            </ScrollReveal>
          </div>
          <ScrollReveal delay={0.12}>
            <a
              href="#"
              className="font-[family-name:var(--font-montserrat)] font-semibold text-[11px] tracking-[0.2em] uppercase text-[#B4904B] border-b border-[#B4904B]/40 pb-0.5 hover:border-[#B4904B] transition-colors"
            >
              Ver plantilla completa →
            </a>
          </ScrollReveal>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4">
          {players.map((p, i) => (
            <PlayerCard key={p.name} player={p} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
