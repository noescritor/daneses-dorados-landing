import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ScrollReveal, GrainOverlay } from "./ui";
import CheckoutModal, { type Selection } from "./CheckoutModal";
import { type Catalog, type CatalogEvent, type CatalogTier, errorMessage, fetchCatalog, formatEventDate } from "../lib/api";

const pesos = (cents: number) => (cents / 100).toLocaleString("es-MX");

interface TicketCardProps {
  tier: CatalogTier;
  perks: string[];
  desc: string;
  available: number;
  maxQuantity: number;
  featured?: boolean;
  badge?: string;
  selector?: ReactNode;
  disabledReason?: string;
  cta: string;
  onBuy: (quantity: number) => void;
}

function TicketCard({ tier, perks, desc, available, maxQuantity, featured = false, badge, selector, disabledReason, cta, onBuy }: TicketCardProps) {
  const [quantity, setQuantity] = useState(1);
  const limit = Math.max(1, Math.min(maxQuantity, available));
  const qty = Math.min(quantity, limit);
  const soldOut = available < 1;
  const disabled = soldOut || Boolean(disabledReason);

  const stepper = "w-8 h-8 flex items-center justify-center border transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
  const stepperTone = featured ? "border-[#07030B]/40 hover:bg-[#07030B]/10" : "border-[#B4904B]/40 text-[#B4904B] hover:bg-[#B4904B]/10";

  return (
    <div
      className={`relative flex flex-col h-full p-8 transition-all duration-200 hover:-translate-y-1 ${
        featured ? "bg-[#B4904B] text-[#07030B]" : "bg-[#0d0a11] border border-[#B4904B]/20 text-white hover:border-[#B4904B]/50"
      }`}
    >
      {badge && (
        <div className="absolute -top-3 left-8">
          <span className="font-[family-name:var(--font-montserrat)] font-bold text-[9px] tracking-[0.25em] uppercase bg-[#07030B] text-[#B4904B] px-3 py-1">
            {badge}
          </span>
        </div>
      )}

      <p className={`font-[family-name:var(--font-montserrat)] font-semibold text-[11px] tracking-[0.25em] uppercase mb-3 ${featured ? "text-[#07030B]/70" : "text-[#B4904B]"}`}>
        {featured ? "Pase de Temporada" : tier.name}
      </p>

      {selector}

      <div className="flex items-baseline gap-1 mb-4">
        <span className={`font-[family-name:var(--font-gin)] font-black leading-none text-7xl ${featured ? "text-[#07030B]" : "text-[#B4904B]"}`}>
          ${pesos(tier.priceCents)}
        </span>
        <span className={`font-[family-name:var(--font-montserrat)] font-medium text-sm ${featured ? "text-[#07030B]/60" : "text-white/40"}`}>MXN</span>
      </div>

      <p className={`font-[family-name:var(--font-montserrat)] text-[13px] leading-relaxed mb-6 ${featured ? "text-[#07030B]/75" : "text-white/55"}`}>{desc}</p>

      <ul className="flex-1 flex flex-col gap-2.5 mb-6">
        {perks.map((perk) => (
          <li key={perk} className="flex items-center gap-3">
            <span className={`text-sm ${featured ? "text-[#07030B]" : "text-[#B4904B]"}`}>✓</span>
            <span className={`font-[family-name:var(--font-montserrat)] text-[13px] ${featured ? "text-[#07030B]/80" : "text-white/65"}`}>{perk}</span>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3" role="group" aria-label="Cantidad">
          <button type="button" className={`${stepper} ${stepperTone}`} onClick={() => setQuantity(Math.max(1, qty - 1))} disabled={disabled || qty <= 1} aria-label="Menos">
            −
          </button>
          <span className="w-6 text-center font-[family-name:var(--font-montserrat)] font-semibold" aria-live="polite">
            {qty}
          </span>
          <button type="button" className={`${stepper} ${stepperTone}`} onClick={() => setQuantity(Math.min(limit, qty + 1))} disabled={disabled || qty >= limit} aria-label="Más">
            +
          </button>
        </div>
        <span className={`font-[family-name:var(--font-montserrat)] text-[11px] ${featured ? "text-[#07030B]/60" : "text-white/40"}`}>
          {soldOut ? "Agotado" : available <= 20 ? `Quedan ${available}` : ""}
        </span>
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onBuy(qty)}
        className={`w-full font-[family-name:var(--font-montserrat)] font-700 text-[11px] tracking-[0.15em] uppercase py-3.5 transition-colors duration-150 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed ${
          featured
            ? "bg-[#07030B] text-[#B4904B] hover:bg-[#07030B]/80"
            : "border border-[#B4904B]/50 text-[#B4904B] hover:bg-[#B4904B]/10"
        }`}
      >
        {soldOut ? "Agotado" : (disabledReason ?? cta)}
      </button>
    </div>
  );
}

function PassCard({ catalog, onBuy }: { catalog: Catalog; onBuy: (tier: CatalogTier, quantity: number) => void }) {
  const [seatClass, setSeatClass] = useState<"general" | "vip">("general");
  const pass = catalog.tiers.find((t) => t.kind === "pass" && t.seatClass === seatClass);
  const single = catalog.tiers.find((t) => t.kind === "single" && t.seatClass === seatClass);
  if (!pass) return null;

  const games = catalog.events.length;
  const savings = single ? games * single.priceCents - pass.priceCents : 0;
  const perks = [
    games === 1 ? "El partido en casa que queda de la temporada" : `Los ${games} partidos en casa que quedan de la temporada`,
    "Semifinales en casa incluidas",
    ...(savings > 0 ? [`Ahorras $${pesos(savings)} frente a ${games} boletos individuales`] : []),
  ];

  const selector = (
    <div className="flex mb-5 border border-[#07030B]/40" role="group" aria-label="Tipo de pase">
      {(["general", "vip"] as const).map((c) => (
        <button
          key={c}
          type="button"
          aria-pressed={seatClass === c}
          onClick={() => setSeatClass(c)}
          className={`flex-1 font-[family-name:var(--font-montserrat)] font-semibold text-[11px] tracking-[0.2em] uppercase py-2 transition-colors duration-150 ${
            seatClass === c ? "bg-[#07030B] text-[#B4904B]" : "text-[#07030B]/70 hover:bg-[#07030B]/10"
          }`}
        >
          {c === "general" ? "General" : "VIP"}
        </button>
      ))}
    </div>
  );

  return (
    <TicketCard
      key={pass.id}
      featured
      badge={savings > 0 ? "Mejor valor" : undefined}
      tier={pass}
      selector={selector}
      desc={`Acceso a la zona ${seatClass === "general" ? "general" : "VIP"} en todos los partidos de local de la temporada.`}
      perks={perks}
      available={catalog.passAvailable[seatClass]}
      maxQuantity={catalog.limits.maxQuantity}
      disabledReason={games === 0 ? "Sin partidos en venta" : undefined}
      cta="Comprar pase"
      onBuy={(q) => onBuy(pass, q)}
    />
  );
}

export default function TicketsSection() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);

  const load = useCallback(() => {
    setError(null);
    fetchCatalog()
      .then((c) => {
        setCatalog(c);
        setEventId((prev) => (prev && c.events.some((e) => e.id === prev) ? prev : (c.events[0]?.id ?? null)));
      })
      .catch((err) => setError(errorMessage(err)));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const event: CatalogEvent | undefined = catalog?.events.find((e) => e.id === eventId);
  const singles = catalog?.tiers.filter((t) => t.kind === "single") ?? [];

  return (
    <section id="boletos" className="relative bg-[#07030B] py-20 lg:py-28 overflow-hidden">
      <GrainOverlay />

      <div className="relative z-10 max-w-[1440px] mx-auto px-6 lg:px-20">
        <div className="mb-12 text-center lg:text-left">
          <ScrollReveal>
            <p className="font-[family-name:var(--font-playfair)] italic text-[#B4904B] text-lg mb-2">Temporada 2026</p>
          </ScrollReveal>
          <ScrollReveal delay={0.08}>
            <h2 className="font-[family-name:var(--font-gin)] font-black uppercase text-white leading-none" style={{ fontSize: "clamp(48px, 7vw, 96px)" }}>
              BOLETOS Y PASES
            </h2>
          </ScrollReveal>
        </div>

        {error && (
          <div className="border border-[#B4904B]/30 p-6 text-center">
            <p className="text-white/70 text-sm mb-4 font-[family-name:var(--font-montserrat)]">{error}</p>
            <button type="button" onClick={load} className="font-[family-name:var(--font-montserrat)] font-semibold text-[11px] tracking-[0.2em] uppercase text-[#B4904B] border border-[#B4904B]/50 px-6 py-3 hover:bg-[#B4904B]/10 transition-colors">
              Reintentar
            </button>
          </div>
        )}

        {!error && !catalog && <p className="text-white/50 text-sm font-[family-name:var(--font-montserrat)]">Cargando boletos…</p>}

        {catalog && (
          <>
            {catalog.events.length > 0 ? (
              <div className="mb-10">
                <p className="font-[family-name:var(--font-montserrat)] font-semibold text-[10px] tracking-[0.25em] uppercase text-white/50 mb-3">
                  Elige el partido (boletos individuales)
                </p>
                <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Partido">
                  {catalog.events.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      role="radio"
                      aria-checked={e.id === eventId}
                      onClick={() => setEventId(e.id)}
                      className={`text-left px-4 py-3 border transition-colors ${
                        e.id === eventId ? "border-[#B4904B] bg-[#B4904B]/10" : "border-white/10 hover:border-[#B4904B]/50"
                      }`}
                    >
                      <span className="block font-[family-name:var(--font-gin)] font-bold uppercase text-white text-base leading-none">vs {e.rival}</span>
                      <span className="block font-[family-name:var(--font-montserrat)] text-[11px] text-white/50 mt-1">{formatEventDate(e.startsAt)}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-white/60 text-sm mb-10 font-[family-name:var(--font-montserrat)]">Por ahora no hay partidos en casa a la venta.</p>
            )}

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
              {singles.map((tier, i) => (
                <ScrollReveal key={tier.id} delay={i * 0.09}>
                  <TicketCard
                    tier={tier}
                    desc={`Acceso a la zona ${tier.seatClass === "general" ? "general" : "VIP"} en el partido que elijas.`}
                    perks={[tier.seatClass === "general" ? "Zona general" : "Zona VIP", "Un boleto por persona"]}
                    available={event ? event.available[tier.seatClass] : 0}
                    maxQuantity={catalog.limits.maxQuantity}
                    disabledReason={event ? undefined : "Elige un partido"}
                    cta="Comprar boletos"
                    onBuy={(quantity) => event && setSelection({ tier, event, quantity })}
                  />
                </ScrollReveal>
              ))}
              <ScrollReveal delay={0.18} className="sm:col-span-2 lg:col-span-1">
                <PassCard catalog={catalog} onBuy={(tier, quantity) => setSelection({ tier, event: null, quantity })} />
              </ScrollReveal>
            </div>
          </>
        )}
      </div>

      {selection && catalog && (
        <CheckoutModal
          selection={selection}
          reservationMinutes={catalog.limits.reservationMinutes}
          onClose={() => {
            setSelection(null);
            load();
          }}
        />
      )}
    </section>
  );
}
