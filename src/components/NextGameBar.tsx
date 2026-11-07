import { useCountdown } from "./ui";
import { useState, useEffect, useRef } from "react";
import { games } from "./CalendarSection";

const homeGames = games.filter((g) => g.home);

/* Next home game that hasn't started yet; re-evaluated every tick so the bar
   rolls over to the following match on its own once a game begins. */
function nextHomeGame(now: number) {
  return homeGames.find((g) => new Date(g.startsAt).getTime() > now);
}

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

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
  const now = useNow();
  const game = nextHomeGame(now);
  if (!game) return null;
  return <NextGameBarContent game={game} />;
}

function NextGameBarContent({ game }: { game: (typeof games)[number] }) {
  const target = new Date(game.startsAt);
  const { days, hours, minutes, seconds } = useCountdown(target);

  return (
    <div className="bg-[#07030B] border-t border-b border-[#B4904B]/25">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-12 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">

        {/* Game info */}
        <div className="flex items-center gap-5">
          <div className="w-1.5 h-10 bg-[#B4904B]" />
          <div>
            <p className="font-[family-name:var(--font-montserrat)] text-[10px] tracking-[0.25em] uppercase text-[#B4904B] mb-0.5">
              Próximo partido en casa
            </p>
            <p className="font-[family-name:var(--font-gin)] font-bold uppercase text-white text-lg lg:text-xl tracking-wide leading-none">
              Daneses vs {game.rival}
            </p>
          </div>
        </div>

        {/* Details + countdown */}
        <div className="flex flex-wrap items-center gap-5 lg:gap-8">
          <div className="text-center">
            <p className="font-[family-name:var(--font-montserrat)] text-[10px] tracking-[0.2em] uppercase text-white/40">Fecha</p>
            <p className="font-[family-name:var(--font-gin)] font-bold text-white text-base uppercase">{game.date} {game.startsAt.slice(0, 4)}</p>
          </div>
          <div className="text-center">
            <p className="font-[family-name:var(--font-montserrat)] text-[10px] tracking-[0.2em] uppercase text-white/40">Sede</p>
            <p className="font-[family-name:var(--font-gin)] font-bold text-white text-base uppercase">Poliforum, Oaxtepec</p>
          </div>
          <div className="text-center">
            <p className="font-[family-name:var(--font-montserrat)] text-[10px] tracking-[0.2em] uppercase text-white/40">Hora</p>
            <p className="font-[family-name:var(--font-gin)] font-bold text-white text-base uppercase">{game.time}</p>
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
