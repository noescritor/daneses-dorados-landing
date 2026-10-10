import type { ReactNode } from "react";
import BadgeIcon from "../components/BadgeIcon";

export default function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#07030B] text-white">
      <header className="border-b border-[#B4904B]/20">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center">
          <a href="/" className="flex items-center gap-3">
            <BadgeIcon size={40} />
            <span className="font-[family-name:var(--font-gin)] font-extrabold uppercase text-[15px] tracking-[0.12em]">Daneses Dorados</span>
          </a>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-10">{children}</main>
    </div>
  );
}

export const pageTitle = "font-[family-name:var(--font-gin)] font-black uppercase leading-none text-4xl sm:text-5xl";
export const bodyText = "font-[family-name:var(--font-montserrat)] text-white/70 text-sm leading-relaxed";
export const goldButton =
  "inline-flex items-center justify-center font-[family-name:var(--font-montserrat)] font-semibold text-[11px] tracking-[0.15em] uppercase bg-[#B4904B] text-[#07030B] px-6 py-3.5 hover:brightness-110 transition-all";
