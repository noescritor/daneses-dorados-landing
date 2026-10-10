import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import jsQR from "jsqr";
import PageShell, { bodyText, goldButton, pageTitle } from "./PageShell";
import { ApiError, type ScanResult, errorMessage, fetchStaffEvents, formatEventDate, scanCode, staffLogin, staffLogout } from "../lib/api";

type StaffEvent = { id: string; rival: string; startsAt: string; stage: string };

const RESULT_STYLE: Record<ScanResult["result"], { title: string; tone: string }> = {
  ok: { title: "Acceso permitido", tone: "border-[#7ee2a0] bg-[#7ee2a0]/15 text-[#7ee2a0]" },
  already_used: { title: "Boleto ya usado", tone: "border-[#ff9aa6] bg-[#ff9aa6]/15 text-[#ff9aa6]" },
  wrong_event: { title: "Boleto de otro partido", tone: "border-[#ffd391] bg-[#ffd391]/15 text-[#ffd391]" },
  voided: { title: "Boleto anulado", tone: "border-[#ff9aa6] bg-[#ff9aa6]/15 text-[#ff9aa6]" },
  invalid: { title: "Código no válido", tone: "border-[#ff9aa6] bg-[#ff9aa6]/15 text-[#ff9aa6]" },
};

const closestEvent = (events: StaffEvent[]) =>
  [...events].sort((a, b) => Math.abs(new Date(a.startsAt).getTime() - Date.now()) - Math.abs(new Date(b.startsAt).getTime() - Date.now()))[0]?.id ?? "";

function ResultPanel({ data }: { data: ScanResult }) {
  const style = RESULT_STYLE[data.result];
  return (
    <div role="status" aria-live="assertive" className={`border-2 p-5 ${style.tone}`}>
      <p className="font-[family-name:var(--font-gin)] font-black uppercase text-3xl leading-none">{style.title}</p>
      {"tierName" in data && (
        <p className="mt-2 text-white/80 font-[family-name:var(--font-montserrat)] text-sm">
          {data.tierName} · {data.buyerName}
        </p>
      )}
      {data.result === "already_used" && (
        <p className="mt-1 text-white/60 font-[family-name:var(--font-montserrat)] text-xs">
          Escaneado a las {new Intl.DateTimeFormat("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "America/Mexico_City" }).format(new Date(data.scannedAt))}
        </p>
      )}
    </div>
  );
}

function Scanner({ eventId, onUnauthorized }: { eventId: string; onUnauthorized: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastRef = useRef({ code: "", at: 0 });
  const busyRef = useRef(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [manual, setManual] = useState("");

  const submit = useCallback(
    async (code: string) => {
      if (busyRef.current) return;
      busyRef.current = true;
      try {
        const data = await scanCode(code, eventId);
        setRequestError(null);
        setResult(data);
        navigator.vibrate?.(data.result === "ok" ? 80 : [120, 60, 120]);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) onUnauthorized();
        else setRequestError(errorMessage(err));
      } finally {
        busyRef.current = false;
      }
    },
    [eventId, onUnauthorized],
  );

  useEffect(() => {
    let raf = 0;
    let stream: MediaStream | undefined;
    let cancelled = false;

    const tick = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
        const scale = Math.min(1, 640 / Math.max(video.videoWidth, video.videoHeight));
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const qr = jsQR(frame.data, frame.width, frame.height, { inversionAttempts: "dontInvert" });
          const now = Date.now();
          if (qr?.data && (qr.data !== lastRef.current.code || now - lastRef.current.at > 4000)) {
            lastRef.current = { code: qr.data, at: now };
            void submit(qr.data);
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };

    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "environment" } })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          void videoRef.current.play();
        }
        raf = requestAnimationFrame(tick);
      })
      .catch(() => setCameraError("No se pudo abrir la cámara. Revisa el permiso del navegador o captura el código a mano."));

    if (!navigator.mediaDevices) setCameraError("Este navegador no permite usar la cámara. Captura el código a mano.");

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [submit]);

  const onManual = (e: FormEvent) => {
    e.preventDefault();
    if (manual.trim()) void submit(manual.trim());
    setManual("");
  };

  return (
    <div className="grid gap-5">
      <div className="relative aspect-square max-w-md w-full mx-auto bg-black border border-[#B4904B]/30 overflow-hidden">
        <video ref={videoRef} playsInline muted className="absolute inset-0 w-full h-full object-cover" />
        <canvas ref={canvasRef} className="hidden" />
        <div className="absolute inset-[18%] border-2 border-[#B4904B]/70 pointer-events-none" />
        {cameraError && <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white/70">{cameraError}</p>}
      </div>

      {result && <ResultPanel data={result} />}
      {requestError && <p role="alert" className="text-[#ff9aa6] text-sm">{requestError}</p>}

      <form onSubmit={onManual} className="flex gap-2">
        <input
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder="Código del boleto (respaldo)"
          aria-label="Código del boleto"
          className="flex-1 min-w-0 bg-white/5 border border-white/10 text-white placeholder:text-white/30 text-sm px-4 py-3 focus:outline-none focus:border-[#B4904B]/60"
        />
        <button type="submit" className={goldButton}>Validar</button>
      </form>
    </div>
  );
}

export default function ScanPage() {
  const [phase, setPhase] = useState<"checking" | "login" | "ready">("checking");
  const [events, setEvents] = useState<StaffEvent[]>([]);
  const [eventId, setEventId] = useState("");
  const [pin, setPin] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    try {
      const { events: list } = await fetchStaffEvents();
      setEvents(list);
      setEventId((prev) => prev || closestEvent(list));
      setPhase("ready");
    } catch {
      setPhase("login");
    }
  }, []);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const onLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    try {
      await staffLogin(pin);
      setPin("");
      await loadEvents();
    } catch (err) {
      setLoginError(errorMessage(err));
    }
  };

  const onLogout = async () => {
    await staffLogout().catch(() => undefined);
    setPhase("login");
  };

  const unauthorized = useCallback(() => setPhase("login"), []);

  return (
    <PageShell>
      <h1 className={pageTitle}>Control de acceso</h1>

      {phase === "checking" && <p className={`${bodyText} mt-6`}>Cargando…</p>}

      {phase === "login" && (
        <form onSubmit={onLogin} className="mt-8 grid gap-4 max-w-xs">
          <label htmlFor="pin" className="font-[family-name:var(--font-montserrat)] font-semibold text-[10px] tracking-[0.2em] uppercase text-white/50">
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

      {phase === "ready" && (
        <div className="mt-6 grid gap-6">
          <div className="flex flex-wrap items-end gap-4 justify-between">
            <div className="grid gap-1.5">
              <label htmlFor="scan-event" className="font-[family-name:var(--font-montserrat)] font-semibold text-[10px] tracking-[0.2em] uppercase text-white/50">
                Partido
              </label>
              <select
                id="scan-event"
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                className="bg-[#0d0a11] border border-white/10 text-white px-4 py-3 focus:outline-none focus:border-[#B4904B]/60"
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    vs {ev.rival} · {formatEventDate(ev.startsAt)}
                  </option>
                ))}
              </select>
            </div>
            <button type="button" onClick={onLogout} className="text-sm text-white/50 underline underline-offset-4 hover:text-white">
              Salir
            </button>
          </div>
          {eventId && <Scanner key={eventId} eventId={eventId} onUnauthorized={unauthorized} />}
        </div>
      )}
    </PageShell>
  );
}
