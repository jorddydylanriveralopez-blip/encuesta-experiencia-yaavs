const fs = require("fs");
const path = require("path");
const express = require("express");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const publicDir = path.join(__dirname, "public");
const dataDir = path.join(__dirname, "data");
const dataFile = path.join(dataDir, "responses.json");

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
    id: `r_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    receivedAt: now,
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

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/responses", (_req, res) => {
  const list = readResponses().slice().reverse();
  res.json({ ok: true, count: list.length, responses: list });
});

app.post("/api/responses", (req, res) => {
  try {
    const entry = normalizeResponse(req.body || {});
    const list = readResponses();
    list.push(entry);
    writeResponses(list);
    res.status(201).json({ ok: true, id: entry.id });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || "No se pudo guardar" });
  }
});

app.get("/panel", (_req, res) => {
  res.sendFile(path.join(publicDir, "panel.html"));
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
  console.log(`Panel de respuestas: http://0.0.0.0:${PORT}/panel`);
});
