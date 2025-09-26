Bob’s Corn — Backend (Express API)

API minimalista para el reto Bob’s Corn.
Expone un endpoint POST /api/buy que aplica rate-limit de 1 compra por minuto por cliente y devuelve 200 (éxito) o 429 (Too Many Requests) con Retry-After.

Este README documenta solo el backend. El frontend (Vite + React) consume esta API desde /api.

✨ Características

Stack: Node.js + Express (ESM), CORS, morgan.

Rate limit en memoria: 1 compra / minuto / cliente (clave: x-client-id o IP).

Headers estándar: Retry-After en 429 para UX clara en clientes.

Healthcheck: GET /api/health.

Listo para nube: respeta PORT, scripts start/dev, Node 20.x.

Escalado: si vas a correr múltiples instancias, usa Redis (abajo tienes cómo). El rate limit en memoria es solo para 1 instancia.

📁 Estructura
server/
├─ package.json
└─ src/
└─ index.js

⚙️ Requisitos

Node.js >= 18 (recomendado 20.x)

npm / pnpm / yarn (ejemplos con npm)

🚀 Inicio rápido (desarrollo)
cd server
npm install
npm run dev

# Bob's Corn API escuchando en http://localhost:3001

Scripts (package.json)
{
"type": "module",
"scripts": {
"start": "node src/index.js",
"dev": "node --watch src/index.js"
},
"engines": { "node": "20.x" }
}

El proyecto usa ESM ("type":"module"). Si ves warnings en producción, revisa que tu host use Node 18/20+.

🔌 Endpoints
GET /api/health

200: { ok: true, name: "bobs-corn", version: "1.0.0" }

POST /api/buy

Headers de entrada

x-client-id: <uuid|string> (opcional pero recomendado).
Si no llega, se usa req.ip.

200 OK (compra exitosa)
Headers: (ninguno específico)
Body:

{
"ok": true,
"message": "¡Compra exitosa! 🌽",
"boughtAt": 1732659300000
}

429 Too Many Requests (dentro del minuto)

Header: Retry-After: <segundos>

Body:

{
"ok": false,
"message": "429 Too Many Requests: solo 1 compra por minuto por cliente. Intenta luego.",
"retryAfterSeconds": 42,
"nextAllowedAt": 1732659360000
}

Ejemplos curl

# compra

curl -X POST http://localhost:3001/api/buy \
 -H 'Content-Type: application/json' \
 -H 'x-client-id: 8c8c2c1e-1b29-4af4-907e-9a8d1f9a3b2f'

# segunda de inmediato → 429

curl -i -X POST http://localhost:3001/api/buy \
 -H 'Content-Type: application/json' \
 -H 'x-client-id: 8c8c2c1e-1b29-4af4-907e-9a8d1f9a3b2f'

🧠 Implementación del rate limit (en memoria)
// src/index.js (fragmento)
const WINDOW_MS = 60_000; // 1 minuto
const clients = new Map(); // key -> { last: number }

function key(req) {
return req.header("x-client-id") || req.ip;
}

app.post("/api/buy", (req, res) => {
const k = key(req);
const now = Date.now();
const prev = clients.get(k);

if (!prev || now - prev.last >= WINDOW_MS) {
clients.set(k, { last: now });
return res.status(200).json({ ok: true, message: "¡Compra exitosa! 🌽", boughtAt: now });
}

const retryAfterSeconds = Math.ceil((WINDOW_MS - (now - prev.last)) / 1000);
res.set("Retry-After", String(retryAfterSeconds));
return res.status(429).json({
ok: false,
message: "429 Too Many Requests: solo 1 compra por minuto por cliente. Intenta luego.",
retryAfterSeconds,
nextAllowedAt: prev.last + WINDOW_MS
});
});

Limpieza: hay un setInterval que depura claves inactivas para que el Map no crezca indefinidamente.
