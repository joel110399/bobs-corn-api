import express from "express";
import cors from "cors";
import morgan from "morgan";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

const WINDOW_MS = 60_000;
const clients = new Map();

function getClientKey(req) {
  return req.header("x-client-id") || req.ip;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, rec] of clients.entries()) {
    if (now - rec.last > WINDOW_MS * 3) clients.delete(key);
  }
}, WINDOW_MS).unref();

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, name: "bobs-corn", version: "1.0.0" });
});

app.post("/api/buy", (req, res) => {
  const key = getClientKey(req);
  const now = Date.now();
  const prev = clients.get(key);

  if (!prev || now - prev.last >= WINDOW_MS) {
    clients.set(key, { last: now });
    return res.status(200).json({
      ok: true,
      message: "¡Compra exitosa! 🌽 Gracias por apoyar a Bob.",
      boughtAt: now,
    });
  }

  const retryAfterSeconds = Math.ceil((WINDOW_MS - (now - prev.last)) / 1000);
  res.set("Retry-After", String(retryAfterSeconds));
  return res.status(429).json({
    ok: false,
    message:
      "429 Too Many Requests: solo 1 compra por minuto por cliente. Intenta luego.",
    retryAfterSeconds,
    nextAllowedAt: prev.last + WINDOW_MS,
  });
});

app.listen(PORT, () => {
  console.log(`Bob's Corn API escuchando en http://localhost:${PORT}`);
});
