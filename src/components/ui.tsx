import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef, useEffect, useState, ReactNode } from "react";

/* ─── Brand tokens ─────────────────────────────────────────── */
export const GOLD = "#B4904B";
export const BLACK = "#07030B";
export const GRAY = "#E6E6E5";

/* ─── Hooks ─────────────────────────────────────────────────── */

export function useCountdown(target: Date) {
  const calc = () => {
    const diff = target.getTime() - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
    };
  };
  const [time, setTime] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

export function useCountUp(to: number, inView: boolean, duration = 1.8) {
  const [count, setCount] = useState(0);
  const prefersReduced = useReducedMotion();
  useEffect(() => {
    if (!inView) return;
    if (prefersReduced) { setCount(to); return; }
    const fps = 60;
    const frames = duration * fps;
    const step = to / frames;
    let cur = 0;
    const id = setInterval(() => {
      cur += step;
      if (cur >= to) { setCount(to); clearInterval(id); }
      else setCount(Math.floor(cur));
    }, 1000 / fps);
    return () => clearInterval(id);
  }, [inView, to, duration, prefersReduced]);
  return count;
}

/* ─── ScrollReveal ───────────────────────────────────────────── */
interface ScrollRevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  y?: number;
}

export function ScrollReveal({ children, delay = 0, className, y = 28 }: ScrollRevealProps) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={prefersReduced ? false : { opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* ─── Sunburst ───────────────────────────────────────────────── */
export function Sunburst({ className }: { className?: string }) {
  const prefersReduced = useReducedMotion();
  const rays = Array.from({ length: 36 }, (_, i) => {
    const angle = (i * 10) * (Math.PI / 180);
    const inner = 55;
    const outer = i % 3 === 0 ? 200 : i % 3 === 1 ? 170 : 145;
    return { x1: 200 + inner * Math.cos(angle), y1: 200 + inner * Math.sin(angle), x2: 200 + outer * Math.cos(angle), y2: 200 + outer * Math.sin(angle) };
  });

  return (
    <motion.div
      className={className}
      animate={prefersReduced ? {} : { rotate: 360 }}
      transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
    >
      <svg viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {rays.map((r, i) => (
          <line
            key={i}
            x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2}
            stroke={GOLD}
            strokeWidth={i % 3 === 0 ? "2" : "0.9"}
            strokeLinecap="round"
            opacity={i % 3 === 0 ? "1" : "0.6"}
          />
        ))}
        <circle cx="200" cy="200" r="40" stroke={GOLD} strokeWidth="1.5" fill="none" opacity="0.5" />
        <circle cx="200" cy="200" r="20" fill={GOLD} opacity="0.3" />
      </svg>
    </motion.div>
  );
}

/* ─── Great Dane Silhouette ──────────────────────────────────── */
export function DaneSilhouette({ className }: { className?: string }) {
  return (
    <div className={className}>
      <svg viewBox="0 0 300 400" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* Simplified Great Dane profile silhouette */}
        <path d="
          M 70 395
          L 70 270
          Q 65 240 58 220
          Q 50 200 55 180
          Q 60 165 75 165
          L 75 150
          Q 72 120 80 100
          Q 85 85 95 80
          Q 100 75 105 72
          L 110 55
          Q 112 42 118 38
          L 128 35
          Q 135 35 140 40
          L 142 55
          Q 148 70 145 85
          Q 152 90 158 100
          Q 168 118 165 140
          Q 164 158 162 170
          L 180 168
          Q 200 165 215 170
          Q 235 178 240 200
          Q 248 230 238 265
          Q 232 285 228 310
          L 228 395
          L 208 395
          L 208 310
          Q 210 285 215 265
          Q 220 245 218 225
          Q 215 210 205 205
          L 185 203
          L 185 395
          L 165 395
          L 165 200
          L 148 200
          L 148 395
          L 128 395
          L 128 240
          Q 122 218 112 210
          Q 100 205 92 210
          L 90 395
          Z
        " />
        {/* Ear */}
        <path d="M 118 38 Q 122 20 130 12 Q 136 6 140 12 L 142 35" />
        {/* Eye */}
        <circle cx="132" cy="60" r="4" fill={BLACK} />
      </svg>
    </div>
  );
}

/* ─── Club Badge ─────────────────────────────────────────────── */
export function ClubBadge({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer ring */}
      <circle cx="60" cy="60" r="57" stroke={GOLD} strokeWidth="2" fill={BLACK} />
      <circle cx="60" cy="60" r="52" stroke={GOLD} strokeWidth="0.5" fill="none" opacity="0.4" />

      {/* Shield shape */}
      <path
        d="M 60 16 L 88 26 L 88 62 Q 88 84 60 98 Q 32 84 32 62 L 32 26 Z"
        fill={GOLD}
        opacity="0.12"
        stroke={GOLD}
        strokeWidth="1"
      />

      {/* "DD" monogram */}
      <text
        x="60" y="58"
        textAnchor="middle"
        fontFamily="'Barlow Condensed', sans-serif"
        fontWeight="900"
        fontSize="26"
        fill={GOLD}
        letterSpacing="2"
      >
        DD
      </text>

      {/* Stars row */}
      <text x="60" y="74" textAnchor="middle" fontSize="8" fill={GOLD} opacity="0.9">★ ★ ★</text>

      {/* Bottom text */}
      <text
        x="60" y="90"
        textAnchor="middle"
        fontFamily="'Montserrat', sans-serif"
        fontWeight="700"
        fontSize="6.5"
        fill={GOLD}
        letterSpacing="2"
        textDecoration="none"
      >
        MORELOS
      </text>

      {/* Top arc text simulation */}
      <path id="topArc" d="M 16 60 A 44 44 0 0 1 104 60" fill="none" />
      <text fontFamily="'Montserrat', sans-serif" fontWeight="700" fontSize="6" fill={GOLD} letterSpacing="1.5">
        <textPath href="#topArc" startOffset="50%" textAnchor="middle">DANESES DORADOS</textPath>
      </text>
    </svg>
  );
}

/* ─── GrainOverlay ───────────────────────────────────────────── */
export function GrainOverlay() {
  return <div className="grain-overlay pointer-events-none absolute inset-0 z-10" aria-hidden="true" />;
}

/* ─── Gold Button ────────────────────────────────────────────── */
interface BtnProps {
  children: ReactNode;
  variant?: "gold" | "outline";
  className?: string;
  onClick?: () => void;
  href?: string;
}

export function Btn({ children, variant = "gold", className = "", onClick, href }: BtnProps) {
  const base =
    "inline-flex items-center justify-center font-montserrat font-700 text-xs tracking-[0.15em] uppercase px-7 py-3.5 transition-all duration-150 ease-out cursor-pointer select-none active:scale-[0.97]";
  const styles =
    variant === "gold"
      ? `bg-[#B4904B] text-[#07030B] hover:brightness-110`
      : `border border-white text-white hover:bg-white hover:text-[#07030B]`;

  if (href) {
    return (
      <a href={href} className={`${base} ${styles} ${className}`}>
        {children}
      </a>
    );
  }
  return (
    <button onClick={onClick} className={`${base} ${styles} ${className}`}>
      {children}
    </button>
  );
}
