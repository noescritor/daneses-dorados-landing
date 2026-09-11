import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollReveal } from "./ui";

const photos = [
  { id: "photo-1729564615215-9df5ef19b971", alt: "Remate en juego", span: "col-span-1 row-span-2" },
  { id: "photo-1758119354171-f14f082c5e02", alt: "Jugador saltando en noche de partido", span: "col-span-1" },
  { id: "photo-1786025164139-ae27c4aafa3e", alt: "Equipo en cancha", span: "col-span-1" },
  { id: "photo-1701908640393-d337f0506abf", alt: "Bloqueo al ataque", span: "col-span-1 row-span-2" },
  { id: "photo-1673058577973-68b6b6d53ccd", alt: "Acción de partido", span: "col-span-1" },
  { id: "photo-1729564389462-0460255c59c1", alt: "Recepción de balón", span: "col-span-1" },
  { id: "photo-1729564360311-0bfc7950f930", alt: "Concentración al saque", span: "col-span-1" },
  { id: "photo-1783973566213-993d8ff29c3a", alt: "Celebración de punto", span: "col-span-1" },
];

const socials = [
  { handle: "@DanesesDorados", platform: "Instagram" },
  { handle: "@DanesesDorados", platform: "Twitter / X" },
  { handle: "Daneses Dorados Morelos", platform: "Facebook" },
  { handle: "@danesesvb", platform: "TikTok" },
];

function getUrl(id: string, w: number, h: number) {
  return `https://images.unsplash.com/${id}?w=${w}&h=${h}&fit=crop&auto=format&q=80`;
}

export default function GallerySection() {
  const [lightbox, setLightbox] = useState<null | typeof photos[0]>(null);

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

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 auto-rows-[200px] lg:auto-rows-[220px] gap-3">
          {photos.map((photo, i) => (
            <ScrollReveal key={photo.id + i} delay={i * 0.05} className={photo.span}>
              <button
                className="relative w-full h-full overflow-hidden group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B4904B]"
                onClick={() => setLightbox(photo)}
                aria-label={`Ver foto: ${photo.alt}`}
              >
                <img
                  src={getUrl(photo.id, 600, 500)}
                  alt={photo.alt}
                  className="w-full h-full object-cover filter contrast-115 brightness-90 transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
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
              className="relative max-w-4xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={getUrl(lightbox.id, 1200, 900)}
                alt={lightbox.alt}
                className="w-full h-full object-contain"
              />
              <button
                className="absolute top-3 right-3 w-9 h-9 bg-[#07030B]/80 text-white flex items-center justify-center hover:bg-[#B4904B] hover:text-[#07030B] transition-colors"
                onClick={() => setLightbox(null)}
                aria-label="Cerrar"
              >
                ✕
              </button>
              <p className="absolute bottom-3 left-4 font-[family-name:var(--font-montserrat)] text-white/50 text-xs">{lightbox.alt}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
