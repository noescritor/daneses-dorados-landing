import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Btn, ClubBadge } from "./ui";

const links = [
  { label: "Equipo", href: "#equipo" },
  { label: "Calendario", href: "#calendario" },
  { label: "Boletos", href: "#boletos" },
  { label: "Únete", href: "#tryouts" },
  { label: "Patrocinadores", href: "#patrocinadores" },
  { label: "Contacto", href: "#footer" },
];

export default function NavBar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-200"
      animate={{
        backgroundColor: scrolled ? "rgba(7,3,11,0.97)" : "rgba(7,3,11,0)",
        backdropFilter: scrolled ? "blur(12px)" : "blur(0px)",
        boxShadow: scrolled ? "0 1px 0 rgba(180,144,75,0.15)" : "none",
      }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <div className="max-w-[1440px] mx-auto px-6 lg:px-12 flex items-center justify-between h-16 lg:h-[72px]">

        {/* Logo */}
        <a href="#hero" className="flex items-center gap-3 shrink-0">
          <motion.div
            animate={{ scale: scrolled ? 0.88 : 1 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <ClubBadge size={scrolled ? 44 : 52} />
          </motion.div>
          <div className="hidden sm:flex flex-col leading-none">
            <span
              className="font-[family-name:var(--font-gin)] font-extrabold text-white text-[15px] tracking-[0.12em] uppercase"
            >
              Daneses Dorados
            </span>
            <span
              className="font-[family-name:var(--font-montserrat)] font-medium text-[#B4904B] text-[10px] tracking-[0.3em] uppercase"
            >
              Morelos
            </span>
          </div>
        </a>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-8">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="font-[family-name:var(--font-montserrat)] font-semibold text-[11px] tracking-[0.18em] uppercase text-white/70 hover:text-[#B4904B] transition-colors duration-150"
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* CTA */}
        <div className="flex items-center gap-3">
          <Btn href="#boletos" className="hidden sm:inline-flex text-[10px] px-5 py-2.5">
            Comprar boletos
          </Btn>

          {/* Mobile hamburger */}
          <MobileMenu />
        </div>
      </div>
    </motion.header>
  );
}

function MobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-9 h-9 flex flex-col justify-center items-center gap-1.5"
        aria-label="Menu"
      >
        <span className={`block w-5 h-0.5 bg-white transition-all duration-200 ${open ? "rotate-45 translate-y-2" : ""}`} />
        <span className={`block w-5 h-0.5 bg-white transition-all duration-200 ${open ? "opacity-0" : ""}`} />
        <span className={`block w-5 h-0.5 bg-white transition-all duration-200 ${open ? "-rotate-45 -translate-y-2" : ""}`} />
      </button>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute top-full left-0 right-0 bg-[#07030B]/98 border-t border-[#B4904B]/20 py-6 px-6 flex flex-col gap-4"
        >
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="font-[family-name:var(--font-montserrat)] font-semibold text-sm tracking-[0.15em] uppercase text-white/80 hover:text-[#B4904B] py-1"
            >
              {l.label}
            </a>
          ))}
          <Btn href="#boletos" className="mt-2 w-full justify-center">Comprar boletos</Btn>
        </motion.div>
      )}
    </div>
  );
}
