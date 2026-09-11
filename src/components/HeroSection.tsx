import { motion, useReducedMotion } from "framer-motion";
import { Sunburst, GrainOverlay, Btn } from "./ui";
import DaneWatermark from "./DaneWatermark";

const HERO_IMG = "https://images.unsplash.com/photo-1758119354171-f14f082c5e02?w=1800&h=1200&fit=crop&auto=format&q=85";

const titleLines = ["DANESES", "DORADOS", "MORELOS"];

export default function HeroSection() {
  const prefersReduced = useReducedMotion();

  const containerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: prefersReduced ? 0 : 0.13, delayChildren: 0.25 } },
  };

  const bezier: [number, number, number, number] = [0.16, 1, 0.3, 1];
  const lineVariants = {
    hidden: { opacity: 0, y: prefersReduced ? 0 : 36 },
    show: { opacity: 1, y: 0, transition: { duration: 0.65, ease: bezier } },
  };

  const fadeVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.7 } },
  };

  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#07030B]"
    >
      {/* Background photo */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('${HERO_IMG}')` }}
      />

      {/* Overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#07030B]/80 via-[#07030B]/60 to-[#07030B]/90" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#07030B]/70 via-transparent to-[#07030B]/30" />

      {/* Grain */}
      <GrainOverlay />

      {/* Sunburst — top right */}
      <Sunburst className="absolute top-[-15%] right-[-10%] w-[55%] max-w-[700px] opacity-[0.13] z-10 pointer-events-none" />

      {/* Great Dane silhouette watermark — bottom right (real import) */}
      <motion.div
        className="absolute bottom-0 right-[-4%] w-[42%] max-w-[500px] z-10 pointer-events-none"
        style={{ opacity: 0.09 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.09 }}
        transition={{ duration: 1.2, delay: 0.9, ease: "easeOut" }}
      >
        <DaneWatermark />
      </motion.div>

      {/* Hero content */}
      <div className="relative z-20 max-w-[1440px] mx-auto px-6 lg:px-20 pt-24 pb-20 w-full">
        <div className="max-w-4xl">
          {/* Eyebrow */}
          <motion.p
            initial={prefersReduced ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="font-[family-name:var(--font-playfair)] italic text-[#B4904B] text-lg lg:text-xl mb-4 tracking-wide"
          >
            Voleibol Profesional · Morelos
          </motion.p>

          {/* Main title */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="mb-6"
          >
            {titleLines.map((line, i) => (
              <motion.div key={i} variants={lineVariants} className="overflow-hidden leading-none">
                <h1
                  className="font-[family-name:var(--font-gin)] font-black uppercase text-white"
                  style={{
                    fontSize: "clamp(72px, 12vw, 176px)",
                    lineHeight: 0.9,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {line}
                </h1>
              </motion.div>
            ))}
          </motion.div>

          {/* Divider rule */}
          <motion.div
            initial={prefersReduced ? false : { scaleX: 0, originX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.7, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="w-24 h-[2px] bg-[#B4904B] mb-6"
          />

          {/* Subtitle */}
          <motion.p
            variants={fadeVariants}
            initial="hidden"
            animate="show"
            transition={{ delay: 0.75 }}
            className="font-[family-name:var(--font-montserrat)] font-medium text-white/70 text-base lg:text-lg tracking-[0.06em] uppercase mb-10"
          >
            Fuerza · Orgullo · Equipo — Temporada 2026
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={prefersReduced ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.9 }}
            className="flex flex-wrap gap-4"
          >
            <Btn href="#boletos" className="text-sm px-8 py-4">
              Comprar boletos
            </Btn>
            <Btn href="#equipo" variant="outline" className="text-sm px-8 py-4">
              Conoce al equipo
            </Btn>
          </motion.div>
        </div>
      </div>

      {/* Scroll hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.8 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2"
      >
        <span className="font-[family-name:var(--font-montserrat)] text-[10px] tracking-[0.3em] uppercase text-white/40">
          Scroll
        </span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          className="w-px h-8 bg-gradient-to-b from-[#B4904B]/60 to-transparent"
        />
      </motion.div>
    </section>
  );
}
