const fs = require("fs");
const path = require("path");
const express = require("express");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const publicDir = path.join(__dirname, "public");
const dataDir = path.join(__dirname, "data");
const dataFile = path.join(dataDir, "responses.json");
const SHEETS_LIVE_URL = String(process.env.SHEETS_LIVE_URL || "").trim();

app.disable("x-powered-by");
app.use(express.json({ limit: "2mb" }));

function ensureStore() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, "[]", "utf8");
  }
}

function readResponses() {
  ensureStore();
  try {
    const raw = fs.readFileSync(dataFile, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function writeResponses(list) {
  ensureStore();
  fs.writeFileSync(dataFile, JSON.stringify(list, null, 2), "utf8");
}

function normalizeResponse(body) {
  const now = new Date().toISOString();
  return {
    id: body.id || `r_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    receivedAt: body.receivedAt || body.timestamp || now,
    clave: body.clave ?? "",
    nps: body.nps ?? "",
    motivo: body.motivo ?? "",
    ejecutivo: body.ejecutivo ?? "",
    mesaUso: body.mesaUso ?? "",
    mesa_soporte: body.mesa_soporte ?? "",
    mesa_espera: body.mesa_espera ?? "",
    mesa_resolucion: body.mesa_resolucion ?? "",
    mesa_amabilidad: body.mesa_amabilidad ?? "",
    mesa_conocimiento: body.mesa_conocimiento ?? "",
    mesa_trato: body.mesa_trato ?? "",
    mesaMejoras: body.mesaMejoras ?? "",
    recargaUso: body.recargaUso ?? "",
    recargaExp: body.recargaExp ?? "",
    recargaMejora: body.recargaMejora ?? "",
    popUso: body.popUso ?? "",
    popSat: body.popSat ?? "",
    popMejora: body.popMejora ?? "",
    rentabilidad: body.rentabilidad ?? "",
    antiguedad: body.antiguedad ?? "",
    mejoraGeneral: body.mejoraGeneral ?? "",
    timestamp: body.timestamp || now,
  };
}

function fingerprint(r) {
  return [r.clave, r.nps, r.motivo, r.receivedAt || r.timestamp].join("|").toLowerCase();
}

function mergeResponses(localList, remoteList) {
  const map = new Map();
  [...remoteList, ...localList].forEach((item) => {
    const n = normalizeResponse(item);
    const key = n.id.startsWith("sheet_") ? n.id : fingerprint(n);
    if (!map.has(key)) map.set(key, n);
  });
  return Array.from(map.values()).sort((a, b) => {
    const ta = new Date(a.receivedAt || a.timestamp || 0).getTime();
    const tb = new Date(b.receivedAt || b.timestamp || 0).getTime();
    return tb - ta;
  });
}

async function fetchSheetsLive() {
  if (!SHEETS_LIVE_URL) return [];
  try {
    const res = await fetch(SHEETS_LIVE_URL, { redirect: "follow" });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.responses) ? data.responses : [];
  } catch (_) {
    return [];
  }
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, sheetsLive: Boolean(SHEETS_LIVE_URL) });
});

app.get("/api/responses", async (_req, res) => {
  const local = readResponses();
  const remote = await fetchSheetsLive();
  const list = mergeResponses(local, remote);
  res.json({
    ok: true,
    count: list.length,
    source: remote.length ? "sheets+local" : "local",
    responses: list,
  });
});

app.post("/api/responses", (req, res) => {
  try {
    const entry = normalizeResponse(req.body || {});
    const clave = String(entry.clave || "").trim().toLowerCase();
    const list = readResponses();

    // Una respuesta por clave YAAVSER (evita reenvíos / "Nueva respuesta").
    if (clave) {
      const exists = list.some((r) => String(r.clave || "").trim().toLowerCase() === clave);
      if (exists) {
        return res.status(409).json({
          ok: false,
          error: "Esta clave ya envió la encuesta",
          code: "already_submitted",
        });
      }
    }

    list.push(entry);
    writeResponses(list);
    res.status(201).json({ ok: true, id: entry.id });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || "No se pudo guardar" });
  }
});

app.get("/resultados", (_req, res) => {
  res.sendFile(path.join(publicDir, "resultados.html"));
});

app.get("/panel", (_req, res) => {
  res.redirect(302, "/resultados");
});

app.use(express.static(publicDir, { extensions: ["html"] }));

app.get("/", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ ok: false, error: "No encontrado" });
  }
  res.sendFile(path.join(publicDir, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  ensureStore();
  console.log(`Encuesta YAAVS en http://0.0.0.0:${PORT}`);
  console.log(`Resultados en vivo: http://0.0.0.0:${PORT}/resultados`);
});
