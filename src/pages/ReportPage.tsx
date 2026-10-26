import { useCallback, useEffect, useState, type FormEvent } from "react";
import PageShell, { bodyText, goldButton, pageTitle } from "./PageShell";
import { ApiError, type EventReport, type SalesReport, errorMessage, fetchReport, formatEventDate, formatMXN, staffLogin, staffLogout } from "../lib/api";

const label = "font-[family-name:var(--font-montserrat)] font-semibold text-[10px] tracking-[0.2em] uppercase text-white/50";

function Stat({ title, value, note }: { title: string; value: string | number; note?: string }) {
  return (
    <div className="border border-[#B4904B]/30 bg-[#0d0a11] p-4">
      <p className={label}>{title}</p>
      <p className="font-[family-name:var(--font-gin)] font-black text-[#B4904B] text-4xl leading-none mt-2">{value}</p>
      {note && <p className="text-[11px] text-white/40 mt-1.5 font-[family-name:var(--font-montserrat)]">{note}</p>}
    </div>
  );
}

function ZoneRow({ name, sold, capacity, singles, passes, reserved }: { name: string; sold: number; capacity: number; singles: number; passes: number; reserved: number }) {
  const pct = capacity > 0 ? Math.min(100, Math.round((100 * sold) / capacity)) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className={label}>{name}</span>
        <span className="font-[family-name:var(--font-montserrat)] text-sm">
          <strong className="text-white">{sold}</strong>
          <span className="text-white/40"> de {capacity} · {pct}%</span>
        </span>
      </div>
      <div className="h-1.5 bg-white/10 mt-1.5" role="progressbar" aria-valuenow={sold} aria-valuemin={0} aria-valuemax={capacity} aria-label={`${name}: ${sold} de ${capacity}`}>
        <div className="h-full bg-[#B4904B]" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[11px] text-white/45 mt-1 font-[family-name:var(--font-montserrat)]">
        sueltos {singles} · pases {passes}
        {reserved > 0 ? ` · apartados sin pagar ${reserved}` : ""}
      </p>
    </div>
  );
}

function EventCard({ e }: { e: EventReport }) {
  const scanned = e.scanned.general + e.scanned.vip;
  const sold = e.sold.general + e.sold.vip;
  return (
    <section className="border border-white/10 bg-[#0d0a11] p-5 grid gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-[family-name:var(--font-gin)] font-black uppercase text-2xl leading-none">vs {e.rival}</h3>
          <p className={`${bodyText} mt-1`}>{formatEventDate(e.startsAt)}</p>
        </div>
        <span
          className={`shrink-0 border px-2.5 py-1 font-[family-name:var(--font-montserrat)] font-semibold text-[10px] tracking-[0.15em] uppercase ${
            e.played ? "border-white/25 text-white/50" : "border-[#B4904B]/60 text-[#B4904B]"
          }`}
        >
          {e.played ? "Jugado" : "Próximo"}
        </span>
      </div>
      <ZoneRow name="General" sold={e.sold.general} capacity={e.capacity.general} singles={e.singles.general} passes={e.passes.general} reserved={e.reserved.general} />
      <ZoneRow name="VIP" sold={e.sold.vip} capacity={e.capacity.vip} singles={e.singles.vip} passes={e.passes.vip} reserved={e.reserved.vip} />
      <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 border-t border-white/10 pt-3 text-[12px] text-white/60 font-[family-name:var(--font-montserrat)]">
        <span>
          Entradas registradas: <strong className="text-white">{scanned}</strong>
          {sold > 0 && <span className="text-white/40"> de {sold}</span>}
        </span>
        <span>
          Boletos sueltos: <strong className="text-white">{formatMXN(e.singlesRevenueCents)}</strong>
        </span>
      </div>
    </section>
  );
}

export default function ReportPage() {
  const [phase, setPhase] = useState<"checking" | "login" | "ready">("checking");
  const [report, setReport] = useState<SalesReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setReport(await fetchReport());
      setError(null);
      setPhase("ready");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setPhase("login");
      else {
        setError(errorMessage(err));
        setPhase("ready");
      }
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    try {
      await staffLogin(pin);
      setPin("");
      await load();
    } catch (err) {
      setLoginError(errorMessage(err));
    }
  };

  const onLogout = async () => {
    await staffLogout().catch(() => undefined);
    setReport(null);
    setPhase("login");
  };

  const t = report?.totals;

  return (
    <PageShell>
      <h1 className={pageTitle}>Ventas</h1>

      {phase === "checking" && <p className={`${bodyText} mt-6`}>Cargando…</p>}

      {phase === "login" && (
        <form onSubmit={onLogin} className="mt-8 grid gap-4 max-w-xs">
          <label htmlFor="pin" className={label}>
            PIN del staff
          </label>
          <input
            id="pin"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            required
            className="bg-white/5 border border-white/10 text-white px-4 py-3 focus:outline-none focus:border-[#B4904B]/60"
          />
          {loginError && <p role="alert" className="text-[#ff9aa6] text-sm">{loginError}</p>}
          <button type="submit" className={goldButton}>Entrar</button>
        </form>
      )}

      {phase === "ready" && error && (
        <div className="mt-6">
          <p role="alert" className="text-[#ff9aa6] text-sm mb-4">{error}</p>
          <button type="button" onClick={() => void load()} className={goldButton}>Reintentar</button>
        </div>
      )}

      {phase === "ready" && report && t && (
        <div className="mt-6 grid gap-8">
          <div className="grid grid-cols-2 gap-3">
            <Stat title="Ingresos cobrados" value={formatMXN(t.revenueCents)} note="Boletos y pases pagados" />
            <Stat title="Boletos emitidos" value={t.ticketsIssued} note="Cada QR cuenta como uno" />
            <Stat title="Pases vendidos" value={t.passesSold} />
            <Stat title="Entradas registradas" value={t.entriesScanned} note="Escaneos en la puerta" />
          </div>
          {(t.refundedOrders > 0 || t.pendingOrders > 0) && (
            <p className="text-[12px] text-white/50 font-[family-name:var(--font-montserrat)] -mt-4">
              {t.refundedOrders > 0 && <>Reembolsados: {t.refundedOrders} pedido(s) por {formatMXN(t.refundedCents)}. </>}
              {t.pendingOrders > 0 && <>Pedidos aún sin pagar: {t.pendingOrders}.</>}
            </p>
          )}

          <div className="grid gap-4">
            <h2 className="font-[family-name:var(--font-gin)] font-black uppercase text-2xl leading-none">Por partido</h2>
            {report.events.map((e) => (
              <EventCard key={e.id} e={e} />
            ))}
            <p className="text-[11px] text-white/40 font-[family-name:var(--font-montserrat)]">
              Un pase ocupa un lugar en cada partido en casa, por eso aparece en todos. Su dinero no se reparte por partido: está en el total.
            </p>
          </div>

          <div className="grid gap-3">
            <h2 className="font-[family-name:var(--font-gin)] font-black uppercase text-2xl leading-none">Por producto</h2>
            <div className="border border-white/10 divide-y divide-white/10">
              {report.products.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm font-[family-name:var(--font-montserrat)]">
                  <span>
                    {p.name}
                    <span className="block text-[11px] text-white/40">
                      {p.units} boleto(s) · {p.orders} pedido(s)
                    </span>
                  </span>
                  <strong className="text-[#B4904B]">{formatMXN(p.revenueCents)}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[12px] text-white/50 font-[family-name:var(--font-montserrat)]">
            <span>Actualizado {new Intl.DateTimeFormat("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "America/Mexico_City" }).format(new Date(report.generatedAt))}</span>
            <button type="button" onClick={() => void load()} className="underline underline-offset-4 hover:text-white">Actualizar</button>
            <a href="/scan" className="underline underline-offset-4 hover:text-white">Escáner</a>
            <button type="button" onClick={onLogout} className="underline underline-offset-4 hover:text-white">Salir</button>
          </div>
        </div>
      )}
    </PageShell>
  );
}
