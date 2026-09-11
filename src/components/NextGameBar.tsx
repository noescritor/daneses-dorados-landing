import { useCountdown } from "./ui";
import { useState, useEffect, useRef } from "react";

const TARGET = new Date("2026-09-20T19:00:00-06:00");

function FlipUnit({ value, label }: { value: number; label: string }) {
  const [prev, setPrev] = useState(value);
  const [flipping, setFlipping] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (value !== prev) {
      setFlipping(true);
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setPrev(value);
        setFlipping(false);
      }, 250);
    }
  }, [value, prev]);

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-12 h-12 lg:w-14 lg:h-14 bg-[#07030B] border border-[#B4904B]/30 flex items-center justify-center overflow-hidden">
        <span
          key={value}
          className={`font-[family-name:var(--font-gin)] font-black text-[#B4904B] text-2xl lg:text-3xl leading-none ${flipping ? "flip-digit" : ""}`}
        >
          {String(value).padStart(2, "0")}
        </span>
      </div>
      <span className="font-[family-name:var(--font-montserrat)] text-[9px] tracking-[0.2em] uppercase text-white/40 mt-1">
        {label}
      </span>
    </div>
  );
}

export default function NextGameBar() {
  const { days, hours, minutes, seconds } = useCountdown(TARGET);

  return (
    <div className="bg-[#07030B] border-t border-b border-[#B4904B]/25">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-12 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">

        {/* Game info */}
        <div className="flex items-center gap-5">
          <div className="w-1.5 h-10 bg-[#B4904B]" />
          <div>
            <p className="font-[family-name:var(--font-montserrat)] text-[10px] tracking-[0.25em] uppercase text-[#B4904B] mb-0.5">
              Próximo partido
            </p>
            <p className="font-[family-name:var(--font-gin)] font-bold uppercase text-white text-lg lg:text-xl tracking-wide leading-none">
              Daneses vs Soles de Culiacán
            </p>
          </div>
        </div>

        {/* Details + countdown */}
        <div className="flex flex-wrap items-center gap-5 lg:gap-8">
          <div className="text-center">
            <p className="font-[family-name:var(--font-montserrat)] text-[10px] tracking-[0.2em] uppercase text-white/40">Fecha</p>
            <p className="font-[family-name:var(--font-gin)] font-bold text-white text-base uppercase">20 Sep 2026</p>
          </div>
          <div className="text-center">
            <p className="font-[family-name:var(--font-montserrat)] text-[10px] tracking-[0.2em] uppercase text-white/40">Sede</p>
            <p className="font-[family-name:var(--font-gin)] font-bold text-white text-base uppercase">Auditorio Morelos</p>
          </div>
          <div className="text-center">
            <p className="font-[family-name:var(--font-montserrat)] text-[10px] tracking-[0.2em] uppercase text-white/40">Hora</p>
            <p className="font-[family-name:var(--font-gin)] font-bold text-white text-base uppercase">19:00 h</p>
          </div>

          {/* Countdown */}
          <div className="flex items-start gap-1.5">
            <FlipUnit value={days} label="días" />
            <span className="font-[family-name:var(--font-gin)] font-black text-[#B4904B] text-2xl pt-2">:</span>
            <FlipUnit value={hours} label="hrs" />
            <span className="font-[family-name:var(--font-gin)] font-black text-[#B4904B] text-2xl pt-2">:</span>
            <FlipUnit value={minutes} label="min" />
            <span className="font-[family-name:var(--font-gin)] font-black text-[#B4904B] text-2xl pt-2">:</span>
            <FlipUnit value={seconds} label="seg" />
          </div>
        </div>

        {/* CTA */}
        <a
          href="#boletos"
          className="shrink-0 font-[family-name:var(--font-montserrat)] font-700 text-[10px] tracking-[0.15em] uppercase bg-[#B4904B] text-[#07030B] px-6 py-3 hover:brightness-110 transition-all duration-150 active:scale-[0.97]"
        >
          Comprar boletos
        </a>
      </div>
    </div>
  );
}
