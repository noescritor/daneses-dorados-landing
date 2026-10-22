# Daneses Dorados Morelos — sitio y venta de boletos

Sitio web (Vite + React) y servicio de venta de boletos con **Mercado Pago Checkout Pro**. Un solo servicio Node sirve la web y la API (`/api/*`) y guarda todo en SQLite.

## Cómo funciona la venta

1. El navegador solo manda **IDs y cantidad** (`tierId`, `eventId`, `quantity`) más nombre y correo. El **precio y el total los calcula el servidor** desde su catálogo.
2. El servidor **aparta los lugares 15 minutos** (de forma atómica, sin sobreventa), crea la preferencia de Mercado Pago con la misma expiración y devuelve el link de pago.
3. El comprador paga en Mercado Pago. La página `/pedido/:id` solo **consulta** el estado; nunca lo marca como pagado.
4. Mercado Pago llama al **webhook**. El servidor valida la firma `x-signature`, **consulta el pago por ID** a la API de Mercado Pago, verifica que sea `approved`, que el monto y la moneda coincidan con la orden, y entonces emite los boletos. La página del pedido los muestra con un aviso y un botón **"Descargar boletos"** (una sola imagen PNG con todos los QR). El correo es opcional.
5. Cada boleto tiene un **código QR único**. El staff lo escanea en `/scan`; el primer escaneo lo marca como usado y los siguientes se rechazan.

| Requisito | Dónde / cómo |
|---|---|
| Precio y cantidad en el servidor | `server/src/orders.ts` (`createOrder`), catálogo en base de datos |
| Access Token solo en el servidor | `MP_ACCESS_TOKEN` en variables de entorno; el frontend nunca lo recibe |
| Firma `x-signature` + consulta del pago | `server/src/signature.ts`, `server/src/payments.ts` |
| Sin cobros dobles / una sola vez por notificación | llave de idempotencia por orden, tabla `webhook_events`, `mp_payment_id` único, y reembolso automático de un segundo pago sobre una orden ya pagada |
| Reserva de 15 min | `inventory.reserved` + expiración de la preferencia + limpieza cada 30 s |
| QR único de un solo uso | `tickets.code` (128 bits aleatorios) + tabla `scans` (`PRIMARY KEY (ticket, partido)`) |

## Productos

| Producto | Precio | Notas |
|---|---|---|
| General | $150 MXN | Por partido en casa |
| VIP | $500 MXN | Por partido en casa |
| Pase de Temporada General | $500 MXN | Todos los partidos en casa restantes + semifinales en casa |
| Pase de Temporada VIP | $1,667 MXN | Mismo descuento proporcional que el pase General (500 / 150), redondeado |

El pase aparta un lugar **en cada partido en casa** y se escanea una vez por partido. Los precios y capacidades se cambian con `pnpm admin` (ver abajo). Los precios del `seed` solo aplican la primera vez que se crea la base.

## Requisitos

- Node **22.13 o superior** (usa `node:sqlite`, incluido en Node).
- pnpm 10 o superior (`corepack enable`).

## Desarrollo local

```bash
pnpm install
cp .env.example .env        # y llena los valores (ver abajo)
pnpm server:dev             # API en http://localhost:3001
pnpm dev                    # web en http://localhost:8443 (hace proxy de /api)
```

Genera un secreto de sesión:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Sin `MP_ACCESS_TOKEN` el sitio carga, pero el checkout responde 503 ("pagos no disponibles"). El envío por correo es opcional (`RESEND_API_KEY`). Sin él, en desarrollo los links de los boletos se imprimen en la consola; en producción **no se escriben en los registros** (funcionan como contraseña) y el comprador los descarga desde la página del pedido.

## Probar en el sandbox de Mercado Pago

> Usa **solo credenciales de prueba**. Nunca pegues tokens en chats, issues ni commits (`.env` ya está en `.gitignore`).

1. **Crea la aplicación** en [Tus integraciones](https://www.mercadopago.com.mx/developers/panel/app) con el producto **Checkout Pro**.
2. **Cuentas de prueba:** en tu aplicación, sección *Cuentas de prueba*, crea **dos**: un **vendedor** y un **comprador** (no puede ser la misma). Ambas del mismo país (México).
3. **Credenciales de prueba:** *Credenciales de prueba* de la aplicación → copia el **Access Token** a `MP_ACCESS_TOKEN` en `.env`.
4. **Webhook (necesita una URL pública https).** Para recibir notificaciones reales en tu máquina usa un túnel y sirve la web ya compilada:

   ```bash
   pnpm build
   PORT=3001 pnpm start                      # sirve web + API en :3001
   cloudflared tunnel --url http://localhost:3001   # o: ngrok http 3001
   ```

   Pon la URL https del túnel en `PUBLIC_BASE_URL` (en `.env`) y reinicia. Luego en el panel: aplicación → **Webhooks → Configurar notificaciones**:
   - URL: `https://TU-TUNEL/api/webhooks/mercadopago`
   - Evento: **Pagos**
   - Copia la **clave secreta** a `MP_WEBHOOK_SECRET` y reinicia.

   (Con `PUBLIC_BASE_URL` https, cada preferencia también lleva `notification_url=…?source_news=webhooks` y `auto_return`.)
5. **Compra de prueba:** abre el sitio en una **ventana de incógnito**, elige un boleto, paga con el **usuario comprador de prueba** y una tarjeta de prueba. El nombre del titular define el resultado: `APRO` aprobado, `OTHE` rechazo general, `CONT` pendiente, `FUND` fondos insuficientes. Tarjetas de México de la documentación: Visa `4075 5957 1648 3764`, Mastercard `5474 9254 3267 0366` (CVV `123`, vence `11/30`). Verifica la lista vigente en la [documentación de tarjetas de prueba](https://www.mercadopago.com.mx/developers/es/docs/checkout-api/integration-test/test-cards).
6. **Comprueba el resultado:** `/pedido/:id` pasa a "Pago confirmado", muestra la alerta **"Descarga tu boleto ahora"** con el botón de descarga, y cada boleto abre en `/t/:codigo`.
7. **Escáner:** entra a `/scan` con `STAFF_PIN`, elige el partido y escanea (o pega el código). Un segundo escaneo del mismo boleto debe mostrar "Boleto ya usado".

El botón **Simular** del panel de webhooks también sirve, pero necesita el ID de un pago que ya exista.

### Pruebas automáticas (sin Mercado Pago)

```bash
pnpm test        # 44 pruebas: firma, idempotencia, sobreventa, expiración, reembolsos, QR de un solo uso
pnpm typecheck
```

Las pruebas usan una base en memoria y un cliente de Mercado Pago simulado, así que no necesitan credenciales.

## Administración

```bash
pnpm admin list
pnpm admin set-price pass_vip 1700            # solo afecta compras nuevas
pnpm admin set-capacity 2026-10-24-dragones general 400
pnpm admin add-event 2026-12-12-semifinal "Por definir" 2026-12-12T19:00:00-06:00 semifinal
pnpm admin close-sales 2026-10-24-dragones
```

`add-event` crea el partido ya con los lugares de los **pases vendidos** ocupados, para que las semifinales no se sobrevendan.

## Producción (EasyPanel)

El `Dockerfile` construye la web y arranca el servidor Node en el puerto **3000**.

1. **Puerto:** en EasyPanel configura el puerto del servicio en **3000** (antes era 80 con nginx).
2. **Volumen persistente:** monta un volumen en **`/data`**. Ahí vive la base SQLite; **sin volumen se pierden las ventas en cada redeploy**.
3. **Variables de entorno** (el servidor se niega a arrancar en producción si falta alguna): `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `STAFF_PIN`, `SESSION_SECRET`, `PUBLIC_BASE_URL` (https, el dominio final). Recomendadas: `CAPACITY_GENERAL`, `CAPACITY_VIP`. Opcionales: `RESEND_API_KEY` y `MAIL_FROM` (correo de boletos).
4. **Dominio con HTTPS** y, en el panel de Mercado Pago, el webhook de **producción** apuntando a `https://TU-DOMINIO/api/webhooks/mercadopago` con su propia clave secreta.
5. **Una sola instancia:** SQLite no es para varias réplicas. Para escalar, hay que mover `server/src/db.ts` a Postgres.
6. **Respaldos:** copia periódicamente `/data/daneses.db` (por ejemplo con `sqlite3 daneses.db ".backup respaldo.db"`).

## Antes de vender de verdad

- **Capacidades reales** por zona (hoy 300 General / 100 VIP por partido son valores de arranque).
- **Aviso de privacidad y condiciones de compra/reembolso** publicados: el formulario ya pide aceptarlos pero no enlaza a ninguna página.
- **Pagos offline (OXXO, SPEI, cajeros) están excluidos** a propósito: no caben en una reserva de 15 minutos.
- El calendario visual (`CalendarSection`) y los partidos del servidor (`server/src/seed.ts`) son listas separadas; si cambia una fecha, cámbiala en ambas (y con `pnpm admin` en una base ya creada).
- Probar la lectura del QR con la **cámara** en un teléfono real (en desarrollo solo se validó el flujo con código manual).

## Referencias

- [Pruebas con Checkout Pro](https://www.mercadopago.com.mx/developers/es/docs/checkout-pro/integration-test/test-purchases)
- [Notificaciones y validación de firma](https://www.mercadopago.com.mx/developers/en/docs/checkout-pro-preferences/additional-settings/optional-notifications)
- [Crear una preferencia](https://www.mercadopago.com.mx/developers/en/docs/checkout-pro-preferences/create-payment-preference)
