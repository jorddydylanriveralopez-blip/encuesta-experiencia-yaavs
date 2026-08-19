const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const express = require("express");
const core = require("./lib/nps-core");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const publicDir = path.join(__dirname, "public");
const dataDir = path.join(__dirname, "data");
const dataFile = path.join(dataDir, "responses.json");
const casesFile = path.join(dataDir, "cases.json");

const DEFAULT_SHEETS_URL =
  "https://docs.google.com/spreadsheets/d/1SH-Zc_67UMjNnp2JVrqyBxbGMoBre9Za_qb3FxpLUBM/gviz/tq?tqx=out:json&sheet=Form%20Responses%201";
const SHEETS_LIVE_URL = String(process.env.SHEETS_LIVE_URL || DEFAULT_SHEETS_URL).trim();

const ANCHOR_CLAVE = core.normalizeClave(process.env.ANCHOR_CLAVE || "23CL04682");
const RESET_AFTER = String(process.env.RESET_AFTER || "2026-08-12T17:31:00.000Z").trim();
const RESET_AFTER_MS = (() => {
  const t = Date.parse(RESET_AFTER);
  return Number.isFinite(t) ? t : Date.now();
})();

const DASHBOARD_PASSWORD = String(process.env.DASHBOARD_PASSWORD || "YaavsNps2026");
const AUTH_SECRET = String(process.env.DASHBOARD_SECRET || `yaavs-nps-${DASHBOARD_PASSWORD}`);
const AUTH_COOKIE = "yaavs_nps_dash";
const recentPosts = new Map();

app.disable("x-powered-by");
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: false }));

function ensureStore() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dataFile)) fs.writeFileSync(dataFile, "[]", "utf8");
  if (!fs.existsSync(casesFile)) fs.writeFileSync(casesFile, "{}", "utf8");
}

function readJson(file, fallback) {
  ensureStore();
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    return parsed == null ? fallback : parsed;
  } catch (_) {
    return fallback;
  }
}

function writeJson(file, value) {
  ensureStore();
  fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf8");
}

function readResponses() {
  const list = readJson(dataFile, []);
  return Array.isArray(list) ? list : [];
}

function writeResponses(list) {
  writeJson(dataFile, list);
}

function readCases() {
  const obj = readJson(casesFile, {});
  return obj && typeof obj === "object" ? obj : {};
}

function writeCases(obj) {
  writeJson(casesFile, obj);
}

function authToken() {
  return crypto.createHmac("sha256", AUTH_SECRET).update("dashboard-ok").digest("hex");
}

function parseCookies(req) {
  const header = String(req.headers.cookie || "");
  const out = {};
  header.split(";").forEach((part) => {
    const i = part.indexOf("=");
    if (i < 0) return;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

function isAuthed(req) {
  return parseCookies(req)[AUTH_COOKIE] === authToken();
}

function setAuthCookie(res) {
  res.setHeader(
    "Set-Cookie",
    `${AUTH_COOKIE}=${authToken()}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 7}`
  );
}

function clearAuthCookie(res) {
  res.setHeader("Set-Cookie", `${AUTH_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
}

function requireAuth(req, res, next) {
  if (isAuthed(req)) return next();
  if (req.path.startsWith("/api/")) {
    return res.status(401).json({ ok: false, error: "No autorizado", code: "unauthorized" });
  }
  return res.redirect(302, "/resultados/login");
}

function shownValue(shown, value) {
  if (!shown) return core.NA;
  if (core.isBlank(value)) return core.SIN;
  if (Array.isArray(value) && !value.length) return core.SIN;
  return value;
}

function normalizeResponse(body) {
  const now = new Date().toISOString();
  const clave = core.normalizeClave(body.clave);
  const mesaSi = String(body.mesaUso || "").toLowerCase().startsWith("s");
  const recargaSi = String(body.recargaUso || "").toLowerCase().startsWith("s");
  const popSi = String(body.popUso || "").toLowerCase().startsWith("s");

  return {
    id: body.id || core.newId("r"),
    submissionId: String(body.submissionId || body.id || "").trim(),
    receivedAt: body.receivedAt || body.timestamp || now,
    clave,
    nps: body.nps ?? "",
    motivo: body.motivo ?? "",
    motivoOtro: body.motivoOtro ?? "",
    ejecutivo: body.ejecutivo ?? "",
    visitaEjecutivo: body.visitaEjecutivo ?? "",
    mesaUso: body.mesaUso ?? "",
    mesa_contacto: shownValue(mesaSi, body.mesa_contacto || body.mesa_soporte),
    mesa_tiempo: shownValue(mesaSi, body.mesa_tiempo || body.mesa_espera),
    mesa_primerContacto: shownValue(mesaSi, body.mesa_primerContacto || body.mesa_resolucion),
    mesa_atencion: shownValue(mesaSi, body.mesa_atencion || body.mesa_amabilidad || body.mesa_conocimiento),
    mesa_soporte: body.mesa_soporte ?? "",
    mesa_espera: body.mesa_espera ?? "",
    mesa_resolucion: body.mesa_resolucion ?? "",
    mesa_amabilidad: body.mesa_amabilidad ?? "",
    mesa_conocimiento: body.mesa_conocimiento ?? "",
    mesa_trato: body.mesa_trato ?? "",
    mesaMejoras: shownValue(mesaSi, body.mesaMejoras),
    recargaMetodo: body.recargaMetodo ?? "",
    recargaUso: body.recargaUso ?? "",
    recargaExp: shownValue(recargaSi, body.recargaExp),
    recargaMejora: shownValue(recargaSi, body.recargaMejora),
    popUso: body.popUso ?? "",
    popSat: shownValue(popSi, body.popSat),
    popMejora: shownValue(popSi, body.popMejora),
    productosYaavs: body.productosYaavs ?? "",
    distribuidores: body.distribuidores ?? "",
    competencia: body.competencia ?? "",
    rentabilidad: body.rentabilidad ?? "",
    mejoraGeneral: body.mejoraGeneral ?? "",
    timestamp: body.timestamp || now,
    isTest: Boolean(body.isTest) || core.isTestRecord({ ...body, clave }),
  };
}

function isAnchorResponse(r) {
  return core.normalizeClave(r.clave) === ANCHOR_CLAVE;
}

function shouldKeepResponse(r) {
  if (core.isTestRecord(r) || /PRUEBA-CODEX-20260819/i.test(JSON.stringify(r))) return false;
  if (isAnchorResponse(r)) return true;
  const t = Date.parse(r.receivedAt || r.timestamp || 0);
  if (!Number.isFinite(t)) return false;
  return t >= RESET_AFTER_MS;
}

function mergeResponses(localList, remoteList) {
  const map = new Map();
  [...remoteList, ...localList].forEach((item) => {
    const n = normalizeResponse(item);
    if (!shouldKeepResponse(n)) return;
    const key = n.submissionId
      ? `sub:${n.submissionId}`
      : n.id.startsWith("sheet_")
        ? n.id
        : core.fingerprint(n);
    if (!map.has(key)) map.set(key, n);
  });
  return core.dedupeResponses(Array.from(map.values())).sort((a, b) => {
    const aAnchor = isAnchorResponse(a) ? 0 : 1;
    const bAnchor = isAnchorResponse(b) ? 0 : 1;
    if (aAnchor !== bAnchor) return aAnchor - bAnchor;
    return (
      new Date(a.receivedAt || a.timestamp || 0).getTime() -
      new Date(b.receivedAt || b.timestamp || 0).getTime()
    );
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
    try {
      return JSON.parse(text.slice(jsonIdx + 5).trim());
    } catch (_) {}
  }
  const map = {
    Clave: "clave",
    NPS: "nps",
    Motivo: "motivo",
    "Motivo otro": "motivoOtro",
    Ejecutivo: "ejecutivo",
    "Mesa uso": "mesaUso",
    "Mesa contacto": "mesa_contacto",
    "Mesa tiempo": "mesa_tiempo",
    "Mesa primer contacto": "mesa_primerContacto",
    "Mesa atención": "mesa_atencion",
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
    "Mejora general": "mejoraGeneral",
    "Submission ID": "submissionId",
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
      const mo = Number(m[2]) + 1;
      const d = Number(m[3]);
      const h = Number(m[4] || 0);
      const mi = Number(m[5] || 0);
      const s = Number(m[6] || 0);
      const pad = (n) => String(n).padStart(2, "0");
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
  if (core.TEST_RE.test(text) || /PRUEBA-CODEX-20260819/i.test(text)) return false;
  const clave = core.normalizeClave(parsed.clave);
  if (core.TEST_RE.test(clave)) return false;
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
    if (contentType.includes("application/json") || text.trim().startsWith("{")) {
      try {
        const data = JSON.parse(text);
        if (Array.isArray(data.responses)) return data.responses.map(normalizeResponse);
      } catch (_) {}
    }
    if (text.includes("google.visualization.Query.setResponse")) {
      return parseGvizResponses(text);
    }
    return [];
  } catch (_) {
    return [];
  }
}

async function loadCatalog() {
  const local = readResponses();
  const remote = await fetchSheetsLive();
  const merged = mergeResponses(local, remote);
  const excludedTests = [...local, ...remote].filter((r) => core.isTestRecord(r) || /PRUEBA-CODEX-20260819/i.test(JSON.stringify(r))).length;
  const beforeDedupe = [...remote, ...local].filter(shouldKeepResponse).length;
  return {
    list: merged,
    excluded: Math.max(0, excludedTests + Math.max(0, beforeDedupe - merged.length)),
    source: remote.length ? "sheets+local" : "local",
  };
}

function noCache(res) {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate");
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, sheetsLive: Boolean(SHEETS_LIVE_URL) });
});

app.get("/api/auth/status", (req, res) => {
  res.json({ ok: true, authed: isAuthed(req) });
});

app.post("/api/auth/login", (req, res) => {
  const password = String((req.body && req.body.password) || "");
  const expected = Buffer.from(DASHBOARD_PASSWORD);
  const got = Buffer.from(password);
  if (expected.length !== got.length || !crypto.timingSafeEqual(expected, got)) {
    return res.status(401).json({ ok: false, error: "Contraseña incorrecta" });
  }
  setAuthCookie(res);
  res.json({ ok: true });
});

app.post("/api/auth/logout", (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

app.get("/api/clave-status", async (req, res) => {
  const clave = core.normalizeClave(req.query.clave);
  if (!core.isValidClave(clave)) {
    return res.json({ ok: true, valid: false, recent: false });
  }
  const { list } = await loadCatalog();
  const recent = list
    .filter((r) => core.normalizeClave(r.clave) === clave)
    .sort((a, b) => Date.parse(b.receivedAt || b.timestamp || 0) - Date.parse(a.receivedAt || a.timestamp || 0))[0];
  const recentMs = recent ? Date.parse(recent.receivedAt || recent.timestamp || 0) : 0;
  const isRecent = Number.isFinite(recentMs) && Date.now() - recentMs < 1000 * 60 * 60 * 24 * 14;
  res.json({
    ok: true,
    valid: true,
    recent: Boolean(recent),
    recentWarning: isRecent,
    lastAt: recent ? recent.receivedAt || recent.timestamp : null,
  });
});

app.get("/api/responses", requireAuth, async (_req, res) => {
  const { list, excluded, source } = await loadCatalog();
  const cases = readCases();
  res.json({
    ok: true,
    count: list.length,
    excluded,
    source,
    cases,
    responses: list,
  });
});

app.patch("/api/cases/:id", requireAuth, (req, res) => {
  const id = String(req.params.id || "");
  if (!id) return res.status(400).json({ ok: false, error: "Falta id" });
  const cases = readCases();
  const prev = cases[id] || {};
  const body = req.body || {};
  cases[id] = {
    responsable: String(body.responsable ?? prev.responsable ?? "").trim(),
    status: String(body.status ?? prev.status ?? "pendiente").trim() || "pendiente",
    followUpDate: String(body.followUpDate ?? prev.followUpDate ?? "").trim(),
    action: String(body.action ?? prev.action ?? "").trim(),
    commitmentDate: String(body.commitmentDate ?? prev.commitmentDate ?? "").trim(),
  };
  writeCases(cases);
  res.json({ ok: true, case: cases[id] });
});

app.post("/api/responses", async (req, res) => {
  try {
    const body = req.body || {};
    if (String(body.website || "").trim()) {
      return res.status(201).json({ ok: true, ignored: true });
    }
    const submissionId = String(body.submissionId || "").trim() || core.newId("sub");
    if (recentPosts.has(submissionId)) {
      return res.status(200).json({ ok: true, id: recentPosts.get(submissionId), duplicate: true });
    }
    const entry = normalizeResponse({ ...body, submissionId, id: body.id || core.newId("r") });
    if (!core.isValidClave(entry.clave)) {
      return res.status(400).json({ ok: false, error: "Clave YAAVSER inválida" });
    }
    if (entry.isTest || /PRUEBA-CODEX-20260819/i.test(JSON.stringify(entry))) {
      return res.status(201).json({ ok: true, id: entry.id, ignored: "test" });
    }
    const now = new Date().toISOString();
    entry.receivedAt = now;
    entry.timestamp = now;

    const list = readResponses().filter(shouldKeepResponse);
    const already = list.find((r) => r.submissionId && r.submissionId === submissionId);
    if (already) {
      return res.status(200).json({ ok: true, id: already.id, duplicate: true });
    }
    const sameBurst = list.find((r) => {
      if (core.normalizeClave(r.clave) !== entry.clave) return false;
      const dt = Math.abs(Date.parse(r.receivedAt || r.timestamp || 0) - Date.now());
      return dt < 15000 && core.fingerprint(r) === core.fingerprint(entry);
    });
    if (sameBurst) {
      recentPosts.set(submissionId, sameBurst.id);
      return res.status(200).json({ ok: true, id: sameBurst.id, duplicate: true });
    }

    list.push(entry);
    writeResponses(list);
    recentPosts.set(submissionId, entry.id);
    setTimeout(() => recentPosts.delete(submissionId), 120000);
    res.status(201).json({ ok: true, id: entry.id, submissionId });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || "No se pudo guardar" });
  }
});

app.get("/resultados/login", (_req, res) => {
  noCache(res);
  res.sendFile(path.join(publicDir, "login.html"));
});

app.get(["/resultados", "/resultados.html"], requireAuth, (_req, res) => {
  noCache(res);
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
  noCache(res);
  res.sendFile(path.join(publicDir, "index.html"));
});

app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ ok: false, error: "No encontrado" });
  }
  noCache(res);
  res.sendFile(path.join(publicDir, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  ensureStore();
  const cleaned = readResponses().filter(
    (r) => shouldKeepResponse(r) && !/PRUEBA-CODEX-20260819/i.test(JSON.stringify(r))
  );
  writeResponses(core.dedupeResponses(cleaned));
  console.log(`Encuesta YAAVS en http://0.0.0.0:${PORT}`);
  console.log(`Resultados en vivo: http://0.0.0.0:${PORT}/resultados`);
  console.log(`Sheets live: ${SHEETS_LIVE_URL ? "on" : "off"}`);
});
