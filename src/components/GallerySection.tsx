import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollReveal } from "./ui";

type Photo = { id: string; w: number; h: number; alt: string };

// Archivos en /public/gallery: `${id}.webp` (completa) y `${id}-thumb.webp` (miniatura)
const photos: Photo[] = [
  { id: "01", w: 1067, h: 1600, alt: "Ataque y bloqueo en la red frente a la tribuna" },
  { id: "02", w: 360, h: 540, alt: "Jugador saltando para el saque" },
  { id: "03", w: 1600, h: 1067, alt: "Jugador de Daneses Dorados concentrado durante el partido" },
  { id: "04", w: 640, h: 960, alt: "Jugador atacando en la red" },
  { id: "05", w: 1600, h: 1067, alt: "Jugadores reunidos celebrando en la cancha" },
  { id: "06", w: 1067, h: 1600, alt: "Jugada en la red con el público en las gradas" },
  { id: "07", w: 1600, h: 1067, alt: "Jugador atento durante el partido con la afición detrás" },
  { id: "08", w: 1600, h: 1067, alt: "Jugador caminando con el balón frente al público" },
  { id: "09", w: 1067, h: 1600, alt: "Jugador de espaldas con la camiseta blanca número 10" },
  { id: "10", w: 640, h: 427, alt: "Jugadores del equipo en la cancha antes de entrenar" },
  { id: "11", w: 640, h: 960, alt: "Jugador colocando el balón en la red durante el calentamiento" },
  { id: "12", w: 640, h: 960, alt: "Jugador atento durante el partido" },
  { id: "13", w: 640, h: 427, alt: "Integrante del staff junto a jugadores en el gimnasio" },
  { id: "14", w: 640, h: 960, alt: "Integrantes del staff conversando junto a la cancha" },
  { id: "15", w: 1080, h: 1350, alt: "Retrato de estudio de un jugador girando el balón en un dedo" },
  { id: "16", w: 1080, h: 1350, alt: "Retrato de estudio de un jugador con el balón en las manos" },
  { id: "17", w: 1080, h: 1350, alt: "Retrato de estudio de un jugador con el balón en las manos" },
];

const socials = [
  { handle: "@DanesesDorados", platform: "Instagram" },
  { handle: "@DanesesDorados", platform: "Twitter / X" },
  { handle: "Daneses Dorados Morelos", platform: "Facebook" },
  { handle: "@danesesvb", platform: "TikTok" },
];

export default function GallerySection() {
  const [lightbox, setLightbox] = useState<null | Photo>(null);

  return (
    <section className="bg-[#07030B] py-20 lg:py-28">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-20">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <ScrollReveal>
              <p className="font-[family-name:var(--font-playfair)] italic text-[#B4904B] text-lg mb-2">
                Momentos del campo
              </p>
            </ScrollReveal>
            <ScrollReveal delay={0.07}>
              <h2
                className="font-[family-name:var(--font-gin)] font-black uppercase text-white leading-none"
                style={{ fontSize: "clamp(40px, 5.5vw, 80px)" }}
              >
                GALERÍA
              </h2>
            </ScrollReveal>
          </div>

          {/* Social handles */}
          <ScrollReveal delay={0.12}>
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              {socials.map((s) => (
                <div key={s.platform}>
                  <p className="font-[family-name:var(--font-montserrat)] text-[10px] tracking-[0.15em] uppercase text-white/30">{s.platform}</p>
                  <p className="font-[family-name:var(--font-montserrat)] font-semibold text-[#B4904B] text-sm">{s.handle}</p>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>

        {/* Mosaico: respeta la proporción original de cada foto */}
        <div className="columns-2 sm:columns-3 lg:columns-4 gap-3">
          {photos.map((photo, i) => (
            <ScrollReveal key={photo.id} delay={(i % 4) * 0.05} className="mb-3 break-inside-avoid">
              <button
                className="relative block w-full overflow-hidden group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B4904B]"
                onClick={() => setLightbox(photo)}
                aria-label={`Ver foto: ${photo.alt}`}
              >
                <img
                  src={`/gallery/${photo.id}-thumb.webp`}
                  alt={photo.alt}
                  width={photo.w}
                  height={photo.h}
                  className="block w-full h-auto transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-[#07030B]/0 group-hover:bg-[#B4904B]/15 transition-colors duration-200" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <span className="font-[family-name:var(--font-gin)] font-bold uppercase text-white text-xs tracking-[0.2em] bg-[#07030B]/60 px-3 py-1.5">
                    Ver
                  </span>
                </div>
              </button>
            </ScrollReveal>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[100] bg-[#07030B]/95 flex items-center justify-center p-4 lg:p-12"
            onClick={() => setLightbox(null)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex max-w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={`/gallery/${lightbox.id}.webp`}
                alt={lightbox.alt}
                width={lightbox.w}
                height={lightbox.h}
                className="block max-w-full max-h-[80vh] w-auto h-auto object-contain"
              />
              <button
                className="absolute top-3 right-3 w-9 h-9 bg-[#07030B]/80 text-white flex items-center justify-center hover:bg-[#B4904B] hover:text-[#07030B] transition-colors"
                onClick={() => setLightbox(null)}
                aria-label="Cerrar"
              >
                ✕
              </button>
              <p className="absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] bg-[#07030B]/70 px-2 py-1 font-[family-name:var(--font-montserrat)] text-white/70 text-xs">
                {lightbox.alt}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
