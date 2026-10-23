import { motion } from "framer-motion";
import { ScrollReveal, GrainOverlay, Sunburst, DaneSilhouette } from "./ui";

type Player = {
  first: string;
  last: string;
  pos?: string;
  height?: string;
  birthplace?: string;
  age?: number;
  number?: number;
  img?: string; // ruta en /public, por ejemplo "/players/abdias-rojas.webp"
};

export const players: Player[] = [
  { first: "Abdías", last: "Rojas Martínez", pos: "Opuesto", height: "1.90 m", birthplace: "Cuautla, Morelos", number: 3, img: "/players/abdias-rojas.webp" },
  { first: "Osvaldo Manuel", last: "Velázquez Mortera", pos: "Central", age: 20, height: "1.90 m", birthplace: "Veracruz", number: 12, img: "/players/osvaldo-velazquez.webp" },
  { first: "Ithanm Manuel", last: "Colón Pérez", pos: "Punta", age: 25, height: "1.83 m", birthplace: "Oaxaca de Juárez, Oaxaca", img: "/players/ithanm-colon.webp" },
  { first: "Luis Eduardo", last: "Lozano Marcos", pos: "Punta", age: 25, height: "1.82 m", birthplace: "Teziutlán, Puebla", number: 1, img: "/players/luis-lozano.webp" },
  { first: "José Manuel Alexei", last: "Colón Pérez", pos: "Armador", age: 23, height: "1.82 m", birthplace: "Oaxaca de Juárez, Oaxaca", img: "/players/alexei-colon.webp" },
  { first: "Habid", last: "Chay Álvarez", pos: "Líbero", age: 26, height: "1.78 m", birthplace: "Veracruz, Veracruz", img: "/players/habid-chay.webp" },
  { first: "Gustavo Andrés", last: "Ortiz Ramos", pos: "Opuesto", age: 22, height: "1.95 m", birthplace: "San Salvador, El Salvador", img: "/players/gustavo-ortiz.webp" },
  { first: "José Ángel", last: "Andrés Mendoza", pos: "Opuesto", age: 36, height: "1.95 m", birthplace: "Caracas, Venezuela", number: 14, img: "/players/jose-angel-mendoza.webp" },
  { first: "Luis Antonio", last: "Bernal Guerrero", pos: "Líbero", age: 23, height: "1.77 m", birthplace: "Mexicali, Baja California", number: 3, img: "/players/antonio-bernal.webp" },
  { first: "José Isaac", last: "Castro Manila", pos: "Punta / Opuesto", age: 20, height: "1.86 m", birthplace: "Huehuetoca, Estado de México", img: "/players/jose-isaac-castro.webp" },
  { first: "Luis Alberto", last: "Ordóñez Montiel", pos: "Armador", age: 30, height: "1.80 m", birthplace: "Tlaxcala", number: 9, img: "/players/luis-alberto-ordonez.webp" },
  { first: "José Mariano", last: "Rodríguez Aguilar", pos: "Punta / Central", age: 24, height: "1.95 m", birthplace: "Loma Bonita, Oaxaca", number: 8, img: "/players/mariano-rodriguez.webp" },
  { first: "José Antonio", last: "Valdés Hernández", pos: "Central", age: 25, height: "1.95 m", birthplace: "Cuernavaca, Morelos", number: 6, img: "/players/antonio-valdes.webp" },
  { first: "Ernesto", last: "Paz Mozqueda Peña", pos: "Opuesto / Punta", age: 26, height: "1.85 m", birthplace: "Morelos", img: "/players/ernesto-mozqueda.webp" },
  { first: "Nelson José", last: "Chávez Morales", pos: "Punta", age: 22, height: "1.90 m", birthplace: "Iguala, Guerrero", img: "/players/nelson-chavez.webp" },
  { first: "Carlos", last: "Díaz", img: "/players/carlos-diaz.webp" },
  { first: "Víctor Manuel", last: "Sánchez Román", img: "/players/victor-sanchez.webp" },
  { first: "Jhostin Rancel", last: "Varela Guerrero", img: "/players/jhostin-varela.webp" },
  { first: "Hubert Alfonso", last: "Batista Robinson", img: "/players/hubert-batista.webp" },
  { first: "Miguel Antonio", last: "Cordero Ramírez", img: "/players/miguel-cordero.webp" },
  { first: "Ulises Joaquín", last: "Alor Montalvo", img: "/players/ulises-alor.webp" },
];

function PlayerCard({ player, index }: { player: Player; index: number }) {
  const hasPhoto = Boolean(player.img);
  const details = [player.age !== undefined ? `${player.age} años` : null, player.height].filter(Boolean).join(" · ");

  return (
    <ScrollReveal delay={(index % 5) * 0.06} className="w-[calc(50%_-_6px)] sm:w-[calc(33.333%_-_8px)] lg:w-[calc(20%_-_13px)]">
      <motion.div
        className="relative group overflow-hidden bg-[#0d0a11] cursor-pointer"
        whileHover={{ scale: 1.03 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Photo (or silhouette placeholder until the real photo is available) */}
        <div className="relative aspect-[3/4] overflow-hidden bg-[#1a1520]">
          {hasPhoto ? (
            <img
              src={player.img}
              alt={`${player.first} ${player.last}`}
              width={640}
              height={800}
              className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <DaneSilhouette className="absolute inset-0 p-12 text-[#B4904B]/20" />
          )}
          {/* Dark overlay always */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#07030B]/90 via-[#07030B]/20 to-transparent" />

          {/* Gold hover overlay */}
          <motion.div
            className="absolute inset-0 bg-[#B4904B]/20"
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          />

          {/* Number badge (only when the number is known) */}
          {player.number !== undefined && (
            <div className="absolute top-3 right-3 w-9 h-9 rounded-full bg-[#B4904B] flex items-center justify-center">
              <span className="font-[family-name:var(--font-gin)] font-black text-[#07030B] text-sm leading-none">
                {player.number}
              </span>
            </div>
          )}
        </div>

        {/* Info — slides up on hover */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 p-4"
          initial={{ y: 0 }}
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <p className="font-[family-name:var(--font-montserrat)] text-white/70 text-[10px] tracking-[0.15em] uppercase mb-0.5">
            {player.first}
          </p>
          <p className="font-[family-name:var(--font-gin)] font-black uppercase text-white text-2xl leading-none tracking-wide">
            {player.last}
          </p>
          {player.pos && (
            <p className="font-[family-name:var(--font-gin)] font-semibold uppercase text-[#B4904B] text-xs tracking-[0.15em] mt-1">
              {player.pos}
            </p>
          )}
          {details && (
            <p className="font-[family-name:var(--font-montserrat)] text-white/50 text-[10px] tracking-wide mt-1.5">
              {details}
            </p>
          )}
          {player.birthplace && (
            <p className="font-[family-name:var(--font-montserrat)] text-white/40 text-[10px] tracking-wide">
              {player.birthplace}
            </p>
          )}
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
        <div className="mb-14">
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

        {/* Grid (la última fila queda centrada) */}
        <div className="flex flex-wrap justify-center gap-3 lg:gap-4">
          {players.map((p, i) => (
            <PlayerCard key={`${p.last}-${p.first}`} player={p} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
