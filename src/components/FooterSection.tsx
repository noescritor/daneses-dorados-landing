import { useState } from "react";
import { GrainOverlay } from "./ui";
import BadgeIcon from "./BadgeIcon";

const navLinks = [
  { label: "Equipo", href: "#equipo" },
  { label: "Calendario", href: "#calendario" },
  { label: "Boletos", href: "#boletos" },
  { label: "Únete", href: "#tryouts" },
  { label: "Patrocinadores", href: "#patrocinadores" },
  { label: "Prensa", href: "#" },
  { label: "Contacto", href: "#footer" },
];

const socials = [
  { label: "IG", href: "#", title: "Instagram" },
  { label: "TW", href: "#", title: "Twitter / X" },
  { label: "FB", href: "#", title: "Facebook" },
  { label: "TK", href: "#", title: "TikTok" },
  { label: "YT", href: "#", title: "YouTube" },
];

export default function FooterSection() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) { setSubscribed(true); setEmail(""); }
  };

  return (
    <footer id="footer" className="relative bg-[#07030B] border-t border-[#B4904B]/15 pt-16 pb-8 overflow-hidden">
      <GrainOverlay />

      <div className="relative z-10 max-w-[1440px] mx-auto px-6 lg:px-20">

        {/* Top row */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-[auto_1fr_auto] gap-10 lg:gap-16 mb-14 pb-14 border-b border-[#B4904B]/10">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-5">
              <BadgeIcon size={60} />
              <div>
                <p className="font-[family-name:var(--font-gin)] font-extrabold uppercase text-white text-base tracking-[0.1em] leading-none">
                  Daneses Dorados
                </p>
                <p className="font-[family-name:var(--font-montserrat)] font-medium text-[#B4904B] text-[10px] tracking-[0.3em] uppercase">
                  Morelos
                </p>
              </div>
            </div>
            <p className="font-[family-name:var(--font-playfair)] italic text-[#B4904B] text-base mb-4">
              Fuerza · Orgullo · Equipo
            </p>
            <p className="font-[family-name:var(--font-montserrat)] text-white/45 text-xs leading-relaxed max-w-xs">
              Club profesional de voleibol representando a Morelos en la Liga Nacional. Temporada 2026.
            </p>
          </div>

          {/* Nav links */}
          <nav className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-3 content-start">
            {navLinks.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="font-[family-name:var(--font-montserrat)] font-semibold text-[11px] tracking-[0.18em] uppercase text-white/50 hover:text-[#B4904B] transition-colors duration-150"
              >
                {l.label}
              </a>
            ))}
          </nav>

          {/* Newsletter */}
          <div className="sm:col-span-2 lg:col-span-1">
            <p className="font-[family-name:var(--font-gin)] font-extrabold uppercase text-white text-lg tracking-wide mb-4">
              Newsletter
            </p>
            <p className="font-[family-name:var(--font-montserrat)] text-white/45 text-xs mb-5 leading-relaxed">
              Resultados, novedades y preventa de boletos directo a tu correo.
            </p>

            {subscribed ? (
              <p className="font-[family-name:var(--font-gin)] font-bold uppercase text-[#B4904B] tracking-wide">
                ¡Suscrito! 🏐
              </p>
            ) : (
              <form onSubmit={handleSubscribe} className="flex gap-0">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  required
                  className="flex-1 min-w-0 bg-white/5 border border-white/10 border-r-0 text-white placeholder:text-white/25 font-[family-name:var(--font-montserrat)] text-xs px-4 py-3 focus:outline-none focus:border-[#B4904B]/50 transition-colors"
                />
                <button
                  type="submit"
                  className="font-[family-name:var(--font-montserrat)] font-700 text-[10px] tracking-[0.15em] uppercase bg-[#B4904B] text-[#07030B] px-5 py-3 hover:brightness-110 transition-all duration-150 active:scale-[0.97] shrink-0"
                >
                  Suscribir
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Bottom row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Social icons */}
          <div className="flex items-center gap-4">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                title={s.title}
                className="w-9 h-9 border border-white/10 flex items-center justify-center font-[family-name:var(--font-gin)] font-bold text-xs text-white/40 hover:border-[#B4904B]/50 hover:text-[#B4904B] transition-all duration-150"
              >
                {s.label}
              </a>
            ))}
          </div>

          {/* Legal */}
          <p className="font-[family-name:var(--font-montserrat)] text-white/25 text-[10px] tracking-[0.1em] text-center">
            © 2026 Daneses Dorados Morelos · Todos los derechos reservados · Aviso de privacidad
          </p>

          {/* Tagline */}
          <p className="font-[family-name:var(--font-gin)] font-extrabold uppercase text-[#B4904B]/30 text-xs tracking-[0.2em]">
            Fuerza · Orgullo · Equipo · 2026
          </p>
        </div>
      </div>
    </footer>
  );
}
