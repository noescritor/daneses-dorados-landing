import { useEffect, useRef, useState, type FormEvent } from "react";
import { type CatalogEvent, type CatalogTier, errorMessage, formatEventDate, formatMXN, startCheckout, ApiError } from "../lib/api";

export interface Selection {
  tier: CatalogTier;
  event: CatalogEvent | null;
  quantity: number;
}

interface Props {
  selection: Selection;
  reservationMinutes: number;
  onClose: () => void;
}

const newKey = () => crypto.randomUUID().replace(/-/g, "");

const inputClass =
  "w-full bg-white/5 border border-white/10 text-white placeholder:text-white/25 font-[family-name:var(--font-montserrat)] text-sm px-4 py-3 focus:outline-none focus:border-[#B4904B]/60 transition-colors";
const labelClass =
  "block font-[family-name:var(--font-montserrat)] font-semibold text-[10px] tracking-[0.2em] uppercase text-white/50 mb-1.5";

export default function CheckoutModal({ selection, reservationMinutes, onClose }: Props) {
  const { tier, event, quantity } = selection;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const keyRef = useRef(newKey());
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await startCheckout({
        tierId: tier.id,
        eventId: event?.id ?? null,
        quantity,
        buyerName: name.trim(),
        buyerEmail: email.trim(),
        idempotencyKey: keyRef.current,
      });
      if (!result.initPoint.startsWith("https://")) throw new ApiError(502, "payment_provider_error");
      window.location.assign(result.initPoint);
    } catch (err) {
      if (err instanceof ApiError && err.code === "order_not_pending") keyRef.current = newKey();
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-[#07030B]/90 flex items-center justify-center p-4 overflow-y-auto"
      onClick={() => !busy && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-title"
        className="relative w-full max-w-md bg-[#0d0a11] border border-[#B4904B]/30 p-7 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          aria-label="Cerrar"
          className="absolute top-3 right-3 w-9 h-9 text-white/60 hover:text-white disabled:opacity-50 transition-colors"
        >
          ✕
        </button>

        <p className="font-[family-name:var(--font-montserrat)] font-semibold text-[10px] tracking-[0.25em] uppercase text-[#B4904B] mb-1">
          Tu compra
        </p>
        <h3 id="checkout-title" className="font-[family-name:var(--font-gin)] font-black uppercase text-white text-3xl leading-none mb-5">
          {quantity > 1 ? `${quantity} × ` : ""}
          {tier.name}
        </h3>

        <div className="border border-white/10 divide-y divide-white/10 mb-6">
          <div className="flex justify-between gap-4 px-4 py-3 text-[13px] text-white/70 font-[family-name:var(--font-montserrat)]">
            <span>{event ? `Daneses vs ${event.rival}` : "Todos los partidos en casa"}</span>
            <span className="text-right text-white/50">{event ? formatEventDate(event.startsAt) : "Semifinales incluidas"}</span>
          </div>
          <div className="flex justify-between px-4 py-3 font-[family-name:var(--font-montserrat)]">
            <span className="text-[11px] tracking-[0.2em] uppercase text-white/50">Total</span>
            <span className="font-bold text-[#B4904B]">{formatMXN(tier.priceCents * quantity)} MXN</span>
          </div>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="buyer-name" className={labelClass}>
              Nombre completo
            </label>
            <input
              id="buyer-name"
              ref={nameRef}
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              maxLength={100}
              autoComplete="name"
              placeholder="Ana Pérez Morales"
            />
          </div>
          <div>
            <label htmlFor="buyer-email" className={labelClass}>
              Correo electrónico
            </label>
            <input
              id="buyer-email"
              type="email"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              maxLength={200}
              autoComplete="email"
              placeholder="ana@ejemplo.com"
            />
            <p className="mt-1.5 text-[11px] text-white/40 font-[family-name:var(--font-montserrat)]">Es el correo de tu comprobante de pago de Mercado Pago.</p>
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} required className="mt-1 accent-[#B4904B]" />
            <span className="text-[12px] leading-snug text-white/60 font-[family-name:var(--font-montserrat)]">
              Acepto el aviso de privacidad y las condiciones de compra. Mis datos se usan solo para procesar mi compra y emitir mis boletos.
            </span>
          </label>

          {error && (
            <p role="alert" className="text-[13px] text-[#ff9aa6] font-[family-name:var(--font-montserrat)]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || !accepted}
            className="w-full font-[family-name:var(--font-montserrat)] font-700 text-[11px] tracking-[0.15em] uppercase bg-[#B4904B] text-[#07030B] py-4 hover:brightness-110 transition-all duration-150 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? "Redirigiendo a Mercado Pago…" : "Pagar con Mercado Pago"}
          </button>
          <p className="text-center text-[11px] text-white/40 font-[family-name:var(--font-montserrat)]">
            Apartamos tus lugares por {reservationMinutes} minutos mientras completas el pago.
          </p>
        </form>
      </div>
    </div>
  );
}
