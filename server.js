const fs = require("fs");
const path = require("path");
const express = require("express");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const publicDir = path.join(__dirname, "public");
const dataDir = path.join(__dirname, "data");
const dataFile = path.join(dataDir, "responses.json");

// Fuente durable: Google Sheet público (sobrevive redeploys de Hostinger).
const DEFAULT_SHEETS_URL =
  "https://docs.google.com/spreadsheets/d/1SH-Zc_67UMjNnp2JVrqyBxbGMoBre9Za_qb3FxpLUBM/gviz/tq?tqx=out:json&sheet=Form%20Responses%201";
const SHEETS_LIVE_URL = String(process.env.SHEETS_LIVE_URL || DEFAULT_SHEETS_URL).trim();

// Punto de partida oficial: solo esta respuesta + las nuevas después del reinicio.
const ANCHOR_CLAVE = String(process.env.ANCHOR_CLAVE || "23CL04682").trim();
const RESET_AFTER = String(process.env.RESET_AFTER || "2026-08-12T17:31:00.000Z").trim();
const RESET_AFTER_MS = (() => {
  const t = Date.parse(RESET_AFTER);
  return Number.isFinite(t) ? t : Date.now();
})();

const TEST_PAYLOAD_RE =
  /LIVE_TEST|USUARIO_VE_TODO|VISIBLE_|HELLO_SHEETS|TEST_ROW|prueba completa visible|respuesta completa de/i;

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
    visitaEjecutivo: body.visitaEjecutivo ?? "",
    recargaMetodo: body.recargaMetodo ?? "",
    recargaUso: body.recargaUso ?? "",
    recargaExp: body.recargaExp ?? "",
    recargaMejora: body.recargaMejora ?? "",
    popUso: body.popUso ?? "",
    popSat: body.popSat ?? "",
    popMejora: body.popMejora ?? "",
    productosYaavs: body.productosYaavs ?? "",
    distribuidores: body.distribuidores ?? "",
    competencia: body.competencia ?? "",
    rentabilidad: body.rentabilidad ?? "",
    antiguedad: body.antiguedad ?? "",
    mejoraGeneral: body.mejoraGeneral ?? "",
    timestamp: body.timestamp || now,
  };
}

function fingerprint(r) {
  return [r.clave, r.nps, r.motivo, r.receivedAt || r.timestamp].join("|").toLowerCase();
}

function isAnchorResponse(r) {
  return String(r.clave || "").trim().toLowerCase() === ANCHOR_CLAVE.toLowerCase();
}

function shouldKeepResponse(r) {
  if (isAnchorResponse(r)) return true;
  const t = Date.parse(r.receivedAt || r.timestamp || 0);
  if (!Number.isFinite(t)) return false;
  // Solo respuestas nuevas después del reinicio (después de la ancla).
  return t >= RESET_AFTER_MS;
}

function mergeResponses(localList, remoteList) {
  const map = new Map();
  [...remoteList, ...localList].forEach((item) => {
    const n = normalizeResponse(item);
    if (!shouldKeepResponse(n)) return;
    const key = n.id.startsWith("sheet_") ? n.id : fingerprint(n);
    if (!map.has(key)) map.set(key, n);
  });
  // Ancla primero; luego las nuevas en orden cronológico (después de ella).
  return Array.from(map.values()).sort((a, b) => {
    const aAnchor = isAnchorResponse(a) ? 0 : 1;
    const bAnchor = isAnchorResponse(b) ? 0 : 1;
    if (aAnchor !== bAnchor) return aAnchor - bAnchor;
    const ta = new Date(a.receivedAt || a.timestamp || 0).getTime();
    const tb = new Date(b.receivedAt || b.timestamp || 0).getTime();
    return ta - tb;
  });
}

function parsePayload(raw) {
  const text = String(raw || "").trim();
  if (!text) return {};

  if (text.charAt(0) === "{") {
    try {
      return JSON.parse(text);
    } catch (_) {}
  }

  const jsonIdx = text.lastIndexOf("JSON:");
  if (jsonIdx >= 0) {
    const maybe = text.slice(jsonIdx + 5).trim();
    try {
      return JSON.parse(maybe);
    } catch (_) {}
  }

  const map = {
    Clave: "clave",
    NPS: "nps",
    Motivo: "motivo",
    Ejecutivo: "ejecutivo",
    "Mesa uso": "mesaUso",
    "Mesa soporte": "mesa_soporte",
    "Mesa espera": "mesa_espera",
    "Mesa resolución": "mesa_resolucion",
    "Mesa amabilidad": "mesa_amabilidad",
    "Mesa conocimiento": "mesa_conocimiento",
    "Mesa trato": "mesa_trato",
    "Mesa mejoras": "mesaMejoras",
    "Visita ejecutivo": "visitaEjecutivo",
    "Método recarga": "recargaMetodo",
    "RecargaKlic uso": "recargaUso",
    "RecargaKlic exp": "recargaExp",
    "RecargaKlic mejora": "recargaMejora",
    "POP uso": "popUso",
    "POP sat": "popSat",
    "POP mejora": "popMejora",
    "Productos YAAVS": "productosYaavs",
    Distribuidores: "distribuidores",
    Competencia: "competencia",
    Ganancias: "rentabilidad",
    Rentabilidad: "rentabilidad",
    Antigüedad: "antiguedad",
    "Mejora general": "mejoraGeneral",
  };
  const out = {};
  text.split(/\n/).forEach((line) => {
    const i = line.indexOf(":");
    if (i < 0) return;
    const key = line.slice(0, i).trim();
    const val = line.slice(i + 1).trim();
    if (map[key]) out[map[key]] = val;
  });
  return out;
}

function gvizDateToIso(value, formatted) {
  if (typeof value === "string") {
    const m = value.match(/^Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?\)$/);
    if (m) {
      const y = Number(m[1]);
      const mo = Number(m[2]) + 1; // gviz month is 0-based
      const d = Number(m[3]);
      const h = Number(m[4] || 0);
      const mi = Number(m[5] || 0);
      const s = Number(m[6] || 0);
      const pad = (n) => String(n).padStart(2, "0");
      // El Sheet guarda hora local MX (UTC-6).
      const local = `${y}-${pad(mo)}-${pad(d)}T${pad(h)}:${pad(mi)}:${pad(s)}-06:00`;
      const parsed = new Date(local);
      if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
    }
  }
  if (formatted) {
    const d = new Date(formatted);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return new Date().toISOString();
}

function isUsefulPayload(raw, parsed) {
  const text = String(raw || "");
  if (TEST_PAYLOAD_RE.test(text)) return false;
  const clave = String(parsed.clave || "").trim();
  if (/^(LIVE_TEST|USUARIO_VE_TODO|VISIBLE_)/i.test(clave)) return false;
  if (parsed.nps !== undefined && parsed.nps !== "" && parsed.nps !== null) return true;
  if (clave) return true;
  if (text.includes("Clave:") || text.charAt(0) === "{") return true;
  return false;
}

function parseGvizResponses(text) {
  const match = String(text).match(/google\.visualization\.Query\.setResponse\((\{[\s\S]*\})\);?\s*$/);
  if (!match) return [];
  const data = JSON.parse(match[1]);
  const rows = (data.table && data.table.rows) || [];
  const responses = [];

  rows.forEach((row, idx) => {
    const cells = row.c || [];
    const tsCell = cells[0] || {};
    const payloadCell = cells[1] || {};
    const raw = String(payloadCell.v || "");
    if (!raw.trim()) return;
    const parsed = parsePayload(raw);
    if (!isUsefulPayload(raw, parsed)) return;
    const iso = gvizDateToIso(tsCell.v, tsCell.f);
    responses.push(
      normalizeResponse({
        id: `sheet_${idx + 2}_${parsed.clave || idx + 2}`,
        receivedAt: iso,
        timestamp: parsed.timestamp || iso,
        ...parsed,
      })
    );
  });

  return responses.reverse();
}

async function fetchSheetsLive() {
  if (!SHEETS_LIVE_URL) return [];
  try {
    const res = await fetch(SHEETS_LIVE_URL, {
      redirect: "follow",
      headers: { Accept: "application/json,text/plain,*/*" },
    });
    if (!res.ok) return [];
    const contentType = String(res.headers.get("content-type") || "");
    const text = await res.text();

    // Apps Script JSON API
    if (contentType.includes("application/json") || text.trim().startsWith("{")) {
      try {
        const data = JSON.parse(text);
        if (Array.isArray(data.responses)) return data.responses.map(normalizeResponse);
      } catch (_) {}
    }

    // Google Sheets gviz JSON
    if (text.includes("google.visualization.Query.setResponse")) {
      return parseGvizResponses(text);
    }

    return [];
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

app.post("/api/responses", async (req, res) => {
  try {
    const entry = normalizeResponse(req.body || {});
    // Nuevas respuestas siempre con timestamp actual (después del reinicio).
    const now = new Date().toISOString();
    entry.receivedAt = now;
    entry.timestamp = now;

    const clave = String(entry.clave || "").trim().toLowerCase();
    const list = readResponses().filter(shouldKeepResponse);
    const remote = await fetchSheetsLive();
    const known = mergeResponses(list, remote);

    // Hasta 2 respuestas por clave YAAVSER (corrección + envío final).
    if (clave) {
      const sameClave = known.filter((r) => String(r.clave || "").trim().toLowerCase() === clave);
      if (sameClave.length >= 2) {
        return res.status(409).json({
          ok: false,
          error: "Esta clave ya envió el máximo de 2 respuestas",
          code: "limit_reached",
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

app.delete("/api/responses", (_req, res) => {
  try {
    writeResponses([]);
    res.json({
      ok: true,
      cleared: true,
      anchor: ANCHOR_CLAVE,
      resetAfter: RESET_AFTER,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || "No se pudo limpiar" });
  }
});

app.get("/resultados", (_req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate");
  res.sendFile(path.join(publicDir, "resultados.html"));
});

app.get("/panel", (_req, res) => {
  res.redirect(302, "/resultados");
});

app.use(
  express.static(publicDir, {
    extensions: ["html"],
    setHeaders(res, filePath) {
      if (/\.(?:js|css|html)$/i.test(filePath)) {
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      }
    },
  })
);

app.get("/", (_req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate");
  res.sendFile(path.join(publicDir, "index.html"));
});

app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ ok: false, error: "No encontrado" });
  }
  res.set("Cache-Control", "no-store, no-cache, must-revalidate");
  res.sendFile(path.join(publicDir, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  ensureStore();
  console.log(`Encuesta YAAVS en http://0.0.0.0:${PORT}`);
  console.log(`Resultados en vivo: http://0.0.0.0:${PORT}/resultados`);
  console.log(`Sheets live: ${SHEETS_LIVE_URL ? "on" : "off"}`);
});
